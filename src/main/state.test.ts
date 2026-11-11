import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'
import { forgetWorkspace, listWorkspaces, listWorkspacesOrNone, openWorktree, removeWorkspace, reopenWorkspace, writeRecords } from './workspaces'
import { listRepos, registerRepo, rememberRepo, setOverride } from './repos'
import { pauseAgent } from './status'
import { revealState } from './state'
import { run } from './run'

const SLEEP = ['sh', '-c', 'sleep 300']
const WS_SENTENCE = 'No puedo leer workspaces.json: está dañado. No abro ni cierro trabajos hasta que se arregle.'
const REPOS_SENTENCE = 'No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.'
let sock: string
let home: string
let repo: string

beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
  repo = makeRegisteredRepo(home)
})
afterEach(() => {
  chmodSync(home, 0o755)
  for (const f of ['workspaces.json', 'repos.json']) if (existsSync(join(home, f))) chmodSync(join(home, f), 0o644)
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const sessionUp = (session: string): boolean => {
  try {
    tmuxOut(sock, 'has-session', '-t', `=${session}`)
    return true
  } catch {
    return false
  }
}
const openOne = async (branch: string) => {
  const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: SLEEP })
  if (!('workspace' in r)) throw new Error(r.error)
  return r.workspace
}
const branches = (): string => git(repo, 'branch', '--list').trim()

describe('state files', () => {
  it('a damaged workspaces list blocks every change and writes nothing', async () => {
    const ws = await openOne('feat/kept')
    const file = join(home, 'workspaces.json')
    // A healthy record next to one without a branch: the shape is wrong, the JSON is fine.
    const record = JSON.parse(readFileSync(file, 'utf8')).workspaces[0]
    const damaged = JSON.stringify({ workspaces: [record, { id: 'x', path: '/p', session: 's' }] })
    writeFileSync(file, damaged)
    // Readers that only show things see no works instead of rejecting in the window; the strict one still refuses.
    expect(await listWorkspacesOrNone()).toEqual([])
    await expect(listWorkspaces()).rejects.toThrow()
    const problem = { error: WS_SENTENCE, detail: expect.stringContaining('branch'), fix: 'reveal', file: 'workspaces' }

    expect(await removeWorkspace(ws.id)).toEqual(problem)
    expect(await forgetWorkspace(ws.id)).toEqual(problem)
    expect(await pauseAgent(ws.id)).toEqual({ error: WS_SENTENCE })
    expect(sessionUp(ws.session)).toBe(true)
    expect(existsSync(ws.path)).toBe(true)
    tmuxOut(sock, 'kill-session', '-t', `=${ws.session}`)
    expect(await reopenWorkspace(ws.id, {})).toEqual(problem)
    expect(sessionUp(ws.session)).toBe(false)
    expect(await openWorktree({ repoId: 'demo', branch: 'feat/new', agent: 'claude', argv: SLEEP })).toEqual(problem)
    expect(existsSync(join(home, 'wt', 'demo', 'feat', 'new'))).toBe(false)
    expect(branches()).not.toContain('feat/new')
    await expect(writeRecords([])).rejects.toThrow()
    await expect(listWorkspaces()).rejects.toThrow()
    expect(readFileSync(file, 'utf8')).toBe(damaged)

    // Every other way of being damaged gives the same answer, with its own detail; a missing file is empty.
    const variants: Array<[() => void, RegExp]> = [
      [() => writeFileSync(file, '{not json'), /JSON/],
      [() => writeFileSync(file, JSON.stringify({ workspaces: {} })), /workspaces/],
      [() => writeFileSync(file, JSON.stringify([])), /workspaces/],
      [() => (writeFileSync(file, damaged), chmodSync(file, 0o000)), /EACCES/]
    ]
    for (const [damage, detail] of variants) {
      damage()
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/other', agent: 'claude', argv: SLEEP })
      expect(r).toEqual({ ...problem, detail: expect.stringMatching(detail) })
      chmodSync(file, 0o644)
    }
    expect(branches()).not.toContain('feat/other')
    const { rmSync } = await import('node:fs')
    rmSync(file)
    mkdirSync(file)
    expect(await openWorktree({ repoId: 'demo', branch: 'feat/other', agent: 'claude', argv: SLEEP })).toEqual({ ...problem, detail: expect.stringMatching(/EISDIR/) })
    rmSync(file, { recursive: true })
    expect(await listWorkspaces()).toEqual([])
  }, 30_000)

  it('a damaged repos list blocks every change and writes nothing', async () => {
    const ws = await openOne('feat/kept')
    const file = join(home, 'repos.json')
    const damaged = JSON.stringify({ repos: [{ id: 'demo', path: repo }, { id: 'nopath' }], jiraRepos: { 'PF|': 'demo' } })
    writeFileSync(file, damaged)
    const problem = { error: REPOS_SENTENCE, detail: expect.stringContaining('path'), fix: 'reveal', file: 'repos' }
    const records = readFileSync(join(home, 'workspaces.json'), 'utf8')

    expect(await openWorktree({ repoId: 'demo', branch: 'feat/new', agent: 'claude', argv: SLEEP })).toEqual(problem)
    expect(branches()).not.toContain('feat/new')
    expect(await removeWorkspace(ws.id)).toEqual(problem)
    expect(await forgetWorkspace(ws.id)).toEqual(problem)
    expect(sessionUp(ws.session)).toBe(true)
    tmuxOut(sock, 'kill-session', '-t', `=${ws.session}`)
    expect(await reopenWorkspace(ws.id, {})).toEqual(problem)
    expect(sessionUp(ws.session)).toBe(false)
    expect(existsSync(ws.path)).toBe(true)

    const other = tmp()
    git(other, 'init', '-q')
    expect(await registerRepo(other, run)).toEqual(problem)
    expect(await setOverride('demo', 'in-place')).toEqual(problem)
    await expect(rememberRepo('OPS|', 'demo')).rejects.toThrow()
    expect(await listRepos(run)).toEqual({ problem })
    expect(readFileSync(file, 'utf8')).toBe(damaged)
    expect(readFileSync(join(home, 'workspaces.json'), 'utf8')).toBe(records)

    writeFileSync(file, '{"repos": "demo"}')
    expect(await listRepos(run)).toEqual({ problem: { ...problem, detail: expect.stringContaining('repos') } })
    const { rmSync } = await import('node:fs')
    rmSync(file)
    expect(await listRepos(run)).toEqual([])
  }, 30_000)

  it('reveal shows only the state files', async () => {
    const show = vi.fn()
    expect(await revealState('repos', show)).toBe(true)
    expect(show).toHaveBeenLastCalledWith(join(home, 'repos.json'))
    // Missing: Atril's folder instead.
    expect(await revealState('workspaces', show)).toBe(true)
    expect(show).toHaveBeenLastCalledWith(home)
    writeFileSync(join(home, 'workspaces.json'), '{}')
    expect(await revealState('workspaces', show)).toBe(true)
    expect(show).toHaveBeenLastCalledWith(join(home, 'workspaces.json'))
    show.mockClear()
    for (const bad of ['ui', '../repos', '/etc/hosts', 'repos.json', 3, null, undefined, { name: 'repos' }]) expect(await revealState(bad, show)).toBe(false)
    expect(show).not.toHaveBeenCalled()
  })
})
