import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MrAiScore, MrMetrics, MrScore, MrScoreState, MrSize } from '../../preload/api'
import { FORGE_NAME, forgeApi, type ForgeId } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { getLang, t } from '../lang'
import { atrilHome } from '../paths'
import type { Runner } from '../run'
import { networkText, statusText } from './mrs'

/** What main keeps per scorable row: the API path never leaves main. */
export interface ScoreTarget {
  forge: ForgeId
  ref: string
  head?: string
  /** The MR's project and source branch, which lenses match against local workspaces (M28). */
  project?: string
  branch?: string
}

const CUT_BYTES = 120 * 1024
const CLAUDE_MS = 180_000
const GL_PAGES = 10
const TEST_SEGMENT = /^(test|tests|spec|specs|__tests__)$/i
const TEST_NAME = /\.(test|spec)\.[^/]+$|_test\.[^/]+$/i
// xUnit names are case-sensitive: OrdersTest.php is a test, latest.php is not.
const XUNIT_NAME = /Test\.(php|java|kt|cs)$/

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['difficulty', 'risk', 'what', 'why', 'where'],
  properties: {
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    risk: { type: 'integer', minimum: 1, maximum: 5 },
    what: { type: 'string', maxLength: 300 },
    why: { type: 'string', maxLength: 400 },
    where: { type: 'array', maxItems: 3, items: { type: 'string' } }
  }
}

const isTestPath = (path: string): boolean => path.split('/').some((s) => TEST_SEGMENT.test(s)) || TEST_NAME.test(path) || XUNIT_NAME.test(path)

const sizeOf = (changed: number): MrSize => (changed < 100 ? 'S' : changed < 400 ? 'M' : changed < 1000 ? 'L' : 'XL')

/** M10: header lines (`---`/`+++` before a file's first hunk) are not changes. */
export function metrics(diff: string): MrMetrics {
  let added = 0
  let removed = 0
  let files = 0
  let tests = false
  let inHunk = false
  for (const line of diff.split('\n')) {
    const file = /^diff --git a\/.* b\/(.*)$/.exec(line)
    if (file) {
      files++
      inHunk = false
      if (isTestPath(file[1]!)) tests = true
    } else if (line.startsWith('@@')) inHunk = true
    else if (inHunk && line.startsWith('+')) added++
    else if (inHunk && line.startsWith('-')) removed++
  }
  return { added, removed, files, tests, size: sizeOf(added + removed) }
}

/** M11: whole files up to 120 KB; a single larger first file is cut at a line instead. */
export function cutDiff(diff: string): { text: string; cut?: { seen: number; total: number } } {
  const total = Buffer.byteLength(diff)
  if (total <= CUT_BYTES) return { text: diff }
  const files = diff.split(/(?=^diff --git )/m)
  let kept = ''
  for (const f of files) {
    if (Buffer.byteLength(kept + f) > CUT_BYTES) break
    kept += f
  }
  if (!kept) kept = Buffer.from(diff).subarray(0, CUT_BYTES).toString().replace(/\n[^\n]*$/, '\n')
  const seen = Buffer.byteLength(kept)
  return {
    text: `${kept}[Atril: this diff was cut at ${seen} of ${total} bytes; the remaining files are not shown]\n`,
    cut: { seen: Math.round(seen / 1024), total: Math.round(total / 1024) }
  }
}

function instruction(lang: string, m: MrMetrics): string {
  return [
    "Your stdin is a merge request's unified diff. Help a code reviewer decide how hard it is to review.",
    `Atril measured it: size ${m.size}, +${m.added} -${m.removed} lines, ${m.files} files, tests changed: ${m.tests ? 'yes' : 'no'}.`,
    'These measured values decide the size; you explain.',
    'Give the review difficulty and the risk from 1 to 5, what the MR does, why those numbers, and up to three places to look first.',
    `Answer in ${lang === 'en' ? 'English' : 'Spanish'}.`
  ].join(' ')
}

/** The schema, checked again in main: `--json-schema` is the CLI's promise, not ours. */
function validAi(v: unknown): v is MrAiScore {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  const scale = (n: unknown): boolean => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5
  return (
    Object.keys(o).every((k) => k in SCHEMA.properties) &&
    scale(o['difficulty']) &&
    scale(o['risk']) &&
    typeof o['what'] === 'string' &&
    o['what'].length <= 300 &&
    typeof o['why'] === 'string' &&
    o['why'].length <= 400 &&
    Array.isArray(o['where']) &&
    o['where'].length <= 3 &&
    o['where'].every((w) => typeof w === 'string')
  )
}

export class Failure extends Error {}

export type Get = (path: string, accept?: string) => Promise<Response>

export async function fetchDiff(get: Get, target: ScoreTarget): Promise<string> {
  if (target.forge === 'github') {
    const res = await get(target.ref, 'application/vnd.github.diff')
    return res.text()
  }
  let out = ''
  for (let page = 1; page <= GL_PAGES; page++) {
    const res = await get(`${target.ref}/diffs?per_page=100&page=${page}`)
    const files = (await res.json()) as Array<{ old_path: string; new_path: string; diff?: string; too_large?: boolean; collapsed?: boolean }>
    for (const f of Array.isArray(files) ? files : []) {
      out += `diff --git a/${f.old_path} b/${f.new_path}\n--- a/${f.old_path}\n+++ b/${f.new_path}\n`
      if (f.too_large || f.collapsed) out += '\\ GitLab did not send this file: too large\n'
      else out += f.diff && !f.diff.endsWith('\n') ? `${f.diff}\n` : (f.diff ?? '')
    }
    if (!res.headers.get('x-next-page')) break
  }
  return out
}

const cacheFile = (kind: string, url: string): string => join(atrilHome(), kind, `${createHash('sha256').update(url).digest('hex')}.json`)

export async function readStored<T>(kind: string, url: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(cacheFile(kind, url), 'utf8')) as T
  } catch {
    return null
  }
}

export async function writeStored(kind: string, url: string, value: unknown): Promise<void> {
  const file = cacheFile(kind, url)
  await mkdir(join(atrilHome(), kind), { recursive: true })
  await writeFile(`${file}.tmp`, JSON.stringify(value))
  await rename(`${file}.tmp`, file).catch(async (err) => {
    await rm(`${file}.tmp`, { force: true })
    throw err
  })
}

/** One claude at a time across scores and reviews, in the order asked (M14, M25). */
export function createQueue() {
  let chain: Promise<unknown> = Promise.resolve()
  return <T>(job: () => Promise<T>): Promise<T> => {
    const next = chain.then(job)
    chain = next.catch(() => undefined)
    return next
  }
}
export type Queue = ReturnType<typeof createQueue>

/** The forge's GET with the token in headers only; a redirect would carry it to another host. */
export function forgeGet(tgt: ScoreTarget, secret: Record<string, string> | null, fetchImpl: typeof fetch): Get {
  const name = FORGE_NAME[tgt.forge]
  const { base, headers } = forgeApi(tgt.forge, secret?.['site'] ?? 'https://gitlab.com', secret?.['token'] ?? '')
  return async (path, accept) => {
    let res: Response
    try {
      res = await fetchImpl(new URL(`${base}${path}`), { headers: { ...headers, ...(accept && { Accept: accept }) }, redirect: 'error', signal: AbortSignal.timeout(10_000) })
    } catch (err) {
      throw new Failure(networkText(name, err))
    }
    if (res.ok) return res
    throw new Failure(res.status === 406 && tgt.forge === 'github' ? t('es demasiado grande para {forge}', { forge: name }) : statusText(name, res.status))
  }
}

interface Deps {
  store: SecretStore
  run: Runner
  fetchImpl?: typeof fetch
  /** M17: the scorable row behind an URL, checked when asked. */
  target: (url: string) => ScoreTarget | undefined
  emit: (url: string, state: MrScoreState) => void
  /** Shared with the lens reviews; its own when absent. */
  queue?: Queue
}

/** M11–M17: scores on demand, one at a time, kept per MR and head commit. */
export function createScorer({ store, run, fetchImpl = fetch, target, emit, queue = createQueue() }: Deps) {
  const pending = new Map<string, { promise: Promise<MrScoreState>; state: MrScoreState }>()
  const failed = new Map<string, MrScoreState>()

  const set = (url: string, state: MrScoreState): MrScoreState => {
    const p = pending.get(url)
    if (p) p.state = state
    emit(url, state)
    return state
  }

  async function work(url: string, tgt: ScoreTarget): Promise<MrScoreState> {
    set(url, { state: 'running' })
    const secret = await store.readSecret(tgt.forge).catch(() => null)
    const get = forgeGet(tgt, secret, fetchImpl)

    let head = tgt.head
    let diff: string
    try {
      if (!secret?.['token']) throw new Failure(t('Conecta GitHub o GitLab en Ajustes'))
      // GitHub: the head of the diff about to be scored, read now rather than from the listing.
      if (tgt.forge === 'github') head = ((await (await get(tgt.ref)).json()) as { head?: { sha?: string } }).head?.sha
      const cached = head ? await readStored<MrScore>('scores', url) : null
      if (cached && cached.head === head) return { state: 'done', score: cached }
      diff = await fetchDiff(get, tgt)
    } catch (err) {
      if (!(err instanceof Failure)) throw err
      return { state: 'error', text: t('No se ha podido traer el diff: {detail}', { detail: err.message }) }
    }

    const m = metrics(diff)
    const lang = getLang()
    const { text, cut } = cutDiff(diff)
    const args = ['-p', '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--json-schema', JSON.stringify(SCHEMA), instruction(lang, m)]
    const r = await run('claude', args, { input: text, timeoutMs: CLAUDE_MS, secret: true })
    // M16: a code or a fixed word, never Claude's own output.
    const fail = (detail: string | number): MrScoreState => ({ state: 'error', text: t('Claude no ha podido puntuar esta MR ({detail})', { detail }) })
    if (r.code === 124) return fail(t('tiempo agotado'))
    if (r.code !== 0) return fail(r.code)
    let answer: { is_error?: unknown; structured_output?: unknown }
    try {
      answer = JSON.parse(r.stdout)
    } catch {
      return fail(t('respuesta fuera del esquema'))
    }
    if (answer?.is_error !== false || !validAi(answer.structured_output)) return fail(t('respuesta fuera del esquema'))

    const score: MrScore = { ...(head && { head }), metrics: m, ai: answer.structured_output, lang, ...(cut && { cut }), at: new Date().toISOString() }
    await writeStored('scores', url, score)
    return { state: 'done', score }
  }

  return {
    score(url: string): Promise<MrScoreState> {
      const running = pending.get(url)
      if (running) return running.promise
      const tgt = target(url)
      if (!tgt) return Promise.resolve({ state: 'error', text: t('Solo se pueden puntuar tus MR y las que te toca revisar') })
      failed.delete(url)
      const promise = queue(() => work(url, tgt))
        .catch((): MrScoreState => ({ state: 'error', text: t('Claude no ha podido puntuar esta MR ({detail})', { detail: 'error' }) }))
        .then((state) => {
          pending.delete(url)
          if (state.state === 'error') failed.set(url, state)
          emit(url, state)
          return state
        })
      pending.set(url, { promise, state: { state: 'queued' } })
      emit(url, { state: 'queued' })
      return promise
    },

    async stateOf(urls: string[]): Promise<Record<string, MrScoreState>> {
      const out: Record<string, MrScoreState> = {}
      for (const url of urls) {
        const live = pending.get(url)?.state ?? failed.get(url)
        if (live) out[url] = live
        else {
          const cached = await readStored<MrScore>('scores', url)
          out[url] = cached ? { state: 'done', score: cached } : { state: 'none' }
        }
      }
      return out
    }
  }
}
