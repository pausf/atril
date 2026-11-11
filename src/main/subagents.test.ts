import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubagentEntry } from '../preload/api'
import { run } from './run'
import { parseSubagentLog } from './subagent-log'
import { createSubagents } from './subagents'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { openWorktree, removeWorkspace } from './workspaces'

let sock: string
let home: string
beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const write = (session: string, body: object): void => {
  mkdirSync(join(home, 'subagents'), { recursive: true })
  writeFileSync(join(home, 'subagents', `${session}.json`), JSON.stringify(body))
}
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
async function until(done: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms
  while (!done() && Date.now() < end) await wait(50)
}

describe('subagents', () => {
  const running: SubagentEntry = { id: 'a1', type: 'explorer', description: 'T5 paginación', startedAt: 10 }

  it('the subagent list reaches the window', async () => {
    writeFileSync(
      join(home, 'workspaces.json'),
      JSON.stringify({ workspaces: ['aaaaaaa1', 'aaaaaaa2'].map((id) => ({ id, branch: `b-${id}`, session: `atril-${id}`, path: '/x' })) })
    )
    write('atril-aaaaaaa1', { entries: [running], pending: [{ type: 'explorer', description: 'pendiente', at: 1 }] })
    const emit = vi.fn()
    const sub = createSubagents({ emit })
    await sub.start()

    // The entries only: never the pending queue; nothing without a file or for an unknown workspace.
    expect(await sub.get('aaaaaaa1')).toEqual([running])
    expect(await sub.get('aaaaaaa2')).toEqual([])
    expect(await sub.get('nope')).toEqual([])
    expect(emit).toHaveBeenCalledWith('aaaaaaa1', [running])
    expect(emit.mock.calls.map((c) => c[0])).not.toContain('aaaaaaa2')

    // An endedAt flip keeps the same ids and count: it is still a change.
    emit.mockClear()
    const ended = { ...running, endedAt: 55 }
    write('atril-aaaaaaa1', { entries: [ended], pending: [] })
    await until(() => emit.mock.calls.length > 0)
    expect(emit).toHaveBeenLastCalledWith('aaaaaaa1', [ended])

    // The same content again is not news.
    emit.mockClear()
    write('atril-aaaaaaa1', { entries: [ended], pending: [{ type: 'x', description: 'y', at: 2 }] })
    await wait(600)
    expect(emit).not.toHaveBeenCalled()
    sub.stop()

    // Removing a workspace deletes its file.
    makeRegisteredRepo(home)
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/sub', agent: 'claude', argv: ['sh', '-c', 'sleep 300'] })
    if (!('workspace' in r)) throw new Error(r.error)
    write(r.workspace.session, { entries: [running], pending: [] })
    expect(await removeWorkspace(r.workspace.id, run)).toEqual({ ok: true })
    expect(existsSync(join(home, 'subagents', `${r.workspace.session}.json`))).toBe(false)
  }, 30000)

  it('the description comes from the meta file', async () => {
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [{ id: 'aaaaaaa1', branch: 'b', session: 'atril-aaaaaaa1', path: '/x' }] }))
    const dir = tmp()
    const tr = (id: string): string => join(dir, `agent-${id}.jsonl`)
    const meta = (id: string, body: string): void => writeFileSync(join(dir, `agent-${id}.meta.json`), body)
    meta('a1', JSON.stringify({ description: '  T5\n  paginación   ya ', agentType: 'explorer' }))
    meta('a2', JSON.stringify({ description: 'y'.repeat(130) }))
    meta('a4', '{no es json')
    meta('a5', JSON.stringify({ description: 5 }))
    const stored = [
      { id: 'a1', type: 'explorer', transcript: tr('a1'), startedAt: 1 },
      { id: 'a2', type: 'explorer', transcript: tr('a2'), startedAt: 2 },
      { id: 'a3', type: 'Plan', transcript: tr('a3'), description: 'guardada', startedAt: 3 },
      { id: 'a4', type: 'Plan', transcript: tr('a4'), startedAt: 4 },
      { id: 'a5', type: 'Plan', transcript: tr('a5'), startedAt: 5 },
      { id: 'a6', type: 'Plan', description: 'antigua', startedAt: 6 }
    ]
    write('atril-aaaaaaa1', { entries: stored })
    const emit = vi.fn()
    const sub = createSubagents({ emit })
    await sub.start()

    const expected: SubagentEntry[] = [
      { id: 'a1', type: 'explorer', description: 'T5 paginación ya', startedAt: 1 },
      { id: 'a2', type: 'explorer', description: 'y'.repeat(120), startedAt: 2 },
      { id: 'a3', type: 'Plan', startedAt: 3 },
      { id: 'a4', type: 'Plan', startedAt: 4 },
      { id: 'a5', type: 'Plan', startedAt: 5 },
      { id: 'a6', type: 'Plan', description: 'antigua', startedAt: 6 }
    ]
    expect(await sub.get('aaaaaaa1')).toEqual(expected)
    expect(emit).toHaveBeenLastCalledWith('aaaaaaa1', expected)
    expect(JSON.stringify(emit.mock.calls)).not.toContain(dir)

    // A meta that shows up later is read on the next change of the entries file.
    meta('a3', JSON.stringify({ description: 'del meta' }))
    emit.mockClear()
    write('atril-aaaaaaa1', { entries: stored.map((e) => (e.id === 'a1' ? { ...e, endedAt: 9 } : e)) })
    await until(() => emit.mock.calls.length > 0)
    const [, last] = emit.mock.calls.at(-1) as [string, SubagentEntry[]]
    expect(last.find((e) => e.id === 'a3')?.description).toBe('del meta')
    expect(last.find((e) => e.id === 'a1')).toEqual({ ...expected[0], endedAt: 9 })
    sub.stop()
  }, 30000)

  it('the log reads only the stored transcript', async () => {
    writeFileSync(
      join(home, 'workspaces.json'),
      JSON.stringify({ workspaces: ['aaaaaaa1', 'aaaaaaa2'].map((id) => ({ id, branch: `b-${id}`, session: `atril-${id}`, path: '/x' })) })
    )
    const dir = tmp()
    const tr = join(dir, 'agent-a1.jsonl')
    writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'hola' }] } }) + '\n')
    write('atril-aaaaaaa1', {
      entries: [
        { id: 'a1', type: 'explorer', transcript: tr, startedAt: 1 },
        { id: 'a2', type: 'explorer', startedAt: 2 },
        { id: 'a3', type: 'explorer', transcript: join(dir, 'agent-a3.jsonl'), startedAt: 3 }
      ]
    })
    write('atril-aaaaaaa2', { entries: [{ id: 'b1', type: 'explorer', transcript: tr, startedAt: 1 }] })
    const sub = createSubagents({ emit: vi.fn() })

    expect(await sub.log('aaaaaaa1', 'a1')).toEqual([{ kind: 'text', text: 'hola' }])
    // Unknown workspace or agent, an agent from another workspace, no stored path, a file that is gone.
    expect(await sub.log('nope', 'a1')).toEqual([])
    expect(await sub.log('aaaaaaa1', 'b1')).toEqual([])
    expect(await sub.log('aaaaaaa1', tr)).toEqual([])
    expect(await sub.log('aaaaaaa1', 'a2')).toEqual([])
    expect(await sub.log('aaaaaaa1', 'a3')).toEqual([])
  })

  it('the log reads like Claude Code', () => {
    const line = (type: string, content: unknown): string => JSON.stringify({ type, message: { role: type, content } })
    const use = (name: string, input: object): object => ({ type: 'tool_use', id: name, name, input })
    const result = (content: unknown): object => ({ type: 'tool_result', tool_use_id: 'x', content })
    const fixture = [
      'esto no es json',
      JSON.stringify({ type: 'attachment', attachment: { text: 'nunca' } }),
      line('api-request-start', 'nunca'),
      // The prompt: the first user line holding a text block, its first 3 lines.
      line('user', [{ type: 'text', text: 'L1\nL2\nL3\nL4' }]),
      line('assistant', [{ type: 'thinking', thinking: 'SECRETO', signature: 's' }, { type: 'text', text: 'Voy a mirar.\nPrimero el código.' }]),
      line('assistant', [use('Read', { file_path: '/repo/a.ts', limit: 5 })]),
      line('assistant', [use('Bash', { description: 'tests', command: 'pnpm test\n   --run' })]),
      line('assistant', [use('Grep', { pattern: 'p'.repeat(100) })]),
      line('assistant', [use('WebFetch', { url: 'https://acme.example' })]),
      line('assistant', [use('Agent', { prompt: 'p', description: 'd' })]),
      line('assistant', [use('Skill', { skill: 'evidence' })]),
      line('assistant', [use('Task', { prompt: 'solo prompt' })]),
      line('assistant', [use('TodoWrite', { todos: [] })]),
      line('user', [result('1\n2\n3\n4\n5\n')]),
      line('user', [result([{ type: 'text', text: 'a' }, { type: 'image' }, { type: 'text', text: 'b' }])]),
      line('user', [result('corto')]),
      // A later user text is not a second prompt.
      line('user', 'otra cosa'),
      JSON.stringify({ type: 'assistant', message: { content: 7 } }),
      ''
    ].join('\n')

    expect(parseSubagentLog(fixture)).toEqual([
      { kind: 'prompt', text: 'L1\nL2\nL3' },
      { kind: 'thinking', text: '' },
      { kind: 'text', text: 'Voy a mirar.\nPrimero el código.' },
      { kind: 'tool', text: 'Read(/repo/a.ts)' },
      { kind: 'tool', text: 'Bash(pnpm test --run)' },
      { kind: 'tool', text: `Grep(${'p'.repeat(80)})` },
      { kind: 'tool', text: 'WebFetch(https://acme.example)' },
      { kind: 'tool', text: 'Agent(d)' },
      { kind: 'tool', text: 'Skill(evidence)' },
      { kind: 'tool', text: 'Task(solo prompt)' },
      { kind: 'tool', text: 'TodoWrite' },
      { kind: 'result', text: '1\n2\n3', more: 2 },
      { kind: 'result', text: 'a\nb' },
      { kind: 'result', text: 'corto' }
    ])
    // The prompt as a plain string.
    expect(parseSubagentLog([line('user', 'haz X\ny Y'), line('user', 'no')].join('\n'))).toEqual([{ kind: 'prompt', text: 'haz X\ny Y' }])
    // Only the last 500 parsed lines.
    const long = parseSubagentLog(Array.from({ length: 600 }, (_, i) => line('assistant', [{ type: 'text', text: `t${i}` }])).join('\n'))
    expect(long).toHaveLength(500)
    expect(long[0]).toEqual({ kind: 'text', text: 't100' })
    expect(long.at(-1)).toEqual({ kind: 'text', text: 't599' })
  })

  it('the window installs both subagent hooks', async () => {
    const { hooksSettings } = await import('./agent')
    const hooks = hooksSettings().hooks
    for (const e of ['SubagentStart', 'SubagentStop']) expect(hooks[e]?.[0]?.hooks[0]?.command).toBe(hooks['Stop']?.[0]?.hooks[0]?.command.replace(/Stop$/, e))
  })
})
