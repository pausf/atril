import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WorkspaceView } from '../preload/api'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'
import type { Runner } from './run'

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

async function open(branch: string): Promise<WorkspaceView> {
  const { openWorktree } = await import('./workspaces')
  // `cat` echoes what the pane receives, so the capture shows exactly what arrived.
  const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: ['cat'] })
  if (!('workspace' in r)) throw new Error(r.error)
  return r.workspace
}

const capture = (ws: WorkspaceView): string => tmuxOut(sock, 'capture-pane', '-p', '-t', ws.paneId)

async function until(read: () => string, done: (s: string) => boolean, ms = 3000): Promise<string> {
  const end = Date.now() + ms
  let v = read()
  while (!done(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 50))
    v = read()
  }
  return v
}

/** Runner that records every tmux send-keys so "nothing was sent" is observed, not assumed. */
async function spied(): Promise<{ run: Runner; sent: string[][] }> {
  const { run } = await import('./run')
  const sent: string[][] = []
  return { sent, run: (cmd, args, opts) => (args.includes('send-keys') && sent.push(args), run(cmd, args, opts)) }
}

describe('reply', () => {
  it('reply reaches only its own pane as literal text', async () => {
    makeRegisteredRepo(home)
    const { replyToAgent } = await import('./status')
    const { removeWorkspace } = await import('./workspaces')
    const a = await open('feat/a')
    const b = await open('feat/b')
    const { run, sent } = await spied()
    const hostile = 'C-c Enter "; rm -rf /"'

    expect(await replyToAgent(a.id, hostile, run)).toBe('sent')

    // `cat` shows the typed line twice (tty echo, then its own output): both are the literal text.
    const shown = await until(() => capture(a), (s) => s.includes('rm -rf'))
    expect(shown).toContain(hostile)
    expect(capture(b).trim()).toBe('')
    // A reply that is exactly a key name must be typed, not pressed: C-c would kill `cat`.
    expect(await replyToAgent(a.id, 'C-c', run)).toBe('sent')
    expect(await until(() => capture(a), (s) => s.split('\n').filter((l) => l === 'C-c').length >= 2)).toMatch(/^C-c$/m)
    expect(tmuxOut(sock, 'display', '-p', '-t', a.paneId, '#{pane_dead}').trim()).toBe('0')

    // Empty (or only blanks): nothing reaches tmux.
    sent.length = 0
    expect(await replyToAgent(a.id, '', run)).toBe('ignored')
    expect(await replyToAgent(a.id, '  \n ', run)).toBe('ignored')
    expect(sent).toEqual([])

    // A workspace that was closed: nothing is sent and the caller can say so.
    const closed = await removeWorkspace(b.id)
    expect(closed).toEqual({ ok: true })
    expect(await replyToAgent(b.id, 'hola', run)).toBe('gone')
    expect(await replyToAgent('nosuchid', 'hola', run)).toBe('gone')
    expect(sent).toEqual([])
  })

  it('a quick answer reaches its own pane', async () => {
    makeRegisteredRepo(home)
    const { answerAgent, replyGone } = await import('./status')
    const { removeWorkspace } = await import('./workspaces')
    const a = await open('feat/qa')
    const b = await open('feat/qb')
    const asked = (ws: WorkspaceView, options?: string[], state = 'needs-you'): void => {
      mkdirSync(join(home, 'state'), { recursive: true })
      writeFileSync(join(home, 'state', `${ws.session}.json`), JSON.stringify({ state, at: 1, text: 'Te pregunta: ¿?', ...(options && { options }) }))
    }
    asked(a, ['Sí', 'No', 'Quizá'])
    asked(b)
    const { run, sent } = await spied()
    const notWaiting = { error: 'Ese agente ya no está esperando una respuesta.' }
    const noOption = { error: 'Esa opción ya no existe.' }

    // An option among the stored ones: its number as a key (not literal text), then Enter, into that pane only.
    expect(await answerAgent(a.id, { option: 1 }, run)).toEqual({ ok: true })
    expect(sent).toEqual([
      ['-L', sock, 'send-keys', '-t', a.paneId, '2'],
      ['-L', sock, 'send-keys', '-t', a.paneId, 'Enter']
    ])
    expect(await until(() => capture(a), (s) => s.split('\n').filter((l) => l === '2').length >= 2)).toMatch(/^2$/m)
    expect(capture(b).trim()).toBe('')

    // A fixed reply: main's own words as literal text then Enter, as N3.
    sent.length = 0
    expect(await answerAgent(b.id, { fixed: 'yes' }, run)).toEqual({ ok: true })
    expect(sent[0]).toEqual(['-L', sock, 'send-keys', '-t', b.paneId, '-l', '--', 'Sí, sigue'])
    expect(await until(() => capture(b), (s) => s.includes('Sí, sigue'))).toContain('Sí, sigue')
    expect(await answerAgent(b.id, { fixed: 'no' }, run)).toEqual({ ok: true })
    expect(await until(() => capture(b), (s) => s.includes('No, espera'))).toContain('No, espera')

    // An option not among the stored ones (or none stored): nothing typed.
    sent.length = 0
    for (const [ws, option] of [[a, 3], [a, -1], [a, 1.5], [b, 0]] as [WorkspaceView, number][]) {
      expect(await answerAgent(ws.id, { option }, run)).toEqual(noOption)
    }

    // Re-read at press time: a state that left needs-you types nothing, option or fixed.
    asked(a, ['Sí', 'No', 'Quizá'], 'working')
    expect(await answerAgent(a.id, { option: 0 }, run)).toEqual(notWaiting)
    expect(await answerAgent(a.id, { fixed: 'yes' }, run)).toEqual(notWaiting)
    asked(a, ['Sí', 'No', 'Quizá'])

    // Any other shape is refused: the window never gets text typed.
    for (const choice of ['yes', 1, { fixed: 'C-c' }, { text: 'hola' }, { option: '1' }, null, { option: 0, fixed: 'yes' }]) {
      expect(await answerAgent(a.id, choice as never, run)).toHaveProperty('error')
    }
    expect(sent).toEqual([])

    // A gone workspace: nothing is sent and the caller says so (N3).
    expect(await removeWorkspace(b.id)).toEqual({ ok: true })
    expect(await answerAgent(b.id, { fixed: 'yes' }, run)).toEqual({ error: replyGone() })
    expect(await answerAgent('nosuchid', { option: 0 }, run)).toEqual({ error: replyGone() })
    expect(sent).toEqual([])
  })

  it('a number answers the option with its key', async () => {
    makeRegisteredRepo(home)
    const { replyFromNotice, optionCount } = await import('./status')
    const { removeWorkspace } = await import('./workspaces')
    const a = await open('feat/na')
    const b = await open('feat/nb')
    const asked = (ws: WorkspaceView, options?: string[]): void => {
      mkdirSync(join(home, 'state'), { recursive: true })
      writeFileSync(join(home, 'state', `${ws.session}.json`), JSON.stringify({ state: 'needs-you', at: 1, text: 'Te pregunta: ¿?', ...(options && { options }) }))
    }
    asked(a, ['Sí', 'No', 'Quizá'])
    asked(b)
    expect(await optionCount(a.session)).toBe(3)
    expect(await optionCount(b.session)).toBe(0)
    const { run, sent } = await spied()

    // «2» with three options: the option's key, not literal text, into that pane only.
    expect(await replyFromNotice(a.id, ' 2 ', run)).toBe('sent')
    expect(sent).toEqual([
      ['-L', sock, 'send-keys', '-t', a.paneId, '2'],
      ['-L', sock, 'send-keys', '-t', a.paneId, 'Enter']
    ])
    // Out of range, not an integer, or no options: literal text, as N3.
    for (const text of ['4', '0', '1.5', 'dos']) {
      sent.length = 0
      expect(await replyFromNotice(a.id, text, run)).toBe('sent')
      expect(sent[0]).toEqual(['-L', sock, 'send-keys', '-t', a.paneId, '-l', '--', text])
    }
    sent.length = 0
    expect(await replyFromNotice(b.id, '1', run)).toBe('sent')
    expect(sent[0]).toEqual(['-L', sock, 'send-keys', '-t', b.paneId, '-l', '--', '1'])
    // Empty: nothing; gone: nothing, and the caller says so.
    sent.length = 0
    expect(await replyFromNotice(a.id, '  ', run)).toBe('ignored')
    expect(await removeWorkspace(b.id)).toEqual({ ok: true })
    expect(await replyFromNotice(b.id, '1', run)).toBe('gone')
    expect(sent).toEqual([])
  })
})
