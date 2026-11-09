import type { CiState, MrItem, MrListName, MrLists } from '../../preload/api'
import { FORGE_NAME, FORGES, forgeApi, networkCode, type ForgeId } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { t } from '../lang'

const LIST_CAP = 50
const FOLLOW_CAP = 10
const DETAIL_CAP = 60
const PARALLEL = 6
const LISTS: readonly MrListName[] = ['mine', 'review', 'following']

const GH_FAIL = ['failure', 'timed_out', 'cancelled', 'action_required']
const GH_PASS = ['success', 'neutral', 'skipped']
const GL_FAIL = ['failed', 'canceled']
const GL_RUNNING = ['running', 'pending', 'created', 'preparing', 'waiting_for_resource', 'scheduled']
const GL_PASS = ['success', 'skipped', 'manual']

/** M4. A conclusion the contract does not name (stale…) leaves the CI unknown. */
export function ciGithub(runs: Array<{ status?: string; conclusion?: string | null }>): CiState | undefined {
  if (runs.length === 0) return 'none'
  if (runs.some((r) => GH_FAIL.includes(r.conclusion ?? ''))) return 'fail'
  if (runs.some((r) => r.status !== 'completed')) return 'running'
  return runs.every((r) => GH_PASS.includes(r.conclusion ?? '')) ? 'pass' : undefined
}

export function ciGitlab(status: string | null | undefined): CiState | undefined {
  if (!status) return 'none'
  if (GL_FAIL.includes(status)) return 'fail'
  if (GL_RUNNING.includes(status)) return 'running'
  return GL_PASS.includes(status) ? 'pass' : undefined
}

/** A row plus the API path of its details, which never leaves this file. */
type Row = MrItem & { ref: string }
type Page = { rows: Row[]; more: boolean }
type Get = (path: string) => Promise<{ body: unknown; res: Response } | null>

interface GhPull {
  html_url: string
  title: string
  user?: { login?: string }
  number: number
  updated_at: string
  repository_url?: string
  base?: { repo?: { full_name?: string } }
  head?: { sha?: string }
  additions?: number
  deletions?: number
  changed_files?: number
}
interface GlMr {
  web_url: string
  title: string
  author?: { username?: string }
  project_id: number
  iid: number
  updated_at: string
  references?: { full?: string }
  changes_count?: string
  head_pipeline?: { status?: string } | null
}

const hasNext = (res: Response): boolean => /rel="next"/.test(res.headers.get('link') ?? '') || !!res.headers.get('x-next-page')
const list = <T>(body: unknown): T[] => (Array.isArray(body) ? (body as T[]) : [])

function ghRow(p: GhPull, repo: string): Row {
  return { forge: 'github', url: p.html_url, title: p.title, project: repo, author: p.user?.login ?? '', updatedAt: p.updated_at, ref: `/repos/${repo}/pulls/${p.number}` }
}

function glRow(m: GlMr): Row {
  const project = m.references?.full?.replace(/!\d+$/, '') ?? m.web_url.split('/-/')[0]!.replace(/^https:\/\/[^/]+\//, '')
  return { forge: 'gitlab', url: m.web_url, title: m.title, project, author: m.author?.username ?? '', updatedAt: m.updated_at, ref: `/projects/${m.project_id}/merge_requests/${m.iid}` }
}

async function github(get: Get, account: string): Promise<Record<MrListName, Page>> {
  const search = async (q: string): Promise<Page> => {
    const r = await get(`/search/issues?q=is:pr+is:open+${q}&per_page=${LIST_CAP}`)
    const body = (r?.body ?? {}) as { total_count?: number; items?: GhPull[] }
    const items = body.items ?? []
    return { rows: items.map((p) => ghRow(p, (p.repository_url ?? '').replace(/^.*\/repos\//, ''))), more: (body.total_count ?? 0) > items.length }
  }
  const following = async (): Promise<Page> => {
    const subs = list<{ full_name: string; pushed_at?: string }>((await get('/user/subscriptions?per_page=100'))?.body)
    const recent = subs.sort((a, b) => (b.pushed_at ?? '').localeCompare(a.pushed_at ?? '')).slice(0, FOLLOW_CAP)
    const pages = await Promise.all(recent.map((s) => get(`/repos/${s.full_name}/pulls?state=open&per_page=${LIST_CAP}`)))
    const rows = pages.flatMap((r, i) => list<GhPull>(r?.body).map((p) => ghRow(p, recent[i]!.full_name)))
    return { rows: rows.filter((r) => r.author !== account), more: pages.some((r) => r !== null && hasNext(r.res)) }
  }
  const [mine, review, follow] = await Promise.all([search('author:@me'), search('review-requested:@me'), following()])
  return { mine, review, following: follow }
}

async function gitlab(get: Get, account: string): Promise<Record<MrListName, Page>> {
  const page = async (path: string): Promise<Page> => {
    const r = await get(path)
    return { rows: list<GlMr>(r?.body).map(glRow), more: r !== null && hasNext(r.res) }
  }
  const following = async (): Promise<Page> => {
    const starred = list<{ id: number }>((await get(`/projects?starred=true&order_by=last_activity_at&per_page=${FOLLOW_CAP}`))?.body)
    const pages = await Promise.all(starred.map((p) => page(`/projects/${p.id}/merge_requests?state=opened&per_page=${LIST_CAP}`)))
    return { rows: pages.flatMap((p) => p.rows).filter((r) => r.author !== account), more: pages.some((p) => p.more) }
  }
  const [mine, review, follow] = await Promise.all([
    page(`/merge_requests?scope=created_by_me&state=opened&per_page=${LIST_CAP}`),
    page(`/merge_requests?scope=all&state=opened&reviewer_username=${encodeURIComponent(account)}&per_page=${LIST_CAP}`),
    following()
  ])
  return { mine, review, following: follow }
}

async function details(forge: ForgeId, get: Get, row: Row): Promise<void> {
  const r = await get(row.ref)
  if (!r) return
  if (forge === 'gitlab') {
    const m = r.body as GlMr
    const files = parseInt(m.changes_count ?? '', 10)
    if (!Number.isNaN(files)) row.files = files
    row.ci = ciGitlab(m.head_pipeline?.status)
    return
  }
  const p = r.body as GhPull
  Object.assign(row, { added: p.additions, removed: p.deletions, files: p.changed_files })
  const runs = await get(`${row.ref.replace(/\/pulls\/\d+$/, '')}/commits/${p.head?.sha}/check-runs?per_page=100`)
  if (runs) row.ci = ciGithub((runs.body as { check_runs?: [] }).check_runs ?? [])
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]!)
  }))
}

async function one(forge: ForgeId, token: string, site: string, account: string, fetchImpl: typeof fetch) {
  const name = FORGE_NAME[forge]
  const { base, headers } = forgeApi(forge, site, token)
  let error: string | undefined
  // M6: the first failure names the forge's problem; whatever did answer is kept.
  const get: Get = async (path) => {
    try {
      // A redirect would carry the token to another host.
      const res = await fetchImpl(new URL(`${base}${path}`), { headers, redirect: 'error', signal: AbortSignal.timeout(10_000) })
      if (res.ok) return { body: await res.json(), res }
      error ??= res.status === 401 ? t('{forge} ha rechazado el token: reemplázalo en Ajustes', { forge: name }) : t('{forge} ha respondido {status}', { forge: name, status: res.status })
    } catch (err) {
      error ??= t('No se ha podido conectar con {forge} ({detail}).', { forge: name, detail: networkCode(err) })
    }
    return null
  }
  const pages = await (forge === 'github' ? github : gitlab)(get, account)
  // M2 before M8: an MR counts in the first list it belongs to, then each list is cut.
  const seen = new Set<string>()
  const lists = {} as Record<MrListName, Row[]>
  const more = {} as Record<MrListName, boolean>
  for (const l of LISTS) {
    const rows = pages[l].rows.filter((r) => !seen.has(r.url) && seen.add(r.url))
    if (l === 'following') rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    lists[l] = rows.slice(0, LIST_CAP)
    more[l] = pages[l].more || rows.length > LIST_CAP
  }
  await pool(LISTS.flatMap((l) => lists[l]).slice(0, DETAIL_CAP), PARALLEL, (row) => details(forge, get, row))
  return { lists, more, error }
}

/** M1–M8: the three lists across both forges. Rows carry no token; main keeps the URLs for W52. */
export async function listMrs(store: SecretStore, fetchImpl: typeof fetch = fetch): Promise<MrLists> {
  const out: MrLists = { connected: [], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [] }
  const results = await Promise.all(
    FORGES.map(async (forge) => {
      const secret = await store.readSecret(forge).catch(() => null)
      if (!secret?.['token']) return null
      const account = (await store.hasSecret(forge)).account ?? ''
      return { forge, ...(await one(forge, secret['token'], secret['site'] ?? 'https://gitlab.com', account, fetchImpl)) }
    })
  )
  for (const r of results) {
    if (!r) continue
    out.connected.push(r.forge)
    for (const l of LISTS) {
      out[l].push(
        ...r.lists[l].map((row) => {
          const { ref, ...item } = row
          void ref
          return item
        })
      )
      if (r.more[l]) out.more[l].push(r.forge)
    }
    if (r.error) out.errors.push({ forge: r.forge, text: r.error })
  }
  return out
}
