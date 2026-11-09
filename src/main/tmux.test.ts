import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'

const SLEEP = ['sh', '-c', 'sleep 300']
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

describe('tmux', () => {
  it('starts the agent in a named tmux session', async () => {
    makeRegisteredRepo(home)
    const { openWorktree } = await import('./workspaces')
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/x', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const ws = r.workspace

    expect(ws.session).toBe(`atril-${ws.id}`)
    expect(ws.id).toMatch(/^[a-z0-9]{8}$/)
    expect(tmuxOut(sock, 'list-sessions', '-F', '#{session_name}').trim()).toBe(`atril-${ws.id}`)
    expect(tmuxOut(sock, 'show-options', '-v', '-t', ws.session, 'remain-on-exit').trim()).toBe('on')
    expect(tmuxOut(sock, 'list-panes', '-t', ws.session, '-F', '#{pane_id}').split('\n')).toContain(ws.paneId)
  })

  it('reattaches to sessions that outlived the app', async () => {
    makeRegisteredRepo(home)
    const first = await import('./workspaces')
    const r = await first.openWorktree({ repoId: 'demo', branch: 'feat/y', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const before = tmuxOut(sock, 'list-sessions', '-F', '#{session_name}').trim().split('\n')

    // Simulated restart: a fresh module graph reads everything from disk and tmux.
    vi.resetModules()
    const second = await import('./workspaces')
    const list = await second.listWorkspaces()

    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe(r.workspace.id)
    expect(list[0]?.alive).toBe(true)
    expect(tmuxOut(sock, 'list-sessions', '-F', '#{session_name}').trim().split('\n')).toEqual(before)
  })
})
