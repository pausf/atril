import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { forgeApi, networkCode } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { atrilHome } from '../paths'
import { patchUi, readUi } from '../ui'
import { buildReport, type RawCrash, type Versions } from './report'

export const OFFICIAL_REPO = 'pausf/atril'
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

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** R4: a missing, damaged or wrongly-shaped file reads as empty; the next write replaces it. */
async function readLedger(now: number): Promise<Ledger> {
  let r: unknown = null
  try {
    r = JSON.parse(await readFile(file(), 'utf8'))
  } catch {
    // Missing or unparsable: start over.
  }
  const o = isRecord(r) ? r : {}
  const sent = Object.fromEntries(Object.entries(isRecord(o['sent']) ? o['sent'] : {}).filter((e): e is [string, string] => typeof e[1] === 'string'))
  const failed = Object.fromEntries(Object.entries(isRecord(o['failed']) ? o['failed'] : {}).filter((e): e is [string, number] => typeof e[1] === 'number' && now - e[1] < DAY))
  const times = (Array.isArray(o['times']) ? o['times'] : []).filter((at): at is number => typeof at === 'number' && now - at < DAY)
  return { sent, failed, times }
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
    const call = async (method: string, path: string, body?: object): Promise<{ status: number; data: Record<string, unknown> | unknown[] | null }> => {
      const res = await d.fetch(new URL(`${base}${path}`), {
        method,
        headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        // A redirect would carry the token to another host.
        redirect: 'error',
        signal: AbortSignal.timeout(timeout)
      })
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | unknown[] | null
      if (!res.ok) {
        const message = data && !Array.isArray(data) ? data['message'] : undefined
        throw new Refused(typeof message === 'string' ? message.slice(0, 200) : `HTTP ${res.status}`)
      }
      return { status: res.status, data }
    }
    const field = (data: unknown, key: string): unknown => (data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>)[key] : undefined)

    try {
      // The signature rides in every title, so an issue or PR from any Mac is found.
      const q = new URLSearchParams({ q: `repo:${OFFICIAL_REPO} in:title ${sig}` })
      const found = field((await call('GET', `/search/issues?${q}`)).data, 'items')
      const prior = Array.isArray(found) ? field(found[0], 'html_url') : undefined
      if (typeof prior === 'string') {
        ledger.sent[sig] = prior
        await writeLedger(ledger)
        return
      }
      // R8: the repo's own workflow turns the marked issue into a branch, a file and a PR.
      const title = `Crash ${sig}: ${report.title.replace(/^Crash: /, '')}`
      const issue = await call('POST', `/repos/${OFFICIAL_REPO}/issues`, { title, body: `${report.markdown}<!-- atril-crash ${sig} -->\n` })
      const url = String(field(issue.data, 'html_url') ?? '')
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
