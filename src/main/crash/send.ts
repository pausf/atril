import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { forgeApi, networkCode } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { t } from '../lang'
import { atrilHome } from '../paths'
import { patchUi, readUi } from '../ui'
import { buildReport, type RawCrash, type Versions } from './report'

export const OFFICIAL_REPO = 'pausf/atril'
const OWNER = OFFICIAL_REPO.split('/')[0]
const DAY = 86_400_000
const CAP = 5

export interface CrashDeps {
  store: Pick<SecretStore, 'readSecret'>
  fetch: typeof fetch
  now: () => number
  home: string
  versions: Versions
  /** Per request; 20 s unless a test makes it short. */
  timeoutMs?: number
}

/** What has been sent, what failed when, and every attempt; failures and attempts older than a day are dropped. */
interface Ledger {
  sent: Record<string, string>
  failed: Record<string, number>
  times: number[]
}

const file = (): string => join(atrilHome(), 'crash-sent.json')

async function readLedger(now: number): Promise<Ledger> {
  let r: Partial<Ledger> = {}
  try {
    r = JSON.parse(await readFile(file(), 'utf8')) as Partial<Ledger>
  } catch {
    // Missing or damaged: start over.
  }
  const failed = Object.fromEntries(Object.entries(r.failed ?? {}).filter(([, at]) => typeof at === 'number' && now - at < DAY))
  const times = (Array.isArray(r.times) ? r.times : []).filter((at) => typeof at === 'number' && now - at < DAY)
  return { sent: r.sent ?? {}, failed, times }
}

async function writeLedger(l: Ledger): Promise<void> {
  await mkdir(atrilHome(), { recursive: true })
  const tmp = `${file()}.tmp`
  await writeFile(tmp, JSON.stringify(l, null, 2))
  await rename(tmp, file())
}

/** A non-2xx answer; `reason` is GitHub's own message, never the request. */
class Refused extends Error {
  constructor(readonly reason: string) {
    super(reason)
  }
}

export function createCrash(d: CrashDeps) {
  let busy = false
  const timeout = d.timeoutMs ?? 20_000

  async function send(raw: Omit<RawCrash, 'at'>): Promise<void> {
    if ((await readUi()).crashReports !== 'on') return
    const token = (await d.store.readSecret('github'))?.['token']
    if (!token) return
    const at = d.now()
    const report = buildReport({ ...raw, at }, d)
    const sig = report.signature
    const ledger = await readLedger(at)
    if (sig in ledger.sent || sig in ledger.failed || ledger.times.length >= CAP) return
    ledger.times.push(at)
    await writeLedger(ledger)

    const { base, headers } = forgeApi('github', '', token)
    /** `skip` is the one non-2xx that means «already there» for this call. */
    const call = async (method: string, path: string, body?: object, skip?: number): Promise<{ status: number; data: Record<string, unknown> | unknown[] | null }> => {
      const res = await d.fetch(new URL(`${base}/repos/${OFFICIAL_REPO}${path}`), {
        method,
        headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        // A redirect would carry the token to another host.
        redirect: 'error',
        signal: AbortSignal.timeout(timeout)
      })
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | unknown[] | null
      if (!res.ok && res.status !== skip) {
        const message = data && !Array.isArray(data) ? data['message'] : undefined
        throw new Refused(typeof message === 'string' ? message.slice(0, 200) : `HTTP ${res.status}`)
      }
      return { status: res.status, data }
    }
    const field = (data: unknown, key: string): unknown => (data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>)[key] : undefined)

    const branch = `atril-fallo/${sig}`
    const path = `fallos/${sig}.md`
    try {
      const repo = (await call('GET', '')).data
      if (field(repo, 'private') !== true) {
        await patchUi({ crashLast: { at, error: t('pausf/atril no es privado: no envío fallos ahí.') } })
        return
      }
      const main = String(field(repo, 'default_branch') ?? 'main')
      const prs = (await call('GET', `/pulls?head=${encodeURIComponent(`${OWNER}:${branch}`)}&state=all`)).data
      const prior = Array.isArray(prs) ? field(prs[0], 'html_url') : undefined
      if (typeof prior === 'string') {
        ledger.sent[sig] = prior
        await writeLedger(ledger)
        return
      }
      const sha = field(field((await call('GET', `/git/ref/heads/${main}`)).data, 'object'), 'sha')
      if ((await call('GET', `/git/ref/heads/${branch}`, undefined, 404)).status === 404) await call('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha })
      if ((await call('GET', `/contents/${path}?ref=${encodeURIComponent(branch)}`, undefined, 404)).status === 404)
        await call('PUT', `/contents/${path}`, { message: `docs(fallos): ${sig}`, content: Buffer.from(report.markdown).toString('base64'), branch })
      const pr = await call('POST', '/pulls', { title: report.title, head: branch, base: main, body: report.markdown })
      const url = String(field(pr.data, 'html_url') ?? '')
      ledger.sent[sig] = url
      await writeLedger(ledger)
      await patchUi({ crashLast: { at, url } })
    } catch (err) {
      ledger.failed[sig] = at
      await writeLedger(ledger)
      await patchUi({ crashLast: { at, error: err instanceof Refused ? err.reason : networkCode(err) } })
    }
  }

  return {
    /** R4/R7: gates first; nothing thrown here ever leaves, so a failed send never reports itself. */
    async report(raw: Omit<RawCrash, 'at'>): Promise<void> {
      if (busy) return
      busy = true
      try {
        await send(raw)
      } catch {
        // A broken disk or ledger must not become another crash report.
      } finally {
        busy = false
      }
    }
  }
}

export type Crash = ReturnType<typeof createCrash>
