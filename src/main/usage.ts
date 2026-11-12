import type { UsageResult, UsageWindow } from '../preload/api'
import type { Runner } from './run'
import { t } from './lang'

const ENDPOINT = 'https://api.anthropic.com/api/oauth/usage'

type Fetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<Response>

function windowOf(raw: unknown): UsageWindow | null {
  const w = raw as { utilization?: unknown; resets_at?: unknown } | null | undefined
  if (typeof w?.utilization !== 'number') return null
  // The endpoint sends ISO strings; the statusline also tolerates epoch seconds.
  const at = w.resets_at
  const resetsAt = typeof at === 'number' ? new Date(at * 1000).toISOString() : typeof at === 'string' ? at : null
  return { pct: Math.round(w.utilization), resetsAt }
}

type UsageError = Extract<UsageResult, { error: string }>
// W20: one sentence per cause; the status or failing step goes to the folded detail only.
const noSession = (detail: string): UsageError => ({ error: t('Claude Code no tiene la sesión abierta en este Mac: no puedo leer tu cuota.'), detail, fix: 'claude' })
const failed = (detail: string): UsageError => ({ error: t('No puedo leer tu cuota de Claude ahora: lo intento de nuevo en unos minutos.'), detail, fix: 'retry' })

export function parseUsage(body: unknown): UsageResult {
  const b = body as { five_hour?: unknown; seven_day?: unknown } | null
  const fiveHour = windowOf(b?.five_hour)
  const sevenDay = windowOf(b?.seven_day)
  if (!fiveHour || !sevenDay) return failed(t('respuesta de uso con formato desconocido'))
  return { fiveHour, sevenDay }
}

// The token is a local of this function: it goes to the Authorization header and nowhere else.
// Every error reason is a fixed string or a status number, so none can carry it.
export async function readUsage(run: Runner, doFetch: Fetch = fetch): Promise<UsageResult> {
  const kc = await run('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { secret: true })
  if (kc.code !== 0 || !kc.stdout.trim()) return noSession(t('llavero: código {code}', { code: kc.code }))

  let token: unknown
  try {
    token = (JSON.parse(kc.stdout) as { claudeAiOauth?: { accessToken?: unknown } }).claudeAiOauth?.accessToken
  } catch {
    return noSession(t('las credenciales de Claude Code no son JSON válido'))
  }
  if (typeof token !== 'string' || !token) return noSession(t('las credenciales de Claude Code no traen token'))

  let res: Response
  try {
    res = await doFetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20' },
      signal: AbortSignal.timeout(10_000)
    })
  } catch (err) {
    return { error: t('No llego a Claude para leer tu cuota: ¿hay conexión?'), detail: err instanceof Error ? err.name : 'Error', fix: 'retry' }
  }
  if (res.status === 401) return { error: t('Claude ha caducado tu sesión: ábrela otra vez en Claude Code.'), detail: 'HTTP 401', fix: 'claude' }
  if (res.status === 429) return { error: t('Claude no me deja leer tu cuota ahora: demasiadas consultas. Lo intento solo más tarde.'), detail: 'HTTP 429', fix: 'retry' }
  if (!res.ok) return failed(`HTTP ${res.status}`)
  try {
    return parseUsage(await res.json())
  } catch {
    return failed(t('respuesta de uso ilegible'))
  }
}

const POLL_MS = 60_000
const MAX_WAIT_MS = 10 * 60_000

export function createUsage(deps: { run: Runner; emit: (u: UsageResult) => void; fetch?: Fetch }) {
  let last: UsageResult = failed(t('aún sin leer'))
  let good: { value: UsageResult; at: number } | undefined
  let wait = POLL_MS
  let timer: NodeJS.Timeout | undefined
  let running = false

  const refresh = async (): Promise<UsageResult> => {
    const r = await readUsage(deps.run, deps.fetch)
    if ('error' in r) {
      // The statusline polls the same endpoint: back off instead of hammering it, keep the last good numbers.
      wait = Math.min(wait * 2, MAX_WAIT_MS)
      last = good ? { ...(good.value as Exclude<UsageResult, { error: string }>), stale: { since: good.at } } : r
    } else {
      wait = POLL_MS
      good = { value: r, at: Date.now() }
      last = r
    }
    deps.emit(last)
    return last
  }
  const loop = async (): Promise<void> => {
    await refresh()
    if (running) timer = setTimeout(() => void loop(), wait)
  }
  return {
    get: () => refresh(),
    start: () => {
      running = true
      void loop()
    },
    stop: () => {
      running = false
      clearTimeout(timer)
    },
    last: () => last
  }
}

export type QuotaCrossing = { window: 'fiveHour' | 'sevenDay'; pct: number; resetsAt: string | null }

/** W183: a window reaching 80 % after a reading below it in the same window; once per window and `resetsAt`. */
export function createQuotaWatch(): (u: UsageResult) => QuotaCrossing[] {
  let prev: { fiveHour: UsageWindow; sevenDay: UsageWindow } | undefined
  const fired = new Set<string>()
  return (u) => {
    // An error, or the last good numbers repeated, is no reading.
    if ('error' in u || u.stale) return []
    const out: QuotaCrossing[] = []
    for (const window of ['fiveHour', 'sevenDay'] as const) {
      const w = u[window]
      const was = prev?.[window]
      const key = `${window}\n${w.resetsAt}`
      if (w.pct >= 80 && was && was.resetsAt === w.resetsAt && was.pct < 80 && !fired.has(key)) {
        fired.add(key)
        out.push({ window, pct: w.pct, resetsAt: w.resetsAt })
      }
    }
    prev = { fiveHour: u.fiveHour, sevenDay: u.sevenDay }
    return out
  }
}
