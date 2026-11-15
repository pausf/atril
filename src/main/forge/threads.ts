import type { MrComment, MrReply, MrThread, MrThreads } from '../../preload/api'
import { FORGE_NAME, forgeApi, type ForgeId } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { t } from '../lang'
import { netProblem, type NetProblem } from '../net-problem'

/** What main keeps per listed row (all three lists): the API path never leaves main. */
export interface ThreadTarget {
  forge: ForgeId
  ref: string
  author: string
}

const PAGES = 3
const GENERAL = 'general'

interface GhComment {
  id: number
  in_reply_to_id?: number
  path?: string
  line?: number | null
  original_line?: number | null
  side?: string
  diff_hunk?: string
  user?: { login?: string }
  author?: { username?: string }
  created_at: string
  body?: string
}
interface GlNote {
  id: number
  system?: boolean
  resolvable?: boolean
  resolved?: boolean
  author?: { username?: string }
  created_at: string
  body?: string
  position?: { new_path?: string | null; old_path?: string | null; new_line?: number | null; old_line?: number | null }
}
interface GlDiscussion {
  id: string
  individual_note?: boolean
  notes?: GlNote[]
}

class Failure extends Error {
  constructor(readonly problem: NetProblem | { error: string; detail?: string; fix?: NetProblem['fix'] }) {
    super(problem.error)
  }
}

/** W150 for a post: the sentence, and when the forge answered, its code and its fix. */
const failed = ({ problem: p }: Failure): { error: string; detail?: string; fix?: NetProblem['fix'] } => ({ error: p.error, ...(p.detail && { detail: p.detail }), ...(p.fix && { fix: p.fix }) })

const comment = (c: GhComment | GlNote): MrComment => ({
  id: String(c.id),
  author: ('user' in c && c.user?.login) || c.author?.username || '',
  at: c.created_at,
  body: c.body ?? ''
})

type Draft = Omit<MrThread, 'yourTurn'>

/** M18, M20: oldest first inside a thread; threads by their first comment, «General» last. */
function finish(drafts: Draft[], general: MrComment[], forge: ForgeId, you: string, author: string): MrThread[] {
  const all = general.length ? [...drafts, { id: GENERAL, forge, comments: general }] : drafts
  for (const d of all) d.comments.sort((a, b) => a.at.localeCompare(b.at))
  const first = (d: Draft): string => (d.id === GENERAL ? '￿' : (d.comments[0]?.at ?? ''))
  return all
    .sort((a, b) => first(a).localeCompare(first(b)))
    .map((d) => {
      const last = d.comments.at(-1)
      const involved = author === you || d.comments.slice(0, -1).some((c) => c.author === you)
      return { ...d, yourTurn: !!last && last.author !== you && involved }
    })
}

function github(review: GhComment[], issue: GhComment[]): { drafts: Draft[]; general: MrComment[] } {
  const roots = new Map<number, GhComment[]>()
  for (const c of review) {
    const root = c.in_reply_to_id ?? c.id
    roots.set(root, [...(roots.get(root) ?? []), c])
  }
  const drafts = [...roots].map(([id, cs]): Draft => {
    const root = cs.find((c) => c.id === id) ?? cs[0]!
    const line = root.line ?? root.original_line
    const code = root.diff_hunk?.split('\n').at(-1)
    return {
      id: String(id),
      forge: 'github',
      ...(root.path && { file: root.path }),
      ...(line != null && { line }),
      ...(root.line == null && line != null && { outdated: true as const }),
      ...(root.side === 'LEFT' && { side: 'old' as const }),
      ...(code && { code }),
      comments: cs.map(comment)
    }
  })
  return { drafts, general: issue.map(comment) }
}

function gitlab(discussions: GlDiscussion[]): { drafts: Draft[]; general: MrComment[] } {
  const drafts: Draft[] = []
  const general: MrComment[] = []
  for (const d of discussions) {
    const notes = (d.notes ?? []).filter((n) => !n.system)
    if (notes.length === 0) continue
    if (d.individual_note) {
      general.push(...notes.map(comment))
      continue
    }
    const pos = notes[0]!.position
    const file = pos?.new_path ?? pos?.old_path
    const line = pos?.new_line ?? pos?.old_line
    const old = pos?.new_line == null && pos?.old_line != null
    const resolvable = notes.filter((n) => n.resolvable)
    drafts.push({
      id: d.id,
      forge: 'gitlab',
      ...(file && { file }),
      ...(line != null && { line }),
      ...(old && { side: 'old' as const }),
      ...(resolvable.length > 0 && { resolved: resolvable.every((n) => n.resolved) }),
      comments: notes.map(comment)
    })
  }
  return { drafts, general }
}

interface Deps {
  store: SecretStore
  fetchImpl?: typeof fetch
  /** M22: the listed row behind an URL, checked on every call. */
  target: (url: string) => ThreadTarget | undefined
}

/** M18–M22: an MR's threads and the person's replies, only for MRs of the latest listing. */
export function createThreads({ store, fetchImpl = fetch, target }: Deps) {
  async function session(url: string) {
    const tgt = target(url)
    if (!tgt) throw new Failure({ error: t('Esta MR ya no está en la lista: actualiza') })
    const secret = await store.readSecret(tgt.forge).catch(() => null)
    if (!secret?.['token']) throw new Failure({ error: t('Conecta GitHub o GitLab en Ajustes'), fix: 'settings' })
    const name = FORGE_NAME[tgt.forge]
    const { base, headers } = forgeApi(tgt.forge, secret['site'] ?? 'https://gitlab.com', secret['token'])
    const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
      let res: Response
      try {
        // A redirect would carry the token to another host.
        res = await fetchImpl(new URL(`${base}${path}`), { ...init, headers: { ...headers, ...(init.body && { 'Content-Type': 'application/json' }) }, redirect: 'error', signal: AbortSignal.timeout(10_000) })
      } catch (err) {
        throw new Failure(netProblem(name, { error: err }))
      }
      if (!res.ok) throw new Failure(netProblem(name, { status: res.status }))
      return res
    }
    const you = (await store.hasSecret(tgt.forge)).account ?? ''
    return { tgt, call, you }
  }

  /** M19: 3 pages of 100; `more` when the forge says there is a next one after them. */
  async function pages<T>(call: (path: string) => Promise<Response>, path: string): Promise<{ items: T[]; more: boolean }> {
    const items: T[] = []
    for (let page = 1; page <= PAGES; page++) {
      const res = await call(`${path}?per_page=100&page=${page}`)
      const body = (await res.json()) as unknown
      if (Array.isArray(body)) items.push(...(body as T[]))
      const next = /rel="next"/.test(res.headers.get('link') ?? '') || !!res.headers.get('x-next-page')
      if (!next) return { items, more: false }
    }
    return { items, more: true }
  }

  const issueRef = (ref: string): string => ref.replace(/\/pulls\/(\d+)$/, '/issues/$1')

  return {
    async read(url: string): Promise<MrThreads> {
      try {
        const { tgt, call, you } = await session(url)
        if (tgt.forge === 'github') {
          const [review, issue] = await Promise.all([pages<GhComment>(call, `${tgt.ref}/comments`), pages<GhComment>(call, `${issueRef(tgt.ref)}/comments`)])
          const { drafts, general } = github(review.items, issue.items)
          return { threads: finish(drafts, general, 'github', you, tgt.author), more: review.more || issue.more }
        }
        const r = await pages<GlDiscussion>(call, `${tgt.ref}/discussions`)
        const { drafts, general } = gitlab(r.items)
        return { threads: finish(drafts, general, 'gitlab', you, tgt.author), more: r.more }
      } catch (err) {
        if (err instanceof Failure) return { error: err.message }
        throw err
      }
    },

    /** M21: one request per call; the window disables Enviar while it runs. */
    async reply(url: string, threadId: string, body: string): Promise<MrReply> {
      try {
        if (!body.trim()) throw new Failure({ error: t('Escribe una respuesta') })
        const { tgt, call } = await session(url)
        const valid = threadId === GENERAL || (tgt.forge === 'github' ? /^\d+$/ : /^[0-9a-f]+$/).test(threadId)
        if (!valid) throw new Failure({ error: t('Ese hilo no es de esta MR') })
        const path =
          tgt.forge === 'github'
            ? threadId === GENERAL ? `${issueRef(tgt.ref)}/comments` : `${tgt.ref}/comments/${threadId}/replies`
            : threadId === GENERAL ? `${tgt.ref}/notes` : `${tgt.ref}/discussions/${threadId}/notes`
        const res = await call(path, { method: 'POST', body: JSON.stringify({ body }) })
        return { comment: comment((await res.json()) as GhComment) }
      } catch (err) {
        if (err instanceof Failure) return failed(err)
        throw err
      }
    }
  }
}
