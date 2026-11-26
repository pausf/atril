// Dev-only: a session drives the real window over CDP (ATRIL_CDP_PORT). The port must belong to
// THIS launch: the launcher chooses ATRIL_LAUNCH_TOKEN, the page loads with it in its URL, and
// the app and the driver both check it there before anything is read (issue #13).
export const LAUNCH_QUERY = 'launch'

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/

export type CdpConfig = { port: number; token: string }

export function cdpConfig(o: { packaged: boolean; env: Record<string, string | undefined> }): CdpConfig | { error: string } | undefined {
  const raw = o.env['ATRIL_CDP_PORT']
  if (o.packaged || !raw) return undefined
  const port = /^\d+$/.test(raw) ? Number(raw) : NaN
  if (!(port >= 1024 && port <= 65535)) return { error: 'ATRIL_CDP_PORT must be a whole number from 1024 to 65535' }
  const token = o.env['ATRIL_LAUNCH_TOKEN']
  if (!token || !TOKEN.test(token)) return { error: 'ATRIL_LAUNCH_TOKEN is required with ATRIL_CDP_PORT: 16 to 128 characters of A-Z a-z 0-9 _ -' }
  return { port, token }
}

export function withLaunch(url: string, token: string): string {
  const u = new URL(url)
  u.searchParams.set(LAUNCH_QUERY, token)
  return u.toString()
}

// True only when the debugger on this port lists a page whose URL carries OUR token as the
// `launch` parameter: another Atril's pages (or a longer token that merely starts with ours) never match.
export async function verifyOwnTarget(port: number, token: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchFn(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1500) })
    if (!res.ok) return false
    const targets: unknown = await res.json()
    return Array.isArray(targets) && targets.some((t: { type?: unknown; url?: unknown }) => {
      if (t?.type !== 'page' || typeof t.url !== 'string') return false
      try { return new URL(t.url).searchParams.get(LAUNCH_QUERY) === token } catch { return false }
    })
  } catch {
    return false
  }
}

// The target list fills a moment after a page exists, so ask a few times before giving up.
export async function guardCdp(o: { verify: () => Promise<boolean>; attempts: number; delayMs: number; sleep: (ms: number) => Promise<void>; port: number; err: (line: string) => void; exit: (code: number) => void }): Promise<void> {
  for (let i = 0; i < o.attempts; i++) {
    if (await o.verify()) return
    if (i < o.attempts - 1) await o.sleep(o.delayMs)
  }
  o.err(`atril: ATRIL_CDP_PORT ${o.port} is busy or not served by this app; refusing to start\n`)
  o.exit(1)
}
