import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { AddRepoResult, Mode, RepoView } from '../preload/api'
import type { Runner } from './run'
import { atrilHome } from './paths'
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

const NOISE = new Set(['node_modules', 'vendor', 'dist', 'build', '.cache', '.next', 'coverage', 'tmp', '.idea', '.vscode', '.DS_Store'])
const DEP_DIRS = new Set(['node_modules', 'vendor'])
// ponytail: 2 GB of node_modules + vendor is a guess, not a measurement. Wrong for a repo whose
// install is slow but small; the per-repo override covers it until a better signal exists.
const HEAVY_DEPS_KB = 2 * 1024 * 1024
const ID_RE = /^[a-z0-9-]+$/

const segments = (entry: string): string[] => entry.split('/').filter(Boolean)
const stateFile = (): string => join(atrilHome(), 'repos.json')

interface State {
  repos: Repo[]
  /** "<PROJECT>|<first component or ''>" → repo id */
  jiraRepos: Record<string, string>
}

async function readState(): Promise<State> {
  try {
    const raw = JSON.parse(await readFile(stateFile(), 'utf8')) as Partial<State>
    return { repos: raw.repos ?? [], jiraRepos: raw.jiraRepos ?? {} }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { repos: [], jiraRepos: {} }
    throw err
  }
}

async function writeState(state: State): Promise<void> {
  const file = stateFile()
  await mkdir(join(file, '..'), { recursive: true })
  const { jiraRepos, repos } = state
  await writeFile(file, JSON.stringify(Object.keys(jiraRepos).length ? { repos, jiraRepos } : { repos }, null, 2) + '\n')
}

const readRepos = async (): Promise<Repo[]> => (await readState()).repos
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

  // Only files are a signal (.env, web/config.local); ignored folders are build output and caches.
  const survivor = ignored.find((e) => !e.endsWith('/') && !segments(e).some((s) => NOISE.has(s)) && !e.endsWith('.log'))
  if (survivor) return { mode: 'in-place', reason: t('{path} no está versionado', { path: survivor }) }

  const depDirs = ignored.filter((e) => DEP_DIRS.has(segments(e).at(-1) ?? '')).map((e) => join(path, e))
  if (depDirs.length > 0) {
    const du = await run('du', ['-sk', ...depDirs])
    // du may exit non-zero on a vanished dir yet still print the rest
    const kb = du.stdout
      .split('\n')
      .filter(Boolean)
      .reduce((sum, line) => sum + (parseInt(line, 10) || 0), 0)
    if (kb > HEAVY_DEPS_KB) {
      return { mode: 'in-place', reason: t('node_modules y vendor pesan {gb} GB', { gb: (kb / 1024 / 1024).toFixed(1) }) }
    }
  }
  return { mode: 'worktree', reason: t('ninguna señal: cada trabajo en su propio worktree') }
}

export function effectiveMode(repo: Repo, detected: Detected): Detected {
  return repo.override ? { mode: repo.override, reason: t('elegido por ti') } : detected
}

async function view(repo: Repo, run: Runner): Promise<RepoView> {
  const eff = effectiveMode(repo, repo.override ? { mode: repo.override, reason: '' } : await detectMode(repo.path, run))
  return { ...repo, ...eff }
}

export async function registerRepo(path: string, run: Runner, opts: { id?: string } = {}): Promise<AddRepoResult> {
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

export async function setOverride(id: string, mode: Mode | null): Promise<void> {
  const repos = await readRepos()
  await writeRepos(
    repos.map((r) => {
      if (r.id !== id) return r
      const next: Repo = { id: r.id, path: r.path }
      if (mode) next.override = mode
      return next
    })
  )
}

export async function listRepos(run: Runner): Promise<RepoView[]> {
  return Promise.all((await readRepos()).map((r) => view(r, run)))
}
