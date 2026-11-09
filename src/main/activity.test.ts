import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { summarise } from '../../resources/summarise.mjs'
import type { WorkspaceView } from '../preload/api'
import { hooksSettings } from './agent'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'

let sock: string
let home: string

beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
  vi.resetModules()
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const hookCommand = (event: string): string => hooksSettings().hooks[event]?.[0]?.hooks[0]?.command ?? ''

type Fire = [event: string, payload: object]
/** Runs the real hook command for each event, with the payload on stdin like Claude does. */
function fire(events: Fire[], opts: { wait?: number; gate?: string } = {}): string[] {
  const dir = tmp()
  const steps = events.map(([event, payload], i) => {
    const file = join(dir, `payload-${i}.json`)
    writeFileSync(file, JSON.stringify(payload))
    return `${hookCommand(event)} <'${file}'`
  })
  return ['sh', '-c', `${opts.wait ? `sleep ${opts.wait}; ` : ''}${opts.gate ? `while [ ! -f '${opts.gate}' ]; do sleep 0.1; done; ` : ''}${steps.join('; ')}; sleep 300`]
}

async function open(argv: string[], branch = 'feat/x'): Promise<WorkspaceView> {
  makeRegisteredRepo(home)
  const { openWorktree } = await import('./workspaces')
  const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv })
  if (!('workspace' in r)) throw new Error(r.error)
  return r.workspace
}

async function until<T>(read: () => T, done: (v: T) => boolean, ms = 5000): Promise<T> {
  const end = Date.now() + ms
  let v = read()
  while (!done(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 100))
    v = read()
  }
  return v
}

const lines = (session: string): { at: number; kind: string; text: string }[] => {
  try {
    return readFileSync(join(home, 'activity', `${session}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  } catch {
    return []
  }
}
const stateFile = (session: string): { state: string; at: number; text?: string } | undefined => {
  try {
    return JSON.parse(readFileSync(join(home, 'state', `${session}.json`), 'utf8'))
  } catch {
    return undefined
  }
}

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]))

const NO_TAIL = (): string => ''

describe('activity', () => {
  it('hook appends a short summary, never the payload', async () => {
    const secret = 'SECRET-TOKEN-9f8e7d6c'
    const tail = 'TAIL-OF-THE-PROMPT-MARKER'
    const ws = await open(
      fire([
        ['UserPromptSubmit', { prompt: `${'refactoriza esto '.repeat(30)}${tail}` }],
        ['PreToolUse', { tool_name: 'Write', tool_input: { file_path: '/repo/config/app.php', content: `<?php $key = '${secret}';` } }],
        ['PreToolUse', { tool_name: 'Bash', tool_input: { command: `${'x'.repeat(70)} ${secret}` } }]
      ])
    )

    const got = await until(() => lines(ws.session), (l) => l.length === 3)

    expect(got).toHaveLength(3)
    for (const l of got) {
      expect(l.text.length).toBeLessThanOrEqual(200)
    }
    expect(got[1]?.text).toBe('Escribiendo app.php')
    for (const f of files(home)) {
      const body = readFileSync(f, 'utf8')
      expect(body, f).not.toContain(secret)
      expect(body, f).not.toContain(tail)
    }
  })

  it('summarises each tool', () => {
    const pre = (tool_name: string, tool_input: object): string | undefined =>
      summarise('PreToolUse', { tool_name, tool_input: { ...tool_input, content: 'SECRET' } }, NO_TAIL)?.text
    expect(pre('Read', { file_path: '/a/src/Repository.php' })).toBe('Leyendo Repository.php')
    expect(pre('Edit', { file_path: '/a/src/ListOrders.php', old_string: 'SECRET' })).toBe('Editando ListOrders.php')
    expect(pre('Write', { file_path: '/a/src/New.php' })).toBe('Escribiendo New.php')
    expect(pre('Bash', { command: 'vendor/bin/phpunit --filter Orders' })).toBe('Ejecutando vendor/bin/phpunit --filter Orders')
    expect(pre('Bash', { command: 'a'.repeat(100) })).toBe(`Ejecutando ${'a'.repeat(60)}`)
    expect(pre('Grep', { pattern: 'OrderRepository' })).toBe('Buscando OrderRepository')
    expect(pre('Glob', { pattern: '**/*.php' })).toBe('Buscando **/*.php')
    expect(pre('Task', { description: 'T5 paginación', prompt: 'SECRET' })).toBe('Lanzando un subagente: T5 paginación')
    // A description can carry prompt-like text: the same 80-character cap as the person's prompt.
    expect(pre('Task', { description: 'x'.repeat(300) })?.length ?? Infinity).toBeLessThanOrEqual('Lanzando un subagente: '.length + 80)
    expect(pre('WebFetch', { url: 'https://x.test' })).toBe('WebFetch')
    expect(summarise('PreToolUse', { tool_name: 'Read', tool_input: { file_path: '/a/b.php' } }, NO_TAIL)?.kind).toBe('read')
  })

  it('failed command is marked', () => {
    const post = (tool_response: object | string): ReturnType<typeof summarise> =>
      summarise('PostToolUse', { tool_name: 'Bash', tool_input: { command: 'vendor/bin/phpunit' }, tool_response }, NO_TAIL)
    const fail = { kind: 'fail', text: '✗ vendor/bin/phpunit falló' }

    expect(post({ exit_code: 1 })).toEqual(fail)
    expect(post({ error: 'command not found' })).toEqual(fail)
    expect(post({ stdout: '', interrupted: true })).toEqual(fail)
    expect(post({ stdout: 'ok', stderr: '', interrupted: false })).toBeNull()
    expect(post({ exit_code: 0 })).toBeNull()
    expect(summarise('PostToolUse', { tool_name: 'Read', tool_response: { error: 'x' } }, NO_TAIL)).toBeNull()
    expect(
      summarise('PostToolUse', { tool_name: 'Bash', tool_input: { command: 'b'.repeat(90) }, tool_response: { exit_code: 2 } }, NO_TAIL)?.text
    ).toBe(`✗ ${'b'.repeat(60)} falló`)
  })

  it("notification carries the agent's message", async () => {
    const { createStatus } = await import('./status')
    const message = 'Claude necesita permiso para ejecutar phpunit'
    const ws = await open(fire([['Notification', { message }]], { wait: 2 }), 'feat/n')
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()

    const file = await until(() => stateFile(ws.session), (f) => f !== undefined)
    await status.refresh()

    expect(file?.state).toBe('needs-you')
    expect(file?.text).toBe(`Te pregunta: ${message}`)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0]?.[1]).toBe(`Te pregunta: ${message}`)
    expect(lines(ws.session)[0]).toMatchObject({ kind: 'asks', text: `Te pregunta: ${message}` })
  })

  it('stop quotes the last thing claude said', async () => {
    const entry = (role: string, content: unknown): string => JSON.stringify({ type: role, message: { role, content } })
    const transcript = [
      entry('user', 'haz X'),
      entry('assistant', [{ type: 'text', text: 'Primero miro el código.' }]),
      entry('assistant', [{ type: 'text', text: 'Tests en verde, todo listo.' }, { type: 'tool_use', name: 'Bash', input: { command: 'SECRET' } }]),
      entry('assistant', [{ type: 'tool_use', name: 'Bash', input: {} }])
    ].join('\n')

    expect(summarise('Stop', { transcript_path: '/t.jsonl' }, () => transcript)).toEqual({
      kind: 'says',
      text: 'Claude dice: Tests en verde, todo listo.'
    })
    expect(summarise('Stop', { transcript_path: '/t.jsonl' }, () => '')?.text).toBe('Claude ha terminado')
    expect(summarise('Stop', {}, NO_TAIL)?.text).toBe('Claude ha terminado')
    expect(
      summarise('Stop', { transcript_path: '/t' }, () => entry('assistant', [{ type: 'text', text: 'z'.repeat(500) }]))?.text.length
    ).toBeLessThanOrEqual(200)

    // The real hook reads only the tail of a big transcript, whose first line is cut mid-entry.
    const path = join(tmp(), 'transcript.jsonl')
    writeFileSync(path, [entry('assistant', [{ type: 'text', text: 'OLD-SECRET-MARKER' }]), 'x'.repeat(200_000), transcript].join('\n'))
    const ws = await open(fire([['Stop', { transcript_path: path }]]), 'feat/s')
    const got = await until(() => lines(ws.session), (l) => l.length === 1)
    expect(got[0]?.text).toBe('Claude dice: Tests en verde, todo listo.')
    expect(stateFile(ws.session)).toMatchObject({ state: 'needs-you', text: 'Claude dice: Tests en verde, todo listo.' })
  })

  it('activity file stays bounded', async () => {
    const gate = join(tmp(), 'go')
    const ws = await open(fire([['PreToolUse', { tool_name: 'Read', tool_input: { file_path: '/a/last.php' } }]], { gate }), 'feat/b')
    mkdirSync(join(home, 'activity'), { recursive: true })
    const seeded = Array.from({ length: 250 }, (_, i) => JSON.stringify({ at: i, kind: 'read', text: `Leyendo f${i}.php` }))
    writeFileSync(join(home, 'activity', `${ws.session}.jsonl`), seeded.join('\n') + '\n')
    writeFileSync(gate, '')
    await until(() => lines(ws.session).at(-1)?.text, (t) => t === 'Leyendo last.php')

    const got = lines(ws.session)
    expect(got).toHaveLength(200)
    expect(got[0]?.text).toBe('Leyendo f51.php')
    expect(got[199]?.text).toBe('Leyendo last.php')
  })

  it('prompt line is short and tool events mean working', async () => {
    const prompt = summarise('UserPromptSubmit', { prompt: `  ${'palabra '.repeat(40)}` }, NO_TAIL)
    expect(prompt?.kind).toBe('prompt')
    expect(prompt?.text.startsWith('Le has escrito: palabra palabra')).toBe(true)
    expect(prompt?.text.length).toBe('Le has escrito: '.length + 80)

    const pre = await open(
      fire([['Notification', { message: 'permiso' }], ['PreToolUse', { tool_name: 'Read', tool_input: { file_path: '/a/b.php' } }]]),
      'feat/pre'
    )
    const post = await open(
      fire([['Notification', { message: 'permiso' }], ['PostToolUse', { tool_name: 'Read', tool_response: {} }]]),
      'feat/post'
    )

    for (const ws of [pre, post]) {
      await until(() => stateFile(ws.session)?.state, (s) => s === 'working')
      expect(stateFile(ws.session)?.state, ws.branch).toBe('working')
      expect(stateFile(ws.session)?.text).toBeUndefined()
    }
    expect(existsSync(join(home, 'state'))).toBe(true)
  })
})
