import { existsSync, readFileSync } from 'node:fs'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { listWorkspaces, openWorktree, removeWorkspace } from './workspaces'
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

  it('invalid task text creates nothing', async () => {
    for (const task of ['   ', 'x'.repeat(2001), 'a\0b']) {
      const calls: string[][] = []
      const spy: Runner = (cmd, args, opts) => {
        calls.push([cmd, ...args])
        return run(cmd, args, opts)
      }
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/own', agent: 'claude', task, argv: SLEEP }, spy)
      expect(r).toEqual({ error: 'El texto de la tarea no es válido (máx. 2000 caracteres).' })
      expect(calls).toEqual([])
    }
    expect(existsSync(join(home, 'wt'))).toBe(false)
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

  it('trusts its own worktree without copying the claude config', async () => {
    makeRegisteredRepo(home)
    const cfg = process.env['ATRIL_CLAUDE_JSON'] as string
    writeFileSync(cfg, JSON.stringify({ keep: 1, projects: {} }))
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/own', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const after = JSON.parse(readFileSync(cfg, 'utf8')) as { keep: number; projects: Record<string, { hasTrustDialogAccepted?: boolean }> }
    expect(after.keep).toBe(1)
    expect(after.projects[r.workspace.path]?.hasTrustDialogAccepted).toBe(true)
    expect(existsSync(join(home, 'backups'))).toBe(false)
  })

  describe('in-place', () => {
    beforeEach(() => {
      writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo, override: 'in-place' }] }))
    })

    it('never trusts the person\'s own checkout', async () => {
      const cfg = process.env['ATRIL_CLAUDE_JSON'] as string
      writeFileSync(cfg, JSON.stringify({ keep: 1, projects: {} }))
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/trust', agent: 'claude', argv: SLEEP })
      if (!('workspace' in r)) throw new Error(r.error)
      const after = JSON.parse(readFileSync(cfg, 'utf8')) as { projects: Record<string, unknown> }
      expect(Object.keys(after.projects)).toEqual([])
      // No copy of ~/.claude.json may land in Atril's home: it can hold other secrets.
      expect(existsSync(join(home, 'backups'))).toBe(false)
    })

    it('refuses a second in-place workspace', async () => {
      const first = await openWorktree({ repoId: 'demo', branch: 'feat/one', agent: 'claude', argv: SLEEP })
      expect('workspace' in first).toBe(true)

      const second = await openWorktree({ repoId: 'demo', branch: 'feat/two', agent: 'claude', argv: SLEEP })

      expect(second).toEqual({ error: 'Este repo trabaja in-place y ya tiene un trabajo abierto: ciérralo antes' })
      expect(git(repo, 'branch', '--show-current').trim()).toBe('feat/one')
      expect(git(repo, 'branch', '--list', 'feat/two').trim()).toBe('')
    })

    it('in-place refuses a dirty checkout', async () => {
      const before = git(repo, 'branch', '--show-current').trim()
      writeFileSync(join(repo, 'wip.txt'), 'uncommitted')

      const r = await openWorktree({ repoId: 'demo', branch: 'feat/dirty', agent: 'claude', argv: SLEEP })

      expect(r).toEqual({ error: 'La copia principal tiene cambios sin commitear: haz commit o descártalos antes' })
      expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
      expect(git(repo, 'branch', '--list', 'feat/dirty').trim()).toBe('')
      expect(existsSync(join(repo, 'wip.txt'))).toBe(true)
      expect(existsSync(join(home, 'workspaces.json'))).toBe(false)
    })

    it('in-place close refuses when the branch was changed by hand', async () => {
      const before = git(repo, 'branch', '--show-current').trim()
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/hand', agent: 'claude', argv: SLEEP })
      if (!('workspace' in r)) throw new Error(r.error)
      git(repo, 'switch', '-c', 'other-work')

      const refused = await removeWorkspace(r.workspace.id)
      expect(refused).toEqual({ error: 'El repo está en la rama «other-work», no en «feat/hand»: vuelve a «feat/hand» antes de cerrar' })
      // Nothing moved: the person stays where they switched to, and the workspace remains.
      expect(git(repo, 'branch', '--show-current').trim()).toBe('other-work')
      expect((await listWorkspaces()).map((w) => w.id)).toEqual([r.workspace.id])
      expect(before).not.toBe('other-work')
    })

    it('in-place close restores the previous branch', async () => {
      const before = git(repo, 'branch', '--show-current').trim()
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/ip', agent: 'claude', argv: SLEEP })
      if (!('workspace' in r)) throw new Error(r.error)
      expect(r.workspace.path).toBe(repo)
      expect(r.workspace.previousBranch).toBe(before)
      expect(git(repo, 'branch', '--show-current').trim()).toBe('feat/ip')

      writeFileSync(join(repo, 'wip.txt'), 'uncommitted')
      const refused = await removeWorkspace(r.workspace.id)
      expect(refused).toEqual({ error: 'Tiene cambios sin commitear: haz commit o descártalos antes' })
      expect(git(repo, 'branch', '--show-current').trim()).toBe('feat/ip')
      expect(existsSync(join(repo, 'wip.txt'))).toBe(true)
      expect((await listWorkspaces()).map((w) => w.id)).toEqual([r.workspace.id])

      rmSync(join(repo, 'wip.txt'))
      expect(await removeWorkspace(r.workspace.id)).toEqual({ ok: true })
      expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
      expect(git(repo, 'branch', '--list', 'feat/ip').trim()).not.toBe('')
      expect(await listWorkspaces()).toEqual([])
    })
  })
})
