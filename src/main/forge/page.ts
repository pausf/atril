import type { MrPage, MrPageFile, MrPageLine, MrReviewer, NetFix } from '../../preload/api'
import { FORGE_NAME, forgeApi } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { t } from '../lang'
import { netProblem } from '../net-problem'
import { fetchDiff } from './scores'
import type { ThreadTarget } from './threads'

/** The same cap as F23's local diffs. */
const CAP_BYTES = 1024 * 1024
const CONTRACT = /^\.agents\/changes\/([^/]+)\/proposal\.md$/
const GL_UNSENT = '\\ GitLab did not send this file: too large'
const GH_STATES: Record<string, MrReviewer['state']> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes', COMMENTED: 'commented' }

type Problem = { error: string; detail?: string; fix?: NetFix }
class Failure extends Error {
  constructor(readonly problem: Problem) {
    super(problem.error)
  }
}
class TooLarge extends Error {}

interface Parsed extends MrPageFile {
  deleted?: boolean
}

/** One file of a unified diff, from its `diff --git` line to the next. */
function parseFile(chunk: string, cut: boolean): Parsed {
  const rows = chunk.split('\n')
  const header = /^diff --git a\/(.+) b\/(.+)$/.exec(rows[0] ?? '')
  const file: Parsed = { path: header?.[2] ?? '', oldPath: header?.[1] ?? '', added: 0, removed: 0, lines: [] }
  let oldN = 0
  let newN = 0
  let inHunk = false
  for (const row of rows.slice(1)) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row)
    if (hunk) {
      inHunk = true
      oldN = Number(hunk[1])
      newN = Number(hunk[2])
      continue
    }
    if (!inHunk) {
      // Headers before the first hunk name the paths; a «---» inside a hunk is a removed line.
      if (row.startsWith('rename from ')) file.oldPath = row.slice(12)
      else if (row.startsWith('rename to ')) file.path = row.slice(10)
      else if (row.startsWith('--- a/')) file.oldPath = row.slice(6)
      else if (row.startsWith('+++ b/')) file.path = row.slice(6)
      else if (row === '+++ /dev/null' || row.startsWith('deleted file mode')) file.deleted = true
      else if (row === GL_UNSENT) file.tooLarge = true
      continue
    }
    const sign = row[0]
    let line: MrPageLine | undefined
    if (sign === '+') line = { kind: 'added', new: newN++, text: row.slice(1) }
    else if (sign === '-') line = { kind: 'removed', old: oldN++, text: row.slice(1) }
    else if (sign === ' ') line = { kind: 'context', old: oldN++, new: newN++, text: row.slice(1) }
    if (!line) continue
    if (line.kind === 'added') file.added++
    if (line.kind === 'removed') file.removed++
    if (!cut) file.lines.push(line)
  }
  if (cut) file.cut = true
  return file
}

const strip = ({ deleted, ...f }: Parsed): MrPageFile => (void deleted, f)

/** M46: a unified diff as files and lines with both numberings; past `cap` bytes, files keep only name and counts. */
export function parseDiff(diff: string, cap = CAP_BYTES): MrPageFile[] {
  return parsed(diff, cap).map(strip)
}

function parsed(diff: string, cap: number): Parsed[] {
  let used = 0
  let over = false
  return diff
    .split(/(?=^diff --git )/m)
    .filter((c) => c.startsWith('diff --git '))
    .map((chunk) => {
      used += Buffer.byteLength(chunk)
      over ||= used > cap
      return parseFile(chunk.replace(/\n$/, ''), over)
    })
}

type Diff = { text: string } | { tooLarge: true } | { problem: Problem }

interface Deps {
  store: SecretStore
  fetchImpl?: typeof fetch
  /** M46: every MR of the latest listing (M22's set). */
  target: (url: string) => ThreadTarget | undefined
}

/** M46: what the MR page needs when it opens: the diff as files, the reviewers and the Libretto contract. */
export function createPage({ store, fetchImpl = fetch, target }: Deps) {
  return {
    async read(url: string): Promise<MrPage> {
      const tgt = target(url)
      if (!tgt) return { error: t('This MR is no longer in the list: refresh') }
      const secret = await store.readSecret(tgt.forge).catch(() => null)
      if (!secret?.['token']) return { error: t('Connect GitHub or GitLab in Settings'), fix: 'settings' }
      const name = FORGE_NAME[tgt.forge]
      const { base, headers } = forgeApi(tgt.forge, secret['site'] ?? 'https://gitlab.com', secret['token'])
      const get = async (path: string, accept?: string): Promise<Response> => {
        let res: Response
        try {
          // A redirect would carry the token to another host.
          res = await fetchImpl(new URL(`${base}${path}`), { headers: { ...headers, ...(accept && { Accept: accept }) }, redirect: 'error', signal: AbortSignal.timeout(10_000) })
        } catch (err) {
          throw new Failure(netProblem(name, { error: err }))
        }
        if (res.ok) return res
        // M16: GitHub's 406 is a diff too large to send, not a failure.
        if (res.status === 406 && tgt.forge === 'github' && accept) throw new TooLarge()
        throw new Failure(netProblem(name, { status: res.status }))
      }
      const json = async <T>(path: string): Promise<T> => (await (await get(path)).json()) as T

      const reviewers = async (): Promise<MrReviewer[]> => {
        const out = new Map<string, MrReviewer['state']>()
        if (tgt.forge === 'github') {
          const [pull, reviews] = await Promise.all([
            json<{ requested_reviewers?: Array<{ login?: string }> }>(tgt.ref),
            json<Array<{ user?: { login?: string }; state?: string; submitted_at?: string }>>(`${tgt.ref}/reviews?per_page=100`)
          ])
          const latest = (Array.isArray(reviews) ? reviews : []).filter((r) => r.user?.login && GH_STATES[r.state ?? '']).sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''))
          const pending = (pull.requested_reviewers ?? []).map((r) => r.login).filter((n): n is string => !!n)
          for (const n of pending) out.set(n, 'pending')
          for (const r of latest) if (!pending.includes(r.user!.login!)) out.set(r.user!.login!, GH_STATES[r.state!]!)
        } else {
          const [mr, approvals] = await Promise.all([
            json<{ reviewers?: Array<{ username?: string }> }>(tgt.ref),
            json<{ approved_by?: Array<{ user?: { username?: string } }> }>(`${tgt.ref}/approvals`)
          ])
          for (const r of mr.reviewers ?? []) if (r.username) out.set(r.username, 'pending')
          for (const a of approvals.approved_by ?? []) if (a.user?.username) out.set(a.user.username, 'approved')
        }
        out.delete(tgt.author)
        return [...out].map(([name, state]) => ({ name, state }))
      }

      // Each part on its own: a failed reviewers request fails its card, only the diff fails the page.
      const [diff, people] = await Promise.all([
        fetchDiff(get, tgt).then(
          (text): Diff => ({ text }),
          (err: unknown): Diff => {
            if (err instanceof TooLarge) return { tooLarge: true as const }
            if (!(err instanceof Failure)) throw err
            return { problem: err.problem }
          }
        ),
        // Anything that breaks the reviewers, a body that is not JSON included, fails their card only (M46).
        reviewers().catch((err: unknown): Problem => (err instanceof Failure ? err.problem : netProblem(name, { error: err })))
      ])
      if ('problem' in diff) return diff.problem
      const files = 'text' in diff ? parsed(diff.text, CAP_BYTES) : []
      const contract = files.map((f) => !f.deleted && CONTRACT.exec(f.path)?.[1]).find(Boolean)
      return { files: files.map(strip), ...('tooLarge' in diff && { cut: true }), reviewers: people, ...(contract && { contract }) }
    }
  }
}
