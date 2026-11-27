import type { RepoView } from '../preload/api'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectMode, listRepos, registerRepo, relocateRepo, rememberRepo, removeRepo, setOverride } from './repos'
import { run, type Runner } from './run'

const made: string[] = []
const tmp = (): string => {
  const d = realpathSync(mkdtempSync(join(tmpdir(), 'atril-repos-')))
  made.push(d)
  return d
}
const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }
  })
}
const put = (root: string, rel: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), 'x')
}
/**
 * Real repo with one commit; `ignore` goes into .gitignore and `files` are created on disk.
 * `tracked` files are committed: git --directory collapses a folder holding only ignored files
 * into one entry, so a fixture needs a tracked sibling to get the entry a real checkout prints.
 */
function makeRepo(ignore: string[], files: string[], tracked: string[] = []): string {
  const root = tmp()
  git(root, 'init', '-q')
  for (const t of ['a.txt', ...tracked]) put(root, t)
  writeFileSync(join(root, '.gitignore'), ignore.join('\n') + '\n')
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'init')
  for (const f of files) put(root, f)
  return root
}

const NOISE = ['node_modules/', '.DS_Store', '*.log']
const NOISE_FILES = ['node_modules/x', '.DS_Store', 'debug.log']

let prevHome: string | undefined
beforeEach(() => {
  prevHome = process.env['ATRIL_HOME']
  process.env['ATRIL_HOME'] = tmp()
})
afterEach(() => {
  if (prevHome === undefined) delete process.env['ATRIL_HOME']
  else process.env['ATRIL_HOME'] = prevHome
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('repos', () => {
  it('chooses worktree when no signal', async () => {
    // Ignored folders such as build output or tool caches are not a signal: only files are.
    const root = makeRepo([...NOISE, 'out/', '.claude/'], [...NOISE_FILES, 'out/main.js', '.claude/x.json'])
    const d = await detectMode(root, run)
    expect(d.mode).toBe('worktree')
    expect(d.reason).toContain('ninguna señal')
  })

  it('an ignored file never chooses in-place', async () => {
    const root = makeRepo([...NOISE, 'web/config.local', '.env'], [...NOISE_FILES, 'web/config.local', '.env'], ['web/index.html'])
    const d = await detectMode(root, run)
    expect(d.mode).toBe('worktree')
    expect(d.reason).not.toContain('config.local')
  })

  it('a media file ignored by pattern leaves the repo in worktree', async () => {
    const root = makeRepo(['caso-*'], ['caso-1-stripe.gif'])
    const d = await detectMode(root, run)
    expect(d.mode).toBe('worktree')
    expect(d.reason).toBe('ninguna señal: cada trabajo en su propio worktree')
  })

  it('heavy dependencies still win beside an ignored file', async () => {
    const root = makeRepo([...NOISE, 'caso-*'], ['packages/a/node_modules/x', 'caso-1-stripe.gif'], ['packages/a/index.js'])
    const fakeDu: Runner = (cmd, args, opts) =>
      cmd === 'du'
        ? Promise.resolve({ code: 0, stdout: `${3 * 1024 * 1024}\t${args[args.length - 1]}\n`, stderr: '' })
        : run(cmd, args, opts)
    const d = await detectMode(root, fakeDu)
    expect(d.mode).toBe('in-place')
    expect(d.reason).toContain('node_modules y vendor pesan')
    expect(d.reason).not.toContain('caso-1')
  })

  it('chooses in-place when dependencies are heavy', async () => {
    const root = makeRepo(NOISE, ['packages/a/node_modules/x'], ['packages/a/index.js'])
    const calls: string[][] = []
    const fakeDu: Runner = (cmd, args, opts) => {
      if (cmd !== 'du') return run(cmd, args, opts)
      calls.push(args)
      return Promise.resolve({ code: 0, stdout: `${3 * 1024 * 1024}\t${args[args.length - 1]}\n`, stderr: '' })
    }
    const d = await detectMode(root, fakeDu)
    expect(calls).toHaveLength(1)
    expect(d.mode).toBe('in-place')
    expect(d.reason).toContain('node_modules y vendor pesan')
  })

  it('person override wins over detection', async () => {
    const root = makeRepo(NOISE, NOISE_FILES)
    const added = await registerRepo(root, run)
    if (!('repo' in added)) throw new Error('register failed')
    expect(added.repo.mode).toBe('worktree')

    await setOverride(added.repo.id, 'in-place')

    // a fresh call re-reads repos.json from disk, as a restart would
    const after = (await listRepos(run) as RepoView[])[0]!
    expect(after.mode).toBe('in-place')
    expect(after.reason).toBe('elegido por ti')
  })

  it('each repo says whether its folder is there and is git', async () => {
    const ok = makeRepo(NOISE, [])
    const gone = makeRepo(NOISE, [])
    const plain = makeRepo(NOISE, [])
    for (const [id, path] of [['ok', ok], ['gone', gone], ['plain', plain]] as const) await registerRepo(path, run, { id })
    rmSync(gone, { recursive: true, force: true })
    rmSync(join(plain, '.git'), { recursive: true, force: true })

    const health = async (runner: Runner) => Object.fromEntries((await listRepos(runner) as RepoView[]).map((r) => [r.id, r.health]))
    expect(await health(run)).toEqual({ ok: 'ok', gone: 'missing', plain: 'not-git' })

    // A git that cannot run says nothing about the folder (W156 says it when git is used).
    const xcode: Runner = (cmd, args, opts) =>
      cmd === 'git' ? Promise.resolve({ code: 1, stdout: '', stderr: 'xcode-select: note: No developer tools were found, requesting install.' }) : run(cmd, args, opts)
    expect(await health(xcode)).toEqual({ ok: 'ok', gone: 'missing', plain: 'ok' })
  })

  it('removing a repo forgets it and never touches the folder', async () => {
    const home = process.env['ATRIL_HOME']!
    const root = makeRepo(NOISE, [])
    const other = makeRepo(NOISE, [])
    await registerRepo(root, run, { id: 'shop' })
    await registerRepo(other, run, { id: 'cms' })
    git(root, 'branch', 'feat/keep')
    await rememberRepo('PF|', 'shop')
    const file = join(home, 'repos.json')

    // A work of that repo is open: nothing changes.
    const workspaces = join(home, 'workspaces.json')
    writeFileSync(workspaces, JSON.stringify({ workspaces: [{ id: 'w1', repoId: 'shop', path: '/x', branch: 'b', session: 's' }] }))
    const before = readFileSync(file, 'utf8')
    expect(await removeRepo('shop')).toEqual({ error: 'shop tiene trabajos abiertos: ciérralos antes.' })
    expect(readFileSync(file, 'utf8')).toBe(before)

    // workspaces.json damaged: W144's sentence, nothing changes.
    writeFileSync(workspaces, '{')
    const damaged = await removeRepo('shop')
    expect('error' in damaged && damaged.error).toBe('No puedo leer workspaces.json: está dañado. No abro ni cierro trabajos hasta que se arregle.')
    expect(readFileSync(file, 'utf8')).toBe(before)

    writeFileSync(workspaces, JSON.stringify({ workspaces: [] }))
    expect(await removeRepo('shop')).toEqual({ ok: true })
    expect((await listRepos(run) as RepoView[]).map((r) => r.id)).toEqual(['cms'])
    expect(existsSync(join(root, 'a.txt'))).toBe(true)
    expect(execFileSync('git', ['-C', root, 'branch', '--list', 'feat/keep'], { encoding: 'utf8' })).toContain('feat/keep')
    expect(JSON.parse(readFileSync(file, 'utf8')).jiraRepos).toEqual({ 'PF|': 'shop' })
  })

  it('a repo can be pointed at its new folder', async () => {
    const root = makeRepo(NOISE, [], ['sub/x.txt'])
    const other = makeRepo(NOISE, [])
    await registerRepo(root, run, { id: 'shop' })
    await registerRepo(other, run, { id: 'cms' })
    await setOverride('shop', 'in-place')
    const file = join(process.env['ATRIL_HOME']!, 'repos.json')
    const moved = join(tmp(), 'moved')
    renameSync(root, moved)

    // Cancelled, not git, or already another repo: nothing changes.
    const before = readFileSync(file, 'utf8')
    expect(await relocateRepo('shop', async () => null, run)).toBeNull()
    expect(await relocateRepo('shop', async () => tmp(), run)).toEqual({ error: 'Esa carpeta no es un repositorio git.' })
    expect(await relocateRepo('shop', async () => other, run)).toEqual({ error: 'Esa carpeta ya es el repo cms.' })
    expect(readFileSync(file, 'utf8')).toBe(before)

    // A folder inside the repo stores its top level; id and mode stay.
    expect(await relocateRepo('shop', async () => join(moved, 'sub'), run)).toEqual({ ok: true })
    const shop = (await listRepos(run) as RepoView[]).find((r) => r.id === 'shop')!
    expect(shop).toMatchObject({ id: 'shop', path: moved, override: 'in-place', health: 'ok' })
  })
})
