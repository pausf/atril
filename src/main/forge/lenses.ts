import { randomUUID } from 'node:crypto'
import type { LensName, LensSeverity, MrComment, MrDraft, MrDrafts, MrDraftsResult, MrFixCiResult, MrMetrics, WorkspaceView } from '../../preload/api'
import type { SecretStore } from '../credentials/store'
import { getLang, t } from '../lang'
import type { Runner } from '../run'
import { replyGone } from '../status'
import { createQueue, cutDiff, fetchDiff, Failure, forgeGet, metrics, readStored, writeStored, type Queue, type ScoreTarget } from './scores'

const CLAUDE_MS = 180_000
const KIND = 'lenses'
const MAX_FINDINGS = 12
const MAX_TEXT = 400
const LENSES: readonly LensName[] = ['intent', 'security', 'design', 'reliability', 'tests']
const SEVERITIES: readonly LensSeverity[] = ['high', 'medium', 'low']
const FINDING_KEYS = ['lens', 'severity', 'file', 'line', 'text']

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      maxItems: MAX_FINDINGS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['lens', 'severity', 'text'],
        properties: {
          lens: { type: 'string', enum: LENSES },
          severity: { type: 'string', enum: SEVERITIES },
          file: { type: 'string' },
          line: { type: 'integer', minimum: 1 },
          text: { type: 'string', minLength: 1, maxLength: MAX_TEXT }
        }
      }
    }
  }
}

type Finding = Omit<MrDraft, 'id' | 'state'>
interface Stored {
  head: string
  drafts: MrDraft[]
}

/** The schema, checked again in main: `--json-schema` is the CLI's promise, not ours. */
function validFindings(v: unknown): v is Finding[] {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  const list = o['findings']
  return (
    Object.keys(o).every((k) => k === 'findings') &&
    Array.isArray(list) &&
    list.length <= MAX_FINDINGS &&
    list.every((f) => {
      if (typeof f !== 'object' || f === null || Array.isArray(f)) return false
      const x = f as Record<string, unknown>
      return (
        Object.keys(x).every((k) => FINDING_KEYS.includes(k)) &&
        LENSES.includes(x['lens'] as LensName) &&
        SEVERITIES.includes(x['severity'] as LensSeverity) &&
        typeof x['text'] === 'string' &&
        x['text'].length >= 1 &&
        x['text'].length <= MAX_TEXT &&
        (x['file'] === undefined || typeof x['file'] === 'string') &&
        (x['line'] === undefined || (Number.isInteger(x['line']) && (x['line'] as number) >= 1))
      )
    })
  )
}

function instruction(lang: string, m: MrMetrics): string {
  return [
    "Your stdin is a merge request's unified diff. Review it through five lenses, as five separate reviewers would.",
    'intent: does the change do what it says it does.',
    'security: vulnerabilities an attacker could reach.',
    'design: over-engineering, the wrong abstraction, needless complexity.',
    'reliability: what breaks at runtime: edge cases, races, error paths.',
    'tests: whether the change carries its proof and whether existing proof was weakened.',
    `Report only findings worth a reviewer's time, at most ${MAX_FINDINGS}; none is a valid answer.`,
    `Each finding has its lens, a severity (high, medium or low), the file and the line in the new version when you can tell, and a text of at most ${MAX_TEXT} characters.`,
    `Atril already measured the diff: size ${m.size}, +${m.added} -${m.removed} lines, ${m.files} files, tests changed: ${m.tests ? 'yes' : 'no'}. Do not report those measures.`,
    `Answer in ${lang === 'en' ? 'English' : 'Spanish'}.`
  ].join(' ')
}

/** «file:line», «file», or nothing when there is no file (M27). */
const location = (d: Pick<MrDraft, 'file' | 'line'>): string | undefined => (d.file ? (d.line === undefined ? d.file : `${d.file}:${d.line}`) : undefined)

/** M27: the comment exactly as posted: a header, a blank line, the text as written. */
function commentBody(d: MrDraft): string {
  const loc = location(d)
  return `**${d.lens} · ${d.severity}**${loc ? ` — \`${loc}\`` : ''}\n\n${d.text}`
}

const namesProject = (origin: string, project: string, host: string): boolean => {
  const path = origin.trim().replace(/\/+$/, '').replace(/\.git$/, '').toLowerCase()
  const p = project.toLowerCase()
  // ponytail: the host as a substring of the origin, enough to tell github.com from a GitLab host.
  return path.includes(host.toLowerCase()) && (path.endsWith(`/${p}`) || path.endsWith(`:${p}`))
}

interface Deps {
  store: SecretStore
  run: Runner
  fetchImpl?: typeof fetch
  /** M25: the reviewable row (Mías, Me toca revisar) behind an URL, checked when asked. */
  target: (url: string) => ScoreTarget | undefined
  /** M27: whether an MR is in the latest listing at all. */
  listed: (url: string) => boolean
  /** The MR's general comment (M21). */
  post: (url: string, body: string) => Promise<{ comment: MrComment } | { error: string }>
  /** N3: types into a workspace's agent. */
  send: (workspaceId: string, text: string) => Promise<'sent' | 'ignored' | 'gone'>
  workspaces: () => Promise<WorkspaceView[]>
  /** Shared with the scores; its own when absent. */
  queue?: Queue
}

/** M25–M28: the lens review of an MR, its drafts kept per head commit, and what each draft can do. */
export function createLenses({ store, run, fetchImpl = fetch, target, listed, post, send, workspaces, queue = createQueue() }: Deps) {
  const pending = new Map<string, Promise<MrDraftsResult>>()
  // Drafts being published, sent or discarded: a second click on the same one is refused (M27).
  const busy = new Set<string>()
  // Read-modify-write of one file at a time, so two drafts of one MR cannot overwrite each other.
  const writes = createQueue()

  /** M28: the one live workspace on the MR's branch in a repo of its project; zero or several is none. */
  async function agentFor(url: string, tgt: ScoreTarget | undefined): Promise<WorkspaceView | undefined> {
    if (!tgt?.branch || !tgt.project) return undefined
    const matches: WorkspaceView[] = []
    for (const w of (await workspaces()).filter((x) => x.alive && x.branch === tgt.branch)) {
      const r = await run('git', ['-C', w.path, 'remote', 'get-url', 'origin'], { timeoutMs: 5000 })
      if (r.code === 0 && namesProject(r.stdout, tgt.project, new URL(url).hostname)) matches.push(w)
    }
    return matches.length === 1 ? matches[0] : undefined
  }

  async function view(url: string, tgt: ScoreTarget | undefined, stored: Stored | null, fresh = false): Promise<MrDrafts> {
    if (!stored) return { stale: false, canSend: false, drafts: [] }
    const stale = !fresh && !!tgt?.head && tgt.head !== stored.head
    const canSend = stored.drafts.some((d) => d.state === 'open') && !!(await agentFor(url, tgt))
    return { head: stored.head, stale, canSend, drafts: stored.drafts }
  }

  const readDrafts = async (url: string): Promise<Stored | null> => {
    const s = await readStored<Stored>(KIND, url)
    return s && Array.isArray(s.drafts) ? s : null
  }

  async function work(url: string, tgt: ScoreTarget): Promise<MrDraftsResult> {
    const secret = await store.readSecret(tgt.forge).catch(() => null)
    const get = forgeGet(tgt, secret, fetchImpl)
    const fail = (detail: string | number): MrDraftsResult => ({ error: t('Claude no ha podido revisar esta MR: {detail}', { detail }) })

    let head = tgt.head
    let diff: string
    try {
      if (!secret?.['token']) throw new Failure(t('Conecta GitHub o GitLab en Ajustes'))
      if (tgt.forge === 'github') head = ((await (await get(tgt.ref)).json()) as { head?: { sha?: string } }).head?.sha
      // M26: no head, nothing to key drafts by: refused before spending quota.
      if (!head) throw new Failure(t('No se sabe el último commit de esta MR: actualiza'))
      const cached = await readDrafts(url)
      if (cached && cached.head === head) return view(url, tgt, cached, true)
      diff = await fetchDiff(get, tgt)
    } catch (err) {
      if (!(err instanceof Failure)) throw err
      return fail(err.message)
    }

    const { text } = cutDiff(diff)
    const args = ['-p', '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--json-schema', JSON.stringify(SCHEMA), instruction(getLang(), metrics(diff))]
    const r = await run('claude', args, { input: text, timeoutMs: CLAUDE_MS, secret: true })
    // M16's details: a code or a fixed word, never Claude's own output.
    if (r.code === 124) return fail(t('tiempo agotado'))
    if (r.code !== 0) return fail(r.code)
    let answer: { is_error?: unknown; structured_output?: unknown }
    try {
      answer = JSON.parse(r.stdout)
    } catch {
      return fail(t('respuesta fuera del esquema'))
    }
    const found = answer?.structured_output
    if (answer?.is_error !== false || !validFindings(found)) return fail(t('respuesta fuera del esquema'))

    const drafts = (found as unknown as { findings: Finding[] }).findings.map((f): MrDraft => ({ id: randomUUID(), ...f, state: 'open' }))
    const stored = { head, drafts }
    await writes(() => writeStored(KIND, url, stored))
    return view(url, tgt, stored, true)
  }

  const closed = (): MrDraftsResult => ({ error: t('Ese borrador ya no está abierto') })

  /** M27, M28: the checks every action shares, then `how` runs once on an open draft. */
  async function act(url: string, id: string, how: (d: MrDraft, tgt: ScoreTarget | undefined) => Promise<string | undefined>, after: 'mark' | 'remove', mark?: MrDraft['state']): Promise<MrDraftsResult> {
    if (!listed(url)) return { error: t('Esta MR ya no está en la lista: actualiza') }
    const key = `${url}\n${id}`
    const draft = (await readDrafts(url))?.drafts.find((d) => d.id === id)
    if (!draft || draft.state !== 'open' || busy.has(key)) return closed()
    busy.add(key)
    try {
      const tgt = target(url)
      const error = await how(draft, tgt)
      if (error) return { error }
      const next = await writes(async () => {
        const s = await readDrafts(url)
        // A new review may have replaced the drafts while this one was on its way.
        if (!s?.drafts.some((d) => d.id === id)) return s
        const drafts = after === 'remove' ? s.drafts.filter((d) => d.id !== id) : s.drafts.map((d) => (d.id === id ? { ...d, state: mark! } : d))
        const out = { ...s, drafts }
        await writeStored(KIND, url, out)
        return out
      })
      return view(url, tgt, next)
    } finally {
      busy.delete(key)
    }
  }

  return {
    review(url: string): Promise<MrDraftsResult> {
      const key = `review:${url}`
      const running = pending.get(key)
      if (running) return running
      const tgt = target(url)
      if (!tgt) return Promise.resolve({ error: t('Solo se pueden puntuar tus MR y las que te toca revisar') })
      const promise = queue(() => work(url, tgt))
        .catch((): MrDraftsResult => ({ error: t('Claude no ha podido revisar esta MR: {detail}', { detail: 'error' }) }))
        .then((r) => {
          pending.delete(key)
          return r
        })
      pending.set(key, promise)
      return promise
    },

    async draftsOf(url: string): Promise<MrDraftsResult> {
      return view(url, target(url), await readDrafts(url))
    },

    publish: (url: string, id: string): Promise<MrDraftsResult> =>
      act(url, id, async (d) => {
        const r = await post(url, commentBody(d))
        return 'error' in r ? r.error : undefined
      }, 'mark', 'published'),

    send: (url: string, id: string): Promise<MrDraftsResult> =>
      act(url, id, async (d, tgt) => {
        const agent = await agentFor(url, tgt)
        if (!agent) return replyGone()
        const text = t('Revisión de Libretto ({lens}, {severity}) en {location}: {text}', { lens: d.lens, severity: d.severity, location: location(d) ?? t('la MR'), text: d.text })
        return (await send(agent.id, text)) === 'sent' ? undefined : replyGone()
      }, 'mark', 'sent'),

    discard: (url: string, id: string): Promise<MrDraftsResult> => act(url, id, async () => undefined, 'remove'),

    /** M32: the branch of M28's agent, only while the latest listing has the MR's CI failing. */
    async ciAgent(url: string): Promise<string | null> {
      const tgt = target(url)
      return tgt?.ci === 'fail' ? ((await agentFor(url, tgt))?.branch ?? null) : null
    },

    /** M30: asks M28's agent to fix a failing CI, typed as one literal line; one at a time per MR. */
    async fixCi(url: string): Promise<MrFixCiResult> {
      const key = `fixCi\n${url}`
      if (busy.has(key)) return { error: t('Ya se está enviando a ese trabajo') }
      busy.add(key)
      try {
        const tgt = target(url)
        if (tgt?.ci !== 'fail') return { error: t('La CI de esta MR ya no falla.') }
        const agent = await agentFor(url, tgt)
        if (!agent) return { error: t('No hay un único trabajo de esta MR abierto en Atril.') }
        const cmd = tgt.forge === 'github' ? 'gh pr checks' : 'glab ci view'
        const text = t('La CI de {url} falla. Mira qué ha fallado con {cmd}, arréglalo y avísame antes de subir nada.', { url, cmd })
        return (await send(agent.id, text)) === 'sent' ? { sent: agent.branch } : { error: replyGone() }
      } finally {
        busy.delete(key)
      }
    }
  }
}
