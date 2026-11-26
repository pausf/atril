import type { ForgeId, MrListName, MrWork, WorkspaceResult } from '../../preload/api'
import { t } from '../lang'
import { readRepos, type Repo } from '../repos'
import type { Runner } from '../run'
import { listWorkspaces, openWorktree, readRecords } from '../workspaces'
import { namesProject } from './lenses'

/** An MR of main's latest listing: the list it is in and what finds its repo. */
export interface MrEntry {
  list: MrListName
  forge: ForgeId
  project: string
  branch?: string
}

interface Deps {
  latest: (url: string) => MrEntry | undefined
  run: Runner
}

type Found = { kind: 'review' | 'continue'; mr: MrEntry & { branch: string }; repo: Repo; remote: string } | { kind: 'none'; reason: string }

/** M34: the URL becomes one argv element; anything that could read as a flag or cut a string never gets there. */
const validUrl = (url: unknown): url is string => typeof url === 'string' && url.startsWith('https://') && !url.includes('\0') && !url.startsWith('-')

/** The first remote of the repo at `path` that names the project on the MR's host, like review-project's rule. */
export async function remoteNaming(run: Runner, path: string, project: string, host: string): Promise<string | undefined> {
  const r = await run('git', ['-C', path, 'remote', '-v'], { timeoutMs: 5000 })
  if (r.code !== 0) return undefined
  for (const line of r.stdout.split('\n')) {
    const [name, url] = line.split(/\s+/)
    if (name && url && namesProject(url, project, host)) return name
  }
  return undefined
}

/** M33, M34: an MR of the latest listing opened through Libretto's own path in the one repo of its project. */
export function createOpenMr({ latest, run }: Deps) {
  async function find(url: string): Promise<Found> {
    const mr = latest(url)
    if (!mr) return { kind: 'none', reason: t('This MR is no longer in the list: refresh') }
    const { branch } = mr
    if (!branch) return { kind: 'none', reason: t('The branch of this MR is unknown: refresh') }
    const host = new URL(url).hostname
    const matches: Array<{ repo: Repo; remote: string }> = []
    for (const repo of await readRepos()) {
      const remote = await remoteNaming(run, repo.path, mr.project, host)
      if (remote) matches.push({ repo, remote })
    }
    if (matches.length === 0) return { kind: 'none', reason: t('Add the repo of {project} in Settings', { project: mr.project }) }
    if (matches.length > 1) return { kind: 'none', reason: t('Several registered repos are {project}', { project: mr.project }) }
    // An MR in Mías is yours to continue, wherever else it also shows.
    return { kind: mr.list === 'mine' ? 'continue' : 'review', mr: { ...mr, branch }, ...matches[0]! }
  }

  /** A record of the button's own kind on the MR's branch in that repo, live or not. */
  async function existing(found: Exclude<Found, { kind: 'none' }>): Promise<string | undefined> {
    const review = found.kind === 'review'
    return (await readRecords()).find((r) => r.repoId === found.repo.id && r.branch === found.mr.branch && (r.mode === 'review') === review)?.id
  }

  return {
    async workFor(url: string): Promise<MrWork> {
      if (!validUrl(url)) return { kind: 'none', reason: t('This MR is no longer in the list: refresh') }
      const found = await find(url)
      if (found.kind === 'none') return found
      const id = await existing(found)
      return id ? { kind: 'existing', workspaceId: id } : { kind: found.kind }
    },

    async open(url: unknown): Promise<WorkspaceResult> {
      if (!validUrl(url)) return { error: t('This MR is no longer in the list: refresh') }
      const found = await find(url)
      if (found.kind === 'none') return { error: found.reason }
      // A second press finds what the first one opened.
      const id = await existing(found)
      const had = id ? (await listWorkspaces(run)).find((w) => w.id === id) : undefined
      if (had) return { workspace: had }
      const base = { repoId: found.repo.id, branch: found.mr.branch, agent: 'claude' as const }
      return found.kind === 'review'
        ? openWorktree({ ...base, review: true, prompt: `/libretto:libretto-review ${url}` }, run)
        : openWorktree({ ...base, existing: true, remote: found.remote, prompt: '/libretto:libretto-flow' }, run)
    }
  }
}
