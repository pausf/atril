import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { rmSync, symlinkSync, writeFileSync } from 'node:fs'
import type { Effort } from '../preload/api'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agentSpy, cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock, workThatMergedMain } from './test-helpers'
import { closeQuiet, openWatchers } from './flow/quiet'
import { flowWorkspace, forgetWorkspace, listWorkspaces, markMergedFrom, openWorktree, panelBoxes, readRecords, removeWorkspace, reopenWorkspace, terminalAt, workBase, writeRecords } from './workspaces'
import { qaStatus } from './qa'
import { run, type Runner } from './run'

const SLEEP = ['sh', '-c', 'sleep 300']
/** Real runner, except the first call `when` matches answers `stderr` with code 128. */
const failing = (when: (cmd: string, args: string[]) => boolean, stderr: string): Runner => (cmd, args, opts) =>
  when(cmd, args) ? Promise.resolve({ code: 128, stdout: '', stderr }) : run(cmd, args, opts)
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

    expect(r).toEqual({ error: '«bad..name» no es un nombre de rama válido' })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.slice(0, 3)).toEqual(['git', 'check-ref-format', '--branch'])
    expect(existsSync(join(home, 'wt'))).toBe(false)
  })

  it('a missing or non-git repo is refused with its fix', async () => {
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }
    const readOnly = (): void => {
      // Only the name check and the read-only health probe may run: no git that writes, no tmux.
      expect(calls.filter((c) => !(c[1] === 'check-ref-format' || (c[0] === 'git' && c.includes('rev-parse') && c.includes('--git-dir'))))).toEqual([])
      calls.length = 0
    }

    rmSync(repo, { recursive: true, force: true })
    expect(await openWorktree({ repoId: 'demo', branch: 'feat/x', agent: 'claude', argv: SLEEP }, spy)).toEqual({ error: `La carpeta de demo ya no existe (${repo}).`, fix: 'settings' })
    readOnly()

    const plain = tmp()
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: plain, override: 'in-place' }] }))
    expect(await openWorktree({ repoId: 'demo', branch: 'feat/x', agent: 'claude', argv: SLEEP }, spy)).toEqual({ error: `La carpeta de demo no es un repo de git (${plain}).`, fix: 'settings' })
    readOnly()
    expect(existsSync(join(home, 'wt'))).toBe(false)
    expect(existsSync(join(home, 'workspaces.json'))).toBe(false)
  })

  it('a broken git is never blamed on the branch name', async () => {
    const XCODE = 'xcode-select: note: No developer tools were found, requesting install.'
    const broken = (code: number, stderr: string, when: (args: string[]) => boolean = () => true): Runner => (cmd, args, opts) =>
      cmd === 'git' && when(args) ? Promise.resolve({ code, stdout: '', stderr }) : run(cmd, args, opts)
    const opening = (branch: string, runner: Runner) => openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: SLEEP }, runner)

    // Whatever the name, a git that cannot run is said as such.
    for (const branch of ['feat/x', 'bad..name']) {
      expect(await opening(branch, broken(1, XCODE))).toEqual({ error: 'git no funciona en este Mac.', detail: XCODE, fix: 'git' })
      expect(await opening(branch, broken(127, 'sh: git: command not found'))).toEqual({ error: 'git no funciona en este Mac.', detail: 'sh: git: command not found', fix: 'git' })
    }

    // A later step breaking: nothing it had not made is left behind.
    const add = await opening('feat/add', broken(1, XCODE, (a) => a.includes('worktree') && a.includes('add')))
    expect(add).toEqual({ error: 'git no funciona en este Mac.', detail: XCODE, fix: 'git' })
    expect(existsSync(join(home, 'wt', 'demo', 'feat', 'add'))).toBe(false)
    expect(git(repo, 'branch', '--list', 'feat/add').trim()).toBe('')

    // Closing: the record stays.
    const r = await opening('feat/close', run)
    if (!('workspace' in r)) throw new Error(r.error)
    expect(await removeWorkspace(r.workspace.id, broken(127, 'sh: git: command not found'))).toEqual({ error: 'git no funciona en este Mac.', detail: 'sh: git: command not found', fix: 'git' })
    expect(await removeWorkspace(r.workspace.id, broken(1, XCODE, (a) => a.includes('worktree') && a.includes('remove')))).toEqual({ error: 'git no funciona en este Mac.', detail: XCODE, fix: 'git' })
    expect(existsSync(r.workspace.path)).toBe(true)
    expect((await readRecords()).map((w) => w.id)).toEqual([r.workspace.id])

    // In place: the copy is never switched.
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo, override: 'in-place' }] }))
    const before = git(repo, 'branch', '--show-current').trim()
    expect(await opening('feat/ip', broken(1, XCODE, (a) => a.includes('switch')))).toEqual({ error: 'git no funciona en este Mac.', detail: XCODE, fix: 'git' })
    expect(await opening('feat/ip', broken(1, XCODE, (a) => a.includes('status')))).toEqual({ error: 'git no funciona en este Mac.', detail: XCODE, fix: 'git' })
    expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
  }, 40_000)

  it('refuses to remove a dirty worktree', async () => {
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/dirty', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    writeFileSync(join(r.workspace.path, 'wip.txt'), 'uncommitted')

    const out = await removeWorkspace(r.workspace.id)

    expect(out).toEqual({ error: 'feat/dirty tiene 1 cambio sin commitear: no lo cierro para no perderlos.', detail: '?? wip.txt', fix: 'terminal' })
    expect(existsSync(join(r.workspace.path, 'wip.txt'))).toBe(true)
    expect(vi.isMockFunction(removeWorkspace)).toBe(false)

    // Many changes: the count is whole, the detail stops at 20 lines.
    for (let n = 0; n < 24; n++) writeFileSync(join(r.workspace.path, `more${n}.txt`), 'x')
    const many = await removeWorkspace(r.workspace.id)
    if (!('error' in many)) throw new Error('removed a dirty worktree')
    expect(many.error).toBe('feat/dirty tiene 25 cambios sin commitear: no lo cierro para no perderlos.')
    expect(many.detail!.split('\n')).toHaveLength(20)
    expect((await readRecords()).map((w) => w.id)).toEqual([r.workspace.id])
  })

  it('a failing step when opening says which and folds its output', async () => {
    const opening = (branch: string, runner: Runner, extra: object = {}) => openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: SLEEP, ...extra }, runner)

    // Fetching a branch the remote does not have (real git).
    const bare = tmp()
    git(bare, 'init', '--bare', '-q')
    git(repo, 'remote', 'add', 'origin', bare)
    const fetch = await opening('feat/nowhere', run, { existing: true, remote: 'origin' })
    if (!('error' in fetch)) throw new Error('opened a missing branch')
    expect(fetch.error).toBe('No he podido traer feat/nowhere de origin.')
    expect(fetch.detail).toMatch(/feat\/nowhere/)
    expect(fetch.fix).toBe('terminal')

    // The branch held by another folder, in git's own words.
    const held = await opening('feat/held', failing((c, a) => a.includes('worktree') && a.includes('add'), "fatal: 'feat/held' is already used by worktree at '/elsewhere'"))
    expect(held).toEqual({ error: 'La rama feat/held ya está abierta en otra carpeta.', detail: "fatal: 'feat/held' is already used by worktree at '/elsewhere'", fix: 'terminal' })

    // Any other worktree failure (real git: the folder is already there).
    mkdirSync(join(home, 'wt', 'demo', 'feat', 'full'), { recursive: true })
    writeFileSync(join(home, 'wt', 'demo', 'feat', 'full', 'x'), 'x')
    const add = await opening('feat/full', run)
    if (!('error' in add)) throw new Error('opened over a full folder')
    expect(add.error).toBe('git no ha podido crear la carpeta del trabajo.')
    expect(add.detail).toMatch(/already exists/)
    expect(add.fix).toBe('terminal')

    // tmux failing undoes the folder and the branch this attempt made.
    const tmux = await opening('feat/tmux', failing((c, a) => c === 'tmux' && a.includes('new-session'), 'no server running'))
    if (!('error' in tmux)) throw new Error('opened without tmux')
    expect(tmux).toEqual({ error: 'tmux no ha podido arrancar el agente.', detail: expect.stringContaining('no server running'), fix: 'terminal' })
    expect(existsSync(join(home, 'wt', 'demo', 'feat', 'tmux'))).toBe(false)
    expect(git(repo, 'branch', '--list', 'feat/tmux').trim()).toBe('')

    // In place: reading the copy's state and switching it.
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo, override: 'in-place' }] }))
    const before = git(repo, 'branch', '--show-current').trim()
    const status = await opening('feat/st', failing((c, a) => a.includes('status'), 'fatal: index file corrupt'))
    expect(status).toEqual({ error: 'No puedo leer el estado de git de demo.', detail: 'fatal: index file corrupt', fix: 'terminal' })
    const sw = await opening('feat/sw', failing((c, a) => a.includes('switch'), 'fatal: cannot lock ref'))
    expect(sw).toEqual({ error: 'git no me deja pasar tu copia a feat/sw.', detail: 'fatal: cannot lock ref', fix: 'terminal' })
    const ipTmux = await opening('feat/iptmux', failing((c, a) => c === 'tmux' && a.includes('new-session'), 'no server running'))
    expect('error' in ipTmux && ipTmux.error).toBe('tmux no ha podido arrancar el agente.')
    expect(git(repo, 'branch', '--show-current').trim()).toBe(before)
    expect(git(repo, 'branch', '--list', 'feat/iptmux').trim()).toBe('')

    expect(existsSync(join(home, 'workspaces.json'))).toBe(false)
  }, 40_000)

  it('a read-only atril home undoes the open and says so', async () => {
    const sentence = `No puedo escribir en la carpeta de Atril (${home}).`
    const sessions = (): string => {
      try {
        return tmuxOut(sock, 'list-sessions', '-F', '#{session_name}').trim()
      } catch {
        return ''
      }
    }
    try {
      // The worktree's parent cannot be made: nothing was made, so nothing to undo.
      chmodSync(home, 0o555)
      const early = await openWorktree({ repoId: 'demo', branch: 'feat/ro', agent: 'claude', argv: SLEEP })
      expect(early).toEqual({ error: sentence, detail: 'EACCES', fix: 'reveal', file: 'workspaces' })
      expect(git(repo, 'branch', '--list', 'feat/ro').trim()).toBe('')
      chmodSync(home, 0o755)

      // The record cannot be written once the agent is up: the session, the worktree and the branch go.
      const lockAfterStart: Runner = async (cmd, args, opts) => {
        const r = await run(cmd, args, opts)
        if (cmd === 'tmux' && args.includes('respawn-pane')) chmodSync(home, 0o555)
        return r
      }
      const late = await openWorktree({ repoId: 'demo', branch: 'feat/late', agent: 'claude', argv: SLEEP }, lockAfterStart)
      expect(late).toEqual({ error: sentence, detail: 'EACCES', fix: 'reveal', file: 'workspaces' })
      chmodSync(home, 0o755)
      expect(sessions()).toBe('')
      expect(existsSync(join(home, 'wt', 'demo', 'feat', 'late'))).toBe(false)
      expect(git(repo, 'branch', '--list', 'feat/late').trim()).toBe('')
      expect(git(repo, 'worktree', 'list')).not.toContain('feat/late')
      expect(existsSync(join(home, 'workspaces.json'))).toBe(false)

    } finally {
      chmodSync(home, 0o755)
    }
  }, 40_000)

  it('close refusals say what and how to get past', async () => {
    const open = async (branch: string) => {
      const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: SLEEP })
      if (!('workspace' in r)) throw new Error(r.error)
      return r.workspace
    }
    const alive = (session: string): boolean => {
      try {
        tmuxOut(sock, 'has-session', '-t', session)
        return true
      } catch {
        return false
      }
    }

    // The folder is gone: the way past is forgetting it.
    const gone = await open('feat/gone')
    rmSync(gone.path, { recursive: true, force: true })
    expect(await removeWorkspace(gone.id)).toEqual({ error: 'La carpeta de feat/gone ya no existe.', fix: 'forget' })
    expect(alive(gone.session)).toBe(true)

    // The folder is there but git cannot read it.
    const broken = await open('feat/broken')
    rmSync(join(broken.path, '.git'))
    const unreadable = await removeWorkspace(broken.id)
    if (!('error' in unreadable)) throw new Error('removed an unreadable folder')
    expect(unreadable.error).toBe('No puedo leer el estado de git de feat/broken.')
    expect(unreadable.detail).toMatch(/not a git repository/)
    expect(unreadable.fix).toBe('terminal')
    expect(alive(broken.session)).toBe(true)

    // git failing after the agent was stopped keeps the record and says so.
    const late = await open('feat/late')
    const lateOut = await removeWorkspace(late.id, failing((c, a) => a.includes('worktree') && a.includes('remove'), 'fatal: locked'))
    expect(lateOut).toEqual({ error: 'git no ha podido cerrar feat/late; su agente ya está parado.', detail: 'fatal: locked', fix: 'terminal' })
    expect(alive(late.session)).toBe(false)
    expect(existsSync(late.path)).toBe(true)

    expect((await readRecords()).map((w) => w.id)).toEqual([gone.id, broken.id, late.id])
    expect(existsSync(join(home, 'history.jsonl'))).toBe(false)
  }, 40_000)

  it('forgetting a broken work runs no git', async () => {
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/lost', agent: 'claude', auto: true, prompt: 'x', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const ws = r.workspace
    expect(existsSync(join(home, 'auto', ws.session))).toBe(true)
    rmSync(ws.path, { recursive: true, force: true })
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }

    expect(await forgetWorkspace(ws.id, spy)).toEqual({ ok: true })
    expect(calls.filter((c) => c[0] === 'git')).toEqual([['git', '-C', repo, 'worktree', 'prune']])
    expect(await readRecords()).toEqual([])
    expect(() => tmuxOut(sock, 'has-session', '-t', ws.session)).toThrow()
    expect(existsSync(join(home, 'auto', ws.session))).toBe(false)
    expect(existsSync(join(home, 'history.jsonl'))).toBe(false)
    // The branch is free again: no worktree entry holds it.
    expect(git(repo, 'worktree', 'list')).not.toContain(ws.path)
    git(repo, 'branch', '-D', 'feat/lost')

    expect(await forgetWorkspace(ws.id, spy)).toEqual({ error: 'Ese trabajo ya no existe' })
  })

  it('terminal opens only a known folder, quoted', async () => {
    const odd = join(tmp(), `we'ird "q" \\b`)
    mkdirSync(odd)
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo }, { id: 'odd', path: odd }] }))
    const scripts: string[] = []
    const spy: Runner = (cmd, args, opts) => {
      if (cmd !== 'osascript') return run(cmd, args, opts)
      scripts.push(args.at(-1)!)
      return Promise.resolve({ code: 0, stdout: '', stderr: '' })
    }
    // What Terminal runs, read back out of the AppleScript string and with `pwd` for `git status`.
    const landsIn = (script: string): string => {
      const cmd = /do script "(.*)"$/s.exec(script)![1]!.replace(/\\(["\\])/g, '$1')
      expect(cmd.endsWith(' && git status')).toBe(true)
      return execFileSync('sh', ['-c', cmd.replace(/ && git status$/, ' && pwd')], { encoding: 'utf8' }).trim()
    }

    expect(await terminalAt({ repoId: 'odd' }, spy)).toEqual({ ok: true })
    expect(landsIn(scripts[0]!)).toBe(odd)

    const ws = await openWorktree({ repoId: 'demo', branch: 'feat/term', agent: 'claude', argv: SLEEP })
    if (!('workspace' in ws)) throw new Error(ws.error)
    expect(await terminalAt({ id: ws.workspace.id }, spy)).toEqual({ ok: true })
    expect(landsIn(scripts[1]!)).toBe(ws.workspace.path)

    for (const target of [{ repoId: 'nope' }, { id: 'nope' }, { repoId: 5 }, { id: odd }, null] as unknown as Parameters<typeof terminalAt>[0][]) {
      expect('error' in (await terminalAt(target, spy))).toBe(true)
    }
    expect(scripts).toHaveLength(2)
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
      expect(refused).toEqual({ error: 'Tu copia está en other-work, no en feat/hand: vuelve a feat/hand antes de cerrar.', fix: 'terminal' })
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
      expect(refused).toEqual({ error: 'feat/ip tiene 1 cambio sin commitear: no lo cierro para no perderlos.', detail: '?? wip.txt', fix: 'terminal' })
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
    expect('error' in missing && missing.error).toBe('No he podido traer feat/nowhere de origin.')
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

  describe('reopen', () => {
    const flag = (argv: string[], name: string): string | undefined => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
    const sessionUp = (session: string): boolean => {
      try {
        tmuxOut(sock, 'has-session', '-t', `=${session}`)
        return true
      } catch {
        return false
      }
    }

    it('a stopped work reopens where it was', async () => {
      const spy = agentSpy(run)
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/back', agent: 'claude', model: 'sonnet', effort: 'low', auto: true }, spy.run)
      if (!('workspace' in r)) throw new Error(r.error)
      const { id, session, path } = r.workspace
      const marker = join(home, 'auto', session)
      expect(existsSync(marker)).toBe(true)

      // No session and no transcript: the same model and effort, from scratch, in the same folder.
      tmuxOut(sock, 'kill-session', '-t', `=${session}`)
      const plain = await reopenWorkspace(id, {}, spy.run)
      if (!('workspace' in plain)) throw new Error(plain.error)
      const fresh = spy.argvs.at(-1)!
      expect(fresh).not.toContain('--continue')
      expect(flag(fresh, '--model')).toBe('sonnet')
      expect(flag(fresh, '--effort')).toBe('low')
      expect(plain.workspace).toMatchObject({ id, session, path, alive: true, effort: 'low' })
      expect(tmuxOut(sock, 'display-message', '-p', '-t', `=${session}:`, '#{pane_id} #{pane_current_path}').trim()).toBe(`${plain.workspace.paneId} ${path}`)
      expect((await readRecords())[0]!.paneId).toBe(plain.workspace.paneId)
      expect(existsSync(marker)).toBe(true)

      // A transcript recorded: --continue right after the plugin dir, before model and effort; more lifts low to medium.
      tmuxOut(sock, 'kill-session', '-t', `=${session}`)
      mkdirSync(join(home, 'transcripts'), { recursive: true })
      writeFileSync(join(home, 'transcripts', session), '/x/conversation.jsonl\n')
      const more = await reopenWorkspace(id, { more: true }, spy.run)
      if (!('workspace' in more)) throw new Error(more.error)
      const cont = spy.argvs.at(-1)!
      expect(cont.indexOf('--continue')).toBe(cont.indexOf('--plugin-dir') + 2)
      expect(cont.indexOf('--continue')).toBeLessThan(cont.indexOf('--model'))
      expect(flag(cont, '--effort')).toBe('medium')
      expect(more.workspace.effort).toBe('medium')
      expect((await readRecords())[0]!.effort).toBe('medium')

      // The ladder: none and medium go to high, high to xhigh.
      for (const [from, to] of [[undefined, 'high'], ['default', 'high'], ['medium', 'high'], ['high', 'xhigh']] as Array<[Effort | undefined, Effort]>) {
        tmuxOut(sock, 'kill-session', '-t', `=${session}`)
        const rec = { ...(await readRecords())[0]! }
        delete rec.effort
        await writeRecords([from === undefined ? rec : { ...rec, effort: from }])
        const up = await reopenWorkspace(id, { more: true }, spy.run)
        if (!('workspace' in up)) throw new Error(up.error)
        expect(flag(spy.argvs.at(-1)!, '--effort')).toBe(to)
        expect((await readRecords())[0]!.effort).toBe(to)
      }

      // W16: the session alive but the agent's pane dead is stopped too; that session is ended first, never two.
      const deadPane = (await readRecords())[0]!.paneId
      tmuxOut(sock, 'respawn-pane', '-k', '-t', deadPane, 'true')
      for (let n = 0; n < 50 && tmuxOut(sock, 'display', '-p', '-t', deadPane, '#{pane_dead}').trim() !== '1'; n++) await new Promise((ok) => setTimeout(ok, 50))
      const again = await reopenWorkspace(id, {}, spy.run)
      if (!('workspace' in again)) throw new Error(again.error)
      expect(tmuxOut(sock, 'list-sessions', '-F', '#{session_name}').trim().split('\n')).toEqual([session])
      expect(tmuxOut(sock, 'list-panes', '-s', '-t', `=${session}`, '-F', '#{pane_id} #{pane_dead}').trim()).toBe(`${again.workspace.paneId} 0`)
      expect(existsSync(marker)).toBe(true)

      // Two reopens at once (a reloaded window): one starts the agent, the other is told it is open, never two sessions.
      tmuxOut(sock, 'kill-session', '-t', `=${session}`)
      const both = await Promise.all([reopenWorkspace(id, {}, spy.run), reopenWorkspace(id, {}, spy.run)])
      expect(both.filter((r) => 'workspace' in r)).toHaveLength(1)
      expect(both.find((r) => 'error' in r)).toEqual({ error: 'Este trabajo ya está abierto.' })
      expect(tmuxOut(sock, 'list-sessions', '-F', '#{session_name}').trim().split('\n')).toEqual([session])
      expect(tmuxOut(sock, 'list-panes', '-s', '-t', `=${session}`, '-F', '#{pane_dead}').trim()).toBe('0')
    }, 40_000)

    it('reopening refuses what it cannot do', async () => {
      const spy = agentSpy(run)
      const calls: string[][] = []
      const counting: Runner = (cmd, args, opts) => {
        calls.push([cmd, ...args])
        return spy.run(cmd, args, opts)
      }
      const starts = (): number => calls.filter((c) => c.includes('new-session')).length
      const r = await openWorktree({ repoId: 'demo', branch: 'feat/no', agent: 'claude', effort: 'xhigh' }, spy.run)
      if (!('workspace' in r)) throw new Error(r.error)
      const { id, session } = r.workspace

      expect(await reopenWorkspace('nope0000', {}, counting)).toEqual({ error: 'Ese trabajo ya no existe' })
      // A live agent is never restarted.
      expect(await reopenWorkspace(id, {}, counting)).toEqual({ error: 'Este trabajo ya está abierto.' })
      expect(sessionUp(session)).toBe(true)
      tmuxOut(sock, 'kill-session', '-t', `=${session}`)
      expect(await reopenWorkspace(id, { more: true }, counting)).toEqual({ error: 'Ya está en el esfuerzo más alto.' })
      expect(starts()).toBe(0)

      // tmux failing after the session exists: the half-made session goes, the record keeps its pane.
      const before = (await readRecords())[0]!
      const broken = await reopenWorkspace(id, {}, failing((c, a) => c === 'tmux' && a.includes('set-option'), 'bad option'))
      expect(broken).toEqual({ error: 'tmux no ha podido arrancar el agente.', detail: expect.stringContaining('bad option'), fix: 'terminal' })
      expect(sessionUp(session)).toBe(false)
      expect((await readRecords())[0]).toEqual(before)

      // The folder is gone: the way past is forgetting it.
      rmSync(r.workspace.path, { recursive: true, force: true })
      expect(await reopenWorkspace(id, {}, counting)).toEqual({ error: 'La carpeta de feat/no ya no existe.', fix: 'forget' })
      expect(starts()).toBe(0)
      expect(sessionUp(session)).toBe(false)
    }, 40_000)
  })
  it('a new or reopened work is told about lessons only with a real file', async () => {
    const spy = agentSpy(run)
    const told = (argv: string[]): boolean => argv.includes('--append-system-prompt')
    // No lessons in the repo: nothing extra.
    const plain = await openWorktree({ repoId: 'demo', branch: 'feat/plain', agent: 'claude' }, spy.run)
    if (!('workspace' in plain)) throw new Error(plain.error)
    expect(told(spy.argvs.at(-1)!)).toBe(false)
    // A real lessons file, committed: a new work is told, and so is its reopen.
    mkdirSync(join(repo, '.agents'), { recursive: true })
    writeFileSync(join(repo, '.agents', 'lessons.md'), '## 2026-11-11 · x\nno repetir\n')
    git(repo, 'add', '.')
    git(repo, 'commit', '-qm', 'lessons')
    const kept = await openWorktree({ repoId: 'demo', branch: 'feat/kept', agent: 'claude' }, spy.run)
    if (!('workspace' in kept)) throw new Error(kept.error)
    expect(told(spy.argvs.at(-1)!)).toBe(true)
    tmuxOut(sock, 'kill-session', '-t', `=${kept.workspace.session}`)
    const again = await reopenWorkspace(kept.workspace.id, {}, spy.run)
    if (!('workspace' in again)) throw new Error(again.error)
    expect(told(spy.argvs.at(-1)!)).toBe(true)
    // A link is never followed.
    const linked = join(kept.workspace.path, '.agents', 'lessons.md')
    rmSync(linked)
    symlinkSync('/etc/hosts', linked)
    tmuxOut(sock, 'kill-session', '-t', `=${kept.workspace.session}`)
    const viaLink = await reopenWorkspace(kept.workspace.id, {}, spy.run)
    if (!('workspace' in viaLink)) throw new Error(viaLink.error)
    expect(told(spy.argvs.at(-1)!)).toBe(false)
    // Nor is a linked .agents folder.
    const agents = join(kept.workspace.path, '.agents')
    const elsewhere = join(home, 'elsewhere')
    mkdirSync(elsewhere, { recursive: true })
    writeFileSync(join(elsewhere, 'lessons.md'), 'x\n')
    rmSync(agents, { recursive: true, force: true })
    symlinkSync(elsewhere, agents)
    tmuxOut(sock, 'kill-session', '-t', `=${kept.workspace.session}`)
    const viaDir = await reopenWorkspace(kept.workspace.id, {}, spy.run)
    if (!('workspace' in viaDir)) throw new Error(viaDir.error)
    expect(told(spy.argvs.at(-1)!)).toBe(false)
  }, 60_000)
})

describe('the base of a new work', () => {
  /** origin with `main`; main then moves on origin; the person's checkout sits on an older branch of its own. */
  function drifted(): { bare: string; ahead: string; stale: string } {
    const bare = tmp()
    git(bare, 'init', '--bare', '-q', '-b', 'main')
    git(repo, 'branch', '-M', 'main')
    git(repo, 'remote', 'add', 'origin', bare)
    git(repo, 'push', '-q', 'origin', 'main')
    git(repo, 'fetch', '-q', 'origin')
    git(repo, 'remote', 'set-head', 'origin', 'main')
    const other = tmp()
    git(other, 'clone', '-q', bare, '.')
    writeFileSync(join(other, 'merged.txt'), 'landed on main')
    git(other, 'add', '.')
    git(other, 'commit', '-q', '-m', 'landed')
    git(other, 'push', '-q', 'origin', 'main')
    const ahead = git(other, 'rev-parse', 'HEAD').trim()
    git(repo, 'switch', '-q', '-c', 'crash-reports')
    writeFileSync(join(repo, 'stale.txt'), 'old work')
    git(repo, 'add', '.')
    git(repo, 'commit', '-q', '-m', 'stale')
    return { bare, ahead, stale: git(repo, 'rev-parse', 'HEAD').trim() }
  }
  const tracking = (path: string, branch: string): string => {
    try {
      return git(path, 'config', `branch.${branch}.merge`).trim()
    } catch {
      return ''
    }
  }

  it("a new work branches from origin's default branch, not the local checkout", async () => {
    const { ahead, stale } = drifted()
    const calls: Array<{ args: string[]; timeoutMs?: number }> = []
    const spy: Runner = (cmd, args, opts) => {
      if (cmd === 'git') calls.push({ args, timeoutMs: opts?.timeoutMs })
      return run(cmd, args, opts)
    }
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/fresh', agent: 'claude', argv: SLEEP }, spy)
    if (!('workspace' in r)) throw new Error(r.error)

    expect(calls.find((c) => c.args.includes('fetch'))).toEqual({ args: ['-C', repo, 'fetch', 'origin'], timeoutMs: 15_000 })
    expect(git(r.workspace.path, 'rev-parse', 'HEAD').trim()).toBe(ahead)
    expect(existsSync(join(r.workspace.path, 'merged.txt'))).toBe(true)
    expect(existsSync(join(r.workspace.path, 'stale.txt'))).toBe(false)
    expect(r.workspace.baseCommit).toBe(ahead)
    expect(r.workspace.baseRef).toBe('origin/main')
    // A branch tracking main under another name would aim a plain push at main.
    expect(tracking(repo, 'feat/fresh')).toBe('')
    expect(git(repo, 'branch', '--show-current').trim()).toBe('crash-reports')
    expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(stale)
  }, 30_000)

  it("an in-place new work starts from origin's default branch", async () => {
    const { ahead } = drifted()
    writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'demo', path: repo, override: 'in-place' }] }))
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/here', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)

    expect(git(repo, 'branch', '--show-current').trim()).toBe('feat/here')
    expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(ahead)
    expect(r.workspace.baseCommit).toBe(ahead)
    expect(r.workspace.baseRef).toBe('origin/main')
    expect(r.workspace.previousBranch).toBe('crash-reports')
    expect(tracking(repo, 'feat/here')).toBe('')
  }, 30_000)

  it('without a reachable origin a new work uses the last fetched default branch or the local HEAD', async () => {
    const { bare } = drifted()
    const lastFetched = git(repo, 'rev-parse', 'origin/main').trim()
    // origin/HEAD gone too: origin/main is the second place to look.
    git(repo, 'remote', 'set-head', 'origin', '-d')
    rmSync(bare, { recursive: true, force: true })
    const offline = await openWorktree({ repoId: 'demo', branch: 'feat/offline', agent: 'claude', argv: SLEEP })
    if (!('workspace' in offline)) throw new Error(offline.error)
    expect(git(offline.workspace.path, 'rev-parse', 'HEAD').trim()).toBe(lastFetched)
    expect(offline.workspace.baseRef).toBe('origin/main')

    // A fetch that times out counts as failed, the same way.
    const slow: Runner = (cmd, args, opts) => (args.includes('fetch') ? Promise.resolve({ code: 124, stdout: '', stderr: 'timed out' }) : run(cmd, args, opts))
    const timedOut = await openWorktree({ repoId: 'demo', branch: 'feat/slow', agent: 'claude', argv: SLEEP }, slow)
    if (!('workspace' in timedOut)) throw new Error(timedOut.error)
    expect(timedOut.workspace.baseCommit).toBe(lastFetched)

    // No origin at all: the local HEAD, as before, and no baseRef.
    git(repo, 'remote', 'remove', 'origin')
    const head = git(repo, 'rev-parse', 'HEAD').trim()
    const local = await openWorktree({ repoId: 'demo', branch: 'feat/local', agent: 'claude', argv: SLEEP })
    if (!('workspace' in local)) throw new Error(local.error)
    expect(local.workspace.baseCommit).toBe(head)
    expect(local.workspace.baseRef).toBeUndefined()
  }, 40_000)
})

describe('the base a work is measured from', () => {
  afterEach(() => {
    for (const p of openWatchers()) closeQuiet(p)
  })

  it('workBase answers where the work left its base ref and spawns nothing while quiet', async () => {
    const w = workThatMergedMain(900, 100)
    let spawns = 0
    const spy: Runner = (cmd, args, opts) => {
      spawns++
      return run(cmd, args, opts)
    }
    const rec = { path: w.path, baseCommit: w.base, baseRef: 'origin/main' }
    expect(await workBase(rec, spy)).toBe(w.main)
    await new Promise((ok) => setTimeout(ok, 300))
    spawns = 0
    expect(await workBase(rec, spy)).toBe(w.main)
    expect(spawns).toBe(0)

    // No baseRef: baseCommit, without asking git. A ref that does not resolve: baseCommit too.
    expect(await workBase({ path: w.path, baseCommit: w.base }, spy)).toBe(w.base)
    expect(spawns).toBe(0)
    expect(await workBase({ path: w.path, baseCommit: w.base, baseRef: 'origin/gone' }, spy)).toBe(w.base)
  }, 30_000)

  it("the panel's total counts from the same base as the hook", async () => {
    const { branchSize } = await import('../../resources/branchsize.mjs')
    const w = workThatMergedMain(900, 100)
    const rec = { path: w.path, baseCommit: w.base, baseRef: 'origin/main' }
    // own.txt's 100 lines; main.txt's 900 came in through the merge.
    expect((await panelBoxes(rec, undefined)).total).toBe(100)
    expect(branchSize(w.path, await workBase(rec))).toBe(100)
  }, 30_000)
})

describe('a merged work', () => {
  const record = (id: string, branch: string, baseCommit: string, extra: object = {}) => ({
    id,
    repoId: 'demo',
    branch,
    mode: 'worktree',
    path: join(home, 'wt', 'demo', branch),
    baseCommit,
    agent: 'claude',
    session: `atril-${id}`,
    paneId: '%1',
    ...extra
  })

  it('a merged notice marks its work merged and nothing else', async () => {
    const head = git(repo, 'rev-parse', 'HEAD').trim()
    await writeRecords([record('w1', 'feat/one', head), record('w2', 'feat/two', head), record('w3', 'feat/three', head)] as never)
    const notice = (kind: 'merged' | 'closed', branch: string) => ({ id: `n-${kind}-${branch}`, kind, at: 1, read: false, title: 't', branch, project: 'acme/shop', url: 'https://example.test/pr/1' })
    // W187's match, stubbed: feat/one and feat/two have a work; the unknown branch does not.
    const closable = vi.fn(async (a: { branch?: string }) => ({ 'feat/one': 'w1', 'feat/two': 'w2' })[a.branch ?? ''] as string | undefined)
    await markMergedFrom([notice('merged', 'feat/one'), notice('closed', 'feat/two'), notice('merged', 'feat/nowhere')] as never, closable)

    const merged = Object.fromEntries((await readRecords()).map((r) => [r.id, r.merged === true]))
    expect(merged).toEqual({ w1: true, w2: false, w3: false })
    // A closed notice is never even matched.
    expect(closable.mock.calls.map(([a]) => a.branch)).toEqual(['feat/one', 'feat/nowhere'])
  })

  it("a new work's fetch marks siblings whose branch already landed", async () => {
    const bare = tmp()
    git(bare, 'init', '--bare', '-q', '-b', 'main')
    git(repo, 'branch', '-M', 'main')
    git(repo, 'remote', 'add', 'origin', bare)
    git(repo, 'push', '-q', 'origin', 'main')
    const base = git(repo, 'rev-parse', 'HEAD').trim()
    const branchWith = (name: string): void => {
      git(repo, 'switch', '-q', '-c', name, base)
      writeFileSync(join(repo, `${name.replace('/', '-')}.txt`), name)
      git(repo, 'add', '.')
      git(repo, 'commit', '-q', '-m', name)
      git(repo, 'switch', '-q', 'main')
    }
    branchWith('feat/landed')
    branchWith('feat/open')
    git(repo, 'branch', 'feat/empty', base)
    // feat/landed reaches origin's main through a merge made elsewhere.
    git(repo, 'push', '-q', 'origin', 'feat/landed:main')
    await writeRecords([
      record('w1', 'feat/landed', base),
      record('w2', 'feat/open', base),
      record('w3', 'feat/empty', base),
      record('w4', 'feat/missing', base),
      record('w5', 'feat/landed', base, { mode: 'review' })
    ] as never)

    const r = await openWorktree({ repoId: 'demo', branch: 'feat/next', agent: 'claude', argv: SLEEP })
    if (!('workspace' in r)) throw new Error(r.error)
    const merged = Object.fromEntries((await readRecords()).map((x) => [x.id, x.merged === true]))
    expect(merged).toEqual({ w1: true, w2: false, w3: false, w4: false, w5: false, [r.workspace.id]: false })

    // A fetch that fails marks nothing.
    await writeRecords((await readRecords()).map((x) => ({ ...x, merged: undefined })))
    const offline: Runner = (cmd, args, opts) => (args.includes('fetch') ? Promise.resolve({ code: 128, stdout: '', stderr: 'unreachable' }) : run(cmd, args, opts))
    const again = await openWorktree({ repoId: 'demo', branch: 'feat/later', agent: 'claude', argv: SLEEP }, offline)
    if (!('workspace' in again)) throw new Error(again.error)
    expect((await readRecords()).some((x) => x.merged)).toBe(false)
  }, 40_000)
})
