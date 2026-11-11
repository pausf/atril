import { existsSync, readFileSync } from 'node:fs'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'
import { flowWorkspace, listWorkspaces, openWorktree, readRecords, removeWorkspace, writeRecords } from './workspaces'
import { qaStatus } from './qa'
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
    // A non-string over IPC (a buggy renderer) is refused too, never opened as a plain agent.
    for (const task of ['   ', 'x'.repeat(2001), 'a\0b', null, { text: 'x' }] as unknown as string[]) {
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

      expect(second).toEqual({ error: 'demo trabaja en tu copia y ya tiene un trabajo abierto (feat/one).', fix: 'worktree' })
      expect(git(repo, 'branch', '--show-current').trim()).toBe('feat/one')
      expect(git(repo, 'branch', '--list', 'feat/two').trim()).toBe('')
    })

    it('in-place refuses a dirty checkout', async () => {
      const before = git(repo, 'branch', '--show-current').trim()
      writeFileSync(join(repo, 'wip.txt'), 'uncommitted')

      const r = await openWorktree({ repoId: 'demo', branch: 'feat/dirty', agent: 'claude', argv: SLEEP })

      expect(r).toEqual({
        error: `Tu copia de demo tiene 1 cambio sin commitear en ${before}: no puedo pasarla a feat/dirty sin mezclarlos.`,
        detail: '?? wip.txt\n\nTrabaja en tu copia: elegido por ti',
        fix: 'worktree'
      })
      expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
      expect(git(repo, 'branch', '--list', 'feat/dirty').trim()).toBe('')
      expect(existsSync(join(repo, 'wip.txt'))).toBe(true)
      expect(existsSync(join(home, 'workspaces.json'))).toBe(false)
    })

    it('worktree this time leaves the dirty copy alone', async () => {
      const before = git(repo, 'branch', '--show-current').trim()
      writeFileSync(join(repo, 'wip.txt'), 'uncommitted')

      const r = await openWorktree({ repoId: 'demo', branch: 'feat/apart', agent: 'claude', argv: SLEEP, worktree: true })

      if (!('workspace' in r)) throw new Error(r.error)
      expect(r.workspace.mode).toBe('worktree')
      expect(r.workspace.path).toBe(join(home, 'wt', 'demo', 'feat/apart'))
      expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
      expect(readFileSync(join(repo, 'wip.txt'), 'utf8')).toBe('uncommitted')
      expect(JSON.parse(readFileSync(join(home, 'repos.json'), 'utf8')).repos[0].override).toBe('in-place')
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

  it('a workspace opens on an existing remote branch', async () => {
    const bare = tmp()
    git(bare, 'init', '--bare', '-q')
    git(repo, 'remote', 'add', 'origin', bare)
    const pushBranch = (name: string): string => {
      git(repo, 'switch', '-q', '-c', `tmp-${name}`)
      writeFileSync(join(repo, `${name.replace("/", "-")}.txt`), name)
      git(repo, 'add', '.')
      git(repo, 'commit', '-q', '-m', name)
      git(repo, 'push', '-q', 'origin', `tmp-${name}:refs/heads/${name}`)
      const sha = git(repo, 'rev-parse', 'HEAD').trim()
      git(repo, 'switch', '-q', '-')
      git(repo, 'branch', '-q', '-D', `tmp-${name}`)
      return sha
    }
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }

    // The base is where the MR's branch left the main line, so Cambios shows the whole MR from the start.
    const mainLine = git(repo, 'rev-parse', 'HEAD').trim()
    // No local branch: a new one tracking the remote's.
    const fetched = pushBranch('feat/remote')
    const fresh = await openWorktree({ repoId: 'demo', branch: 'feat/remote', agent: 'claude', existing: true, remote: 'origin', argv: SLEEP }, spy)
    if (!('workspace' in fresh)) throw new Error(fresh.error)
    expect(calls).toContainEqual(['git', '-C', repo, 'fetch', 'origin', 'feat/remote'])
    expect(git(fresh.workspace.path, 'rev-parse', 'HEAD').trim()).toBe(fetched)
    expect(git(fresh.workspace.path, 'rev-parse', '--abbrev-ref', 'feat/remote@{upstream}').trim()).toBe('origin/feat/remote')
    expect(fresh.workspace.baseCommit).toBe(mainLine)

    // A local branch already there is the one checked out, untouched.
    pushBranch('feat/both')
    const localTip = git(repo, 'rev-parse', 'HEAD').trim()
    git(repo, 'branch', 'feat/both', localTip)
    const both = await openWorktree({ repoId: 'demo', branch: 'feat/both', agent: 'claude', existing: true, remote: 'origin', argv: SLEEP })
    if (!('workspace' in both)) throw new Error(both.error)
    expect(git(both.workspace.path, 'branch', '--show-current').trim()).toBe('feat/both')
    expect(git(both.workspace.path, 'rev-parse', 'HEAD').trim()).toBe(localTip)
    expect(both.workspace.baseCommit).toBe(mainLine)

    // A branch the remote does not have opens nothing.
    const missing = await openWorktree({ repoId: 'demo', branch: 'feat/nowhere', agent: 'claude', existing: true, remote: 'origin', argv: SLEEP })
    expect('error' in missing && missing.error.startsWith('No se pudo traer la rama: ')).toBe(true)
    expect(existsSync(join(home, 'wt', 'demo', 'feat/nowhere'))).toBe(false)
    expect(git(repo, 'branch', '--list', 'feat/nowhere').trim()).toBe('')

    // In place, the person's copy is never switched: refused before any fetch.
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo, override: 'in-place' }] }))
    calls.length = 0
    const before = git(repo, 'branch', '--show-current').trim()
    const inPlace = await openWorktree({ repoId: 'demo', branch: 'feat/remote', agent: 'claude', existing: true, remote: 'origin', argv: SLEEP }, spy)
    expect(inPlace).toEqual({ error: 'Este repo trabaja en tu copia: cambia de rama a mano' })
    expect(calls.some((c) => c.includes('fetch'))).toBe(false)
    expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
    expect((await readRecords()).map((r) => r.branch)).toEqual(['feat/remote', 'feat/both'])
    // ponytail: ~7 s alone (two worktrees, two tmux sessions, a push per branch); timed out at 20 s once in a full run.
  }, 40_000)

  it('a review session never touches git', async () => {
    // Read-only plumbing is all a review session may run; anything else could move a ref, the index or the files.
    const READ_ONLY = ['check-ref-format', 'rev-parse', 'remote', 'status', 'branch --show-current', 'for-each-ref', 'ls-files']
    writeFileSync(join(repo, 'wip.txt'), 'the person\'s own uncommitted work')
    const state = (): string[] => [git(repo, 'for-each-ref'), git(repo, 'rev-parse', 'HEAD'), git(repo, 'status', '--porcelain'), git(repo, 'ls-files', '--stage'), git(repo, 'worktree', 'list')]
    const before = state()
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }

    const r = await openWorktree({ repoId: 'demo', branch: 'feat/their-mr', agent: 'claude', review: true, prompt: '/libretto:libretto-review https://github.com/acme/shop-web/pull/7', argv: SLEEP }, spy)
    if (!('workspace' in r)) throw new Error(r.error)
    expect(r.workspace).toMatchObject({ mode: 'review', branch: 'feat/their-mr', path: repo })
    const gits = calls.filter((c) => c[0] === 'git').map((c) => c.slice(c[1] === '-C' ? 3 : 1).join(' '))
    expect(gits.filter((g) => !READ_ONLY.some((ok) => g.startsWith(ok)))).toEqual([])
    expect(state()).toEqual(before)
    expect(tmuxOut(sock, 'display-message', '-p', '-t', r.workspace.session, '#{pane_current_path}').trim()).toBe(repo)

    // W7 counts in-place workspaces only: a review session in an in-place repo leaves room for one.
    rmSync(join(repo, 'wip.txt'))
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo, override: 'in-place' }] }))
    const second = await openWorktree({ repoId: 'demo', branch: 'feat/their-mr-2', agent: 'claude', review: true, argv: SLEEP })
    if (!('workspace' in second)) throw new Error(second.error)
    const ip = await openWorktree({ repoId: 'demo', branch: 'feat/mine', agent: 'claude', argv: SLEEP })
    if (!('workspace' in ip)) throw new Error(ip.error)
    expect(ip.workspace.mode).toBe('in-place')

    // Removing it ends its session and drops its record, with no git at all (the checkout is dirty again on purpose).
    writeFileSync(join(repo, 'wip.txt'), 'dirty')
    calls.length = 0
    expect(await removeWorkspace(r.workspace.id, spy)).toEqual({ ok: true })
    expect(calls.filter((c) => c[0] === 'git')).toEqual([])
    expect((await readRecords()).map((w) => w.id)).toEqual([second.workspace.id, ip.workspace.id])
    expect((await listWorkspaces()).some((w) => w.id === r.workspace.id)).toBe(false)
    expect(() => tmuxOut(sock, 'has-session', '-t', r.workspace.session)).toThrow()
  })


  it('a review session has no libretto panel of its own', async () => {
    // Its folder is the person's own copy: the panel, Cambios and QA must not read it as the review's work.
    const review = await openWorktree({ repoId: 'demo', branch: 'feat/rev', agent: 'claude', review: true, argv: SLEEP })
    if (!('workspace' in review)) throw new Error(review.error)
    const work = await openWorktree({ repoId: 'demo', branch: 'feat/work', agent: 'claude', argv: SLEEP })
    if (!('workspace' in work)) throw new Error(work.error)
    expect(await flowWorkspace(review.workspace.id, run)).toBeUndefined()
    expect((await flowWorkspace(work.workspace.id, run))?.id).toBe(work.workspace.id)
    expect(await qaStatus(review.workspace.id, run)).toBeNull()
  }, 40000)
  it('a reader never sees a half-written workspaces file', async () => {
    // Watchers read workspaces.json while it is being written; a truncate-then-write showed them an empty file.
    const many = Array.from({ length: 3000 }, (_, n) => ({ id: `id${n}`, repoId: 'demo', branch: `b${n}`, mode: 'worktree' as const, path: '/p', baseCommit: 'x', agent: 'claude' as const, session: `s${n}`, paneId: '%1' }))
    await writeRecords(many)
    const races = Array.from({ length: 60 }, (_, n) => (n % 2 ? writeRecords(many) : readRecords().then((r) => r.length)))
    const lengths = (await Promise.all(races)).filter((x): x is number => typeof x === 'number')
    expect(lengths.every((l) => l === 3000)).toBe(true)
  })
})
