import type { UsageResult, UsageWindow } from '../preload/api'
import type { Runner } from './run'

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

export function parseUsage(body: unknown): UsageResult {
  const b = body as { five_hour?: unknown; seven_day?: unknown } | null
  const fiveHour = windowOf(b?.five_hour)
  const sevenDay = windowOf(b?.seven_day)
  if (!fiveHour || !sevenDay) return { error: 'respuesta de uso con formato desconocido' }
  return { fiveHour, sevenDay }
}

// The token is a local of this function: it goes to the Authorization header and nowhere else.
// Every error reason is a fixed string, so none can carry it.
export async function readUsage(run: Runner, doFetch: Fetch = fetch): Promise<UsageResult> {
  const kc = await run('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { secret: true })
  if (kc.code !== 0 || !kc.stdout.trim()) return { error: 'no hay sesión de Claude Code en el llavero' }

  let token: unknown
  try {
    token = (JSON.parse(kc.stdout) as { claudeAiOauth?: { accessToken?: unknown } }).claudeAiOauth?.accessToken
  } catch {
    return { error: 'las credenciales de Claude Code no son JSON válido' }
  }
  if (typeof token !== 'string' || !token) return { error: 'las credenciales de Claude Code no traen token' }

  let res: Response
  try {
    res = await doFetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20' },
      signal: AbortSignal.timeout(10_000)
    })
  } catch {
    return { error: 'no se pudo consultar api.anthropic.com' }
  }
  if (res.status === 401) return { error: 'Claude rechazó el token (401); abre Claude Code para renovarlo' }
  if (!res.ok) return { error: `api.anthropic.com respondió ${res.status}` }
  try {
    return parseUsage(await res.json())
  } catch {
    return { error: 'respuesta de uso ilegible' }
  }
}

export function createUsage(deps: { run: Runner; emit: (u: UsageResult) => void; fetch?: Fetch }) {
  let last: UsageResult = { error: 'aún sin leer' }
  const refresh = async (): Promise<UsageResult> => {
    last = await readUsage(deps.run, deps.fetch)
    deps.emit(last)
    return last
  }
  let timer: NodeJS.Timeout | undefined
  return {
    get: () => refresh(),
    start: () => {
      void refresh()
      timer = setInterval(() => void refresh(), 60_000)
    },
    stop: () => clearInterval(timer),
    last: () => last
  }
}
