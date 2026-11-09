import { existsSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { openWorktree, removeWorkspace } from './workspaces'
import { run, type Runner } from './run'

const SLEEP = ['sh', '-c', 'sleep 300']
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
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

describe('workspaces', () => {
  it('creates the worktree on a new branch', async () => {
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/new', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const path = join(home, 'wt', 'demo', 'feat/new')

    expect(r.workspace.path).toBe(path)
    expect(existsSync(join(path, 'a.txt'))).toBe(true)
    expect(git(path, 'branch', '--show-current').trim()).toBe('feat/new')
    expect(r.workspace.baseCommit).toBe(git(repo, 'rev-parse', 'HEAD').trim())
  })

  it('refuses an invalid branch name', async () => {
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }
    const r = await openWorktree({ repoId: 'demo', branch: 'bad..name', agent: 'claude', argv: SLEEP }, spy)

    expect('error' in r).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.slice(0, 3)).toEqual(['git', 'check-ref-format', '--branch'])
    expect(existsSync(join(home, 'wt'))).toBe(false)
  })

  it('refuses to remove a dirty worktree', async () => {
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/dirty', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    writeFileSync(join(r.workspace.path, 'wip.txt'), 'uncommitted')

    const out = await removeWorkspace(r.workspace.id)

    expect(out).toEqual({ error: 'Tiene cambios sin commitear: haz commit o descártalos antes' })
    expect(existsSync(join(r.workspace.path, 'wip.txt'))).toBe(true)
    expect(vi.isMockFunction(removeWorkspace)).toBe(false)
  })
})
