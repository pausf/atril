import { existsSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { join } from 'node:path'
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
  it('an agent that exits at once still leaves its session', async () => {
    makeRegisteredRepo(home)
    const { openWorktree } = await import('./workspaces')
    // `true` exits before any option could be set after the fact: the race that lost the session.
    const results = await Promise.all(
      ['feat/q1', 'feat/q2', 'feat/q3'].map((branch) => openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: ['true'] }))
    )
    for (const r of results) {
      if (!('workspace' in r)) throw new Error(r.error)
      // The session must survive the agent's exit; under load the exit itself may take a moment.
      const dead = (): string => tmuxOut(sock, 'display', '-p', '-t', r.workspace.paneId, '#{pane_dead}').trim()
      const end = Date.now() + 5000
      while (dead() !== '1' && Date.now() < end) await new Promise((ok) => setTimeout(ok, 50))
      expect(dead()).toBe('1')
    }
  })

  it('task text reaches the agent as one literal argument', async () => {
    makeRegisteredRepo(home)
    const { openWorktree } = await import('./workspaces')
    const out = join(home, 'agent')
    // The fake agent records how many arguments it got and each one NUL-terminated.
    const agent = ['sh', '-c', 'printf %s "$#" > "$0.n"; for a; do printf "%s\\0" "$a"; done > "$0.args"', out]
    const text = `--dangerously-skip-permissions $(touch ${home}/pwned); echo "a" 'b'\nsecond line`
    for (const [i, command] of ['flow', 'attacca'].entries()) {
      const r = await openWorktree({ repoId: 'demo', branch: `feat/own${i}`, agent: 'claude', task: `  ${text} `, ...(i === 1 && { auto: true }), argv: agent })
      if (!('workspace' in r)) throw new Error(r.error)
      const end = Date.now() + 5000
      while (!existsSync(`${out}.args`) && Date.now() < end) await new Promise((ok) => setTimeout(ok, 50))
      await new Promise((ok) => setTimeout(ok, 100))

      expect(readFileSync(`${out}.n`, 'utf8')).toBe('1')
      expect(readFileSync(`${out}.args`, 'utf8')).toBe(`/libretto:libretto-${command} ${text}\0`)
      expect(existsSync(join(home, 'pwned'))).toBe(false)
      rmSync(`${out}.args`)
    }
  })

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

  it('split adds a pane to the session', async () => {
    makeRegisteredRepo(home)
    const { openWorktree } = await import('./workspaces')
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/z', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const ws = r.workspace
    const panes = (): string[] => tmuxOut(sock, 'list-panes', '-t', ws.session, '-F', '#{pane_current_path}').trim().split('\n')
    expect(panes()).toHaveLength(1)
    // A decoy opened later is tmux's "most recent" session: a sloppy target would split it instead.
    const d = await openWorktree({ repoId: 'demo', branch: 'feat/decoy', agent: 'claude', argv: SLEEP })
    if (!('workspace' in d)) throw new Error(d.error)
    const decoyPanes = (): number => tmuxOut(sock, 'list-panes', '-t', d.workspace.session, '-F', '#{pane_id}').trim().split('\n').length

    const { splitPane } = await import('./tmux')
    await splitPane(ws.id, 'h', ws.path)

    expect(panes()).toHaveLength(2)
    expect(decoyPanes()).toBe(1)
    expect(panes().map((p) => realpathSync(p))).toEqual([realpathSync(ws.path), realpathSync(ws.path)])
    expect(tmuxOut(sock, 'list-panes', '-t', ws.session, '-F', '#{pane_id}').split('\n')).toContain(ws.paneId)
  })
})
