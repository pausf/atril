import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectMode, listRepos, registerRepo, setOverride } from './repos'
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

  it('chooses in-place when an ignored config file exists', async () => {
    const root = makeRepo([...NOISE, 'web/config.local'], [...NOISE_FILES, 'web/config.local'], ['web/index.html'])
    const d = await detectMode(root, run)
    expect(d.mode).toBe('in-place')
    expect(d.reason).toContain('web/config.local')
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
    const after = (await listRepos(run))[0]!
    expect(after.mode).toBe('in-place')
    expect(after.reason).toBe('elegido por ti')
  })
})
