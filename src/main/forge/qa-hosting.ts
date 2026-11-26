import type { ForgeId, NetFix, QaReport } from '../../preload/api'
import { FORGE_NAME, forgeApi } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { scrub } from '../crash/report'
import { t } from '../lang'
import { netProblem } from '../net-problem'

type T = (es: string, vars?: Record<string, string | number>) => string

export interface MrRef {
  forge: ForgeId
  /** `/repos/{o}/{r}/pulls/{n}` or `/projects/{id}/merge_requests/{iid}`, as the listing gives it. */
  ref: string
}
export interface MrState {
  description: string | null
  target: string
  merged: boolean
}
export type Problem = { error: string; detail?: string; fix?: NetFix | 'recheck' }

const OPEN = '<!-- atril-qa -->'
const CLOSE = '<!-- /atril-qa -->'
const BRANCH = 'atril-qa'
const PLATFORM = { chrome: 'Chrome', safari: 'Safari', android: 'Android', ios: 'iOS' } as const

/** W170's title line. */
export function qaTitle(report: QaReport, t: T): string {
  const x = report.target
  const target = x ? (x.dir ? `${PLATFORM[x.platform]} · ${x.dir}` : PLATFORM[x.platform]) : null
  return target ? t('Pruebas en vivo con Atril · {target}', { target }) : t('Pruebas en vivo con Atril')
}

/** W170's per-criterion word, text and, for a failing one, its note or else its last step. */
export function qaLines(report: QaReport, t: T): Array<{ id: string; word: string; text: string; why: string }> {
  return report.criteria.map((c) => {
    const e = report.entries.find((x) => x.id === c.id)
    const status = e?.status ?? 'untested'
    const word = status === 'pass' ? t('Pasa') : status === 'fail' ? t('Falla') : t('Sin probar')
    const why = status === 'fail' ? (e!.note || e!.steps.at(-1)?.text || '').replace(/\s+/g, ' ').trim() : ''
    return { id: c.id, word, text: c.text, why }
  })
}

// Private-use stand-ins keep quotes out of the scrubber's quoted-text rule, so «Pagar» stays readable.
const QUOTES = ['«', '»', '"', '“', '”']
const shield = (s: string): string => QUOTES.reduce((x, q, i) => x.split(q).join(String.fromCharCode(0xe000 + i)), s)
const unshield = (s: string): string => QUOTES.reduce((x, q, i) => x.split(String.fromCharCode(0xe000 + i)).join(q), s)

/** W252: hosts, paths, tokens and e-mails out; the quoted UI words the criterion is about stay. */
const clean = (s: string, home: string): string => unshield(scrub(shield(s), home)).replace(/\s+/g, ' ').trim()

/** W248: W170's title, then per criterion its word, text, quoted failing note and its pictures. */
export function qaBlock(report: QaReport, pictures: Record<string, { after: string; before?: string }>, home: string): string {
  const out = [OPEN, `**${qaTitle(report, t)}**`]
  for (const l of qaLines(report, t)) {
    out.push('', `**${l.word}** · ${clean(l.text, home)}`)
    if (l.why) out.push(`> ${clean(l.why, home)}`)
    const p = pictures[l.id]
    if (p?.before) out.push('', `| ${t('Antes')} | ${t('Después')} |`, '|---|---|', `| ![${t('Antes')}](${p.before}) | ![${t('Después')}](${p.after}) |`)
    else if (p) out.push('', `![${t('Después')}](${p.after})`)
  }
  out.push(CLOSE)
  return out.join('\n')
}

/** W248: the block replaces the first opening marker to the last closing one (or the end); else it goes after a blank line. */
export function splice(description: string | null, block: string): string {
  const d = description ?? ''
  const start = d.indexOf(OPEN)
  if (start < 0) return d.trim() === '' ? block : `${d}\n\n${block}`
  const close = d.lastIndexOf(CLOSE)
  const end = close > start ? close + CLOSE.length : d.length
  return d.slice(0, start) + block + d.slice(end)
}

class Failure extends Error {
  constructor(readonly problem: Problem) {
    super(problem.error)
  }
}

interface Deps {
  store: SecretStore
  fetchImpl?: typeof fetch
}

/** W246–W248: where the pictures live on each forge, and Atril's block in the MR description. */
export function createQaHosting({ store, fetchImpl = fetch }: Deps) {
  async function session(forge: ForgeId) {
    const secret = await store.readSecret(forge).catch(() => null)
    if (!secret?.['token']) throw new Failure({ error: t('Conecta GitHub o GitLab en Ajustes'), fix: 'settings' })
    const name = FORGE_NAME[forge]
    const site = secret['site'] ?? 'https://gitlab.com'
    const { base, headers } = forgeApi(forge, site, secret['token'])
    const call = async <R>(path: string, init: RequestInit = {}, missing?: R): Promise<R> => {
      let res: Response
      try {
        const json = typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}
        // A redirect would carry the token to another host.
        res = await fetchImpl(new URL(`${base}${path}`), { ...init, headers: { ...headers, ...json }, redirect: 'error', signal: AbortSignal.timeout(30_000) })
      } catch (err) {
        throw new Failure(netProblem(name, { error: err }))
      }
      if (res.status === 404 && missing !== undefined) return missing
      if (!res.ok) throw new Failure(netProblem(name, { status: res.status }))
      return (await res.json().catch(() => {
        throw new Failure(netProblem(name, { error: new SyntaxError() }))
      })) as R
    }
    return { call, site }
  }

  const guard = async <R>(work: () => Promise<R>): Promise<R | Problem> => {
    try {
      return await work()
    } catch (err) {
      if (err instanceof Failure) return err.problem
      throw err
    }
  }
  const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

  async function read(mr: MrRef): Promise<MrState> {
    const { call } = await session(mr.forge)
    const r = await call<Record<string, unknown>>(mr.ref)
    if (mr.forge === 'github') {
      const base = r['base'] as { ref?: unknown } | undefined
      return { description: typeof r['body'] === 'string' ? r['body'] : null, target: String(base?.ref ?? ''), merged: typeof r['merged_at'] === 'string' }
    }
    return { description: typeof r['description'] === 'string' ? r['description'] : null, target: String(r['target_branch'] ?? ''), merged: r['state'] === 'merged' }
  }

  return {
    readMr: (mr: MrRef): Promise<MrState | Problem> => guard(() => read(mr)),

    /** W246/W247: name → link. GitHub: one commit on the orphan `atril-qa` branch; GitLab: project uploads. */
    host: (mr: MrRef, pictures: Array<{ name: string; bytes: Buffer }>): Promise<Record<string, string> | Problem> =>
      guard(async () => {
        const { call, site } = await session(mr.forge)
        const links: Record<string, string> = {}
        if (mr.forge === 'gitlab') {
          const project = mr.ref.replace(/\/merge_requests\/\d+$/, '')
          for (const p of pictures) {
            const form = new FormData()
            form.append('file', new Blob([new Uint8Array(p.bytes)], { type: 'image/png' }), p.name)
            const r = await call<{ full_path?: unknown }>(`${project}/uploads`, { method: 'POST', body: form })
            if (typeof r.full_path !== 'string' || !r.full_path.startsWith('/')) throw new Failure(netProblem(FORGE_NAME.gitlab, { status: 200 }))
            links[p.name] = `${site}${r.full_path}`
          }
          return links
        }
        const repo = mr.ref.replace(/\/pulls\/\d+$/, '')
        const tip = await call<{ object?: { sha?: string } } | null>(`${repo}/git/ref/heads/${BRANCH}`, {}, null)
        const parent = tip?.object?.sha
        const baseTree = parent ? (await call<{ tree?: { sha?: string } }>(`${repo}/git/commits/${parent}`)).tree?.sha : undefined
        const tree = []
        for (const p of pictures) {
          const blob = await call<{ sha: string }>(`${repo}/git/blobs`, send('POST', { content: p.bytes.toString('base64'), encoding: 'base64' }))
          tree.push({ path: `qa/${p.name}`, mode: '100644', type: 'blob', sha: blob.sha })
        }
        const madeTree = await call<{ sha: string }>(`${repo}/git/trees`, send('POST', { ...(baseTree && { base_tree: baseTree }), tree }))
        const commit = await call<{ sha: string }>(`${repo}/git/commits`, send('POST', { message: 'QA pictures from Atril', tree: madeTree.sha, parents: parent ? [parent] : [] }))
        if (parent) await call(`${repo}/git/refs/heads/${BRANCH}`, send('PATCH', { sha: commit.sha }))
        else await call(`${repo}/git/refs`, send('POST', { ref: `refs/heads/${BRANCH}`, sha: commit.sha }))
        const web = repo.replace(/^\/repos\//, 'https://github.com/')
        for (const p of pictures) links[p.name] = `${web}/blob/${commit.sha}/qa/${p.name}?raw=true`
        return links
      }),

    /** W248: written only when the description is still the one the sheet was built on. */
    replaceBlock: (mr: MrRef, expected: string | null, block: string): Promise<{ ok: true } | Problem> =>
      guard(async () => {
        const now = await read(mr)
        if ((now.description ?? '') !== (expected ?? '')) return { error: t('La descripción de la MR ha cambiado: publica otra vez'), fix: 'recheck' as const }
        const { call } = await session(mr.forge)
        const next = splice(now.description, block)
        // ponytail: no forge offers a conditional write on the PR body; an edit in the second between read and write is lost.
        await call(mr.ref, mr.forge === 'github' ? send('PATCH', { body: next }) : send('PUT', { description: next }))
        return { ok: true as const }
      })
  }
}
