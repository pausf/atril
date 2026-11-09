import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})
