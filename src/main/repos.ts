import { existsSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { AddRepoResult, Listed, Mode, RepoHealth, RepoResult, RepoView, StateProblem } from '../preload/api'
import type { Runner } from './run'
import { orProblem, readState as readStrict, statePath } from './state'
import { t } from './lang'

export interface Repo {
  id: string
  path: string
  override?: Mode
}
export interface Detected {
  mode: Mode
  reason: string
}

const DEP_DIRS = new Set(['node_modules', 'vendor'])
// ponytail: 2 GB of node_modules + vendor is a guess, not a measurement. Wrong for a repo whose
// install is slow but small; the per-repo override covers it until a better signal exists.
const HEAVY_DEPS_KB = 2 * 1024 * 1024
const ID_RE = /^[a-z0-9-]+$/

const segments = (entry: string): string[] => entry.split('/').filter(Boolean)

interface State {
  repos: Repo[]
  /** "<PROJECT>|<first component or ''>" → repo id */
  jiraRepos: Record<string, string>
}

// W148: a damaged file throws StateError; nothing below writes over it.
async function readState(): Promise<State> {
  const raw = await readStrict('repos')
  return { repos: raw.repos, jiraRepos: raw.jiraRepos ?? {} }
}

async function writeState(state: State): Promise<void> {
  await readState()
  const file = statePath('repos')
  await mkdir(join(file, '..'), { recursive: true })
  const { jiraRepos, repos } = state
  // Same as workspaces.json: a reader during the write must see the old file or the new one, never half.
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, JSON.stringify(Object.keys(jiraRepos).length ? { repos, jiraRepos } : { repos }, null, 2) + '\n')
  await rename(temp, file)
}

export const readRepos = async (): Promise<Repo[]> => (await readState()).repos
// Rewriting the repo list must never drop the Jira memory that lives in the same file.
const writeRepos = async (repos: Repo[]): Promise<void> => writeState({ ...(await readState()), repos })

export async function rememberedRepo(key: string): Promise<string | undefined> {
  return (await readState()).jiraRepos[key]
}

export async function rememberRepo(key: string, repoId: string): Promise<void> {
  const state = await readState()
  await writeState({ ...state, jiraRepos: { ...state.jiraRepos, [key]: repoId } })
}

export async function detectMode(path: string, run: Runner): Promise<Detected> {
  const r = await run('git', ['-C', path, 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory'])
  const ignored = r.stdout.split('\n').filter(Boolean)

  // W2: an ignored file never decides the mode; the ignored list is read only to size dependency folders (W3).
  const depDirs = ignored.filter((e) => DEP_DIRS.has(segments(e).at(-1) ?? '')).map((e) => join(path, e))
  if (depDirs.length > 0) {
    const du = await run('du', ['-sk', ...depDirs])
    // du may exit non-zero on a vanished dir yet still print the rest
    const kb = du.stdout
      .split('\n')
      .filter(Boolean)
      .reduce((sum, line) => sum + (parseInt(line, 10) || 0), 0)
    if (kb > HEAVY_DEPS_KB) {
      return { mode: 'in-place', reason: t('node_modules and vendor weigh {gb} GB', { gb: (kb / 1024 / 1024).toFixed(1) }) }
    }
  }
  return { mode: 'worktree', reason: t('no signal: each workspace in its own worktree') }
}

export function effectiveMode(repo: Repo, detected: Detected): Detected {
  return repo.override ? { mode: repo.override, reason: t('chosen by you') } : detected
}

/** W154: a git that cannot run leaves `ok`; only git's own «not a git repository» says the folder is not one. */
export async function repoHealth(path: string, run: Runner): Promise<RepoHealth | { broken: string }> {
  if (!existsSync(path)) return 'missing'
  const r = await run('git', ['-C', path, 'rev-parse', '--git-dir'])
  if (r.code === 0) return 'ok'
  if (gitBroken(r)) return { broken: r.stderr.trim() }
  return r.stderr.includes('not a git repository') ? 'not-git' : 'ok'
}

/** W156: git missing (127) or only the Xcode stub answering. */
export const gitBroken = (r: { code: number; stderr: string }): boolean => r.code === 127 || r.stderr.includes('xcode-select')

async function view(repo: Repo, run: Runner): Promise<RepoView> {
  const h = await repoHealth(repo.path, run)
  const health = typeof h === 'string' ? h : 'ok'
  if (health !== 'ok') return { ...repo, mode: repo.override ?? 'worktree', reason: '', health }
  const eff = effectiveMode(repo, repo.override ? { mode: repo.override, reason: '' } : await detectMode(repo.path, run))
  return { ...repo, ...eff, health }
}

export const registerRepo = (path: string, run: Runner, opts: { id?: string } = {}): Promise<AddRepoResult> => orProblem(() => register(path, run, opts))

async function register(path: string, run: Runner, opts: { id?: string }): Promise<AddRepoResult> {
  const top = await run('git', ['-C', path, 'rev-parse', '--show-toplevel'])
  if (top.code !== 0) return { error: 'not-a-git-repo' }
  const toplevel = top.stdout.trim()

  const repos = await readRepos()
  const existing = repos.find((r) => r.path === toplevel)
  if (existing) return { repo: await view(existing, run) }

  if (opts.id !== undefined && !ID_RE.test(opts.id)) return { error: 'invalid-id' }
  const id = opts.id ?? basename(toplevel).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!ID_RE.test(id)) return { error: 'invalid-id' }
  if (repos.some((r) => r.id === id)) {
    let n = 2
    while (repos.some((r) => r.id === `${id}-${n}`)) n++
    return { error: 'id-taken', suggested: `${id}-${n}` }
  }

  const repo: Repo = { id, path: toplevel }
  await writeRepos([...repos, repo])
  return { repo: await view(repo, run) }
}

export const setOverride = async (id: string, mode: Mode | null): Promise<StateProblem | undefined> =>
  orProblem(async () => {
    const repos = await readRepos()
    await writeRepos(
      repos.map((r) => {
        if (r.id !== id) return r
        const next: Repo = { id: r.id, path: r.path }
        if (mode) next.override = mode
        return next
      })
    )
    return undefined
  })

/** W157: only the entry goes; the folder, its branches and the Jira memory stay. */
export const removeRepo = (id: string): Promise<RepoResult> =>
  orProblem(async () => {
    const works = (await readStrict('workspaces')).workspaces
    const state = await readState()
    if (!state.repos.some((r) => r.id === id)) return { error: t('There is no repo “{id}”', { id }) }
    if (works.some((w) => w.repoId === id)) return { error: t('{repo} has open works: close them first.', { repo: id }) }
    await writeState({ ...state, repos: state.repos.filter((r) => r.id !== id) })
    return { ok: true as const }
  })

/** W158: `pick` is main's folder dialog; null (cancelled) changes nothing. */
export async function relocateRepo(id: string, pick: () => Promise<string | null>, run: Runner): Promise<RepoResult | null> {
  const path = await pick()
  if (path === null) return null
  return orProblem(async () => {
    const top = await run('git', ['-C', path, 'rev-parse', '--show-toplevel'])
    if (top.code !== 0) return { error: t('That folder is not a git repository.') }
    const toplevel = top.stdout.trim()
    const state = await readState()
    if (!state.repos.some((r) => r.id === id)) return { error: t('There is no repo “{id}”', { id }) }
    const taken = state.repos.find((r) => r.path === toplevel && r.id !== id)
    if (taken) return { error: t('That folder is already the repo {id}.', { id: taken.id }) }
    await writeState({ ...state, repos: state.repos.map((r) => (r.id === id ? { ...r, path: toplevel } : r)) })
    return { ok: true as const }
  })
}

export async function listRepos(run: Runner): Promise<Listed<RepoView>> {
  const repos = await orProblem(readRepos)
  return Array.isArray(repos) ? Promise.all(repos.map((r) => view(r, run))) : { problem: repos }
}
