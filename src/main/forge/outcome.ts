import type { ForgeId } from '../../preload/api'
import type { OutcomeOf } from '../avisos'
import { forgeApi } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'

const MAX = 10

/** The API path for an MR URL, only when it is on the saved site; GitLab's id is the project path, encoded. */
function apiPath(forge: ForgeId, url: string, site: string): string | undefined {
  try {
    const u = new URL(url)
    if (forge === 'github') {
      const m = u.hostname === 'github.com' ? /^\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)$/.exec(u.pathname) : null
      // A dot segment would walk the API path elsewhere with the token.
      return m && ![m[1], m[2]].some((p) => /^\.+$/.test(p!)) ? `/repos/${m[1]}/${m[2]}/pulls/${m[3]}` : undefined
    }
    const m = u.origin === new URL(site).origin ? /^\/(.+?)\/-\/merge_requests\/(\d+)$/.exec(u.pathname) : null
    return m ? `/projects/${encodeURIComponent(decodeURIComponent(m[1]!))}/merge_requests/${m[2]}` : undefined
  } catch {
    return undefined
  }
}

/** W184: one request per MR that left Mías, at most 10; open, an error, a timeout or no token answer nothing. */
export function createOutcome(store: SecretStore, fetchImpl: typeof fetch = fetch): OutcomeOf {
  return async (gone) => {
    const out: Record<string, 'merged' | 'closed'> = {}
    await Promise.all(
      gone.slice(0, MAX).map(async ({ url, forge }) => {
        const secret = await store.readSecret(forge).catch(() => null)
        if (!secret?.['token']) return
        const site = secret['site'] ?? 'https://gitlab.com'
        const path = apiPath(forge, url, site)
        if (!path) return
        const { base, headers } = forgeApi(forge, site, secret['token'])
        try {
          // A redirect would carry the token to another host.
          const res = await fetchImpl(new URL(`${base}${path}`), { headers, redirect: 'error', signal: AbortSignal.timeout(10_000) })
          if (!res.ok) return
          const b = (await res.json()) as { merged?: unknown; state?: unknown }
          if (forge === 'github' ? b.merged === true : b.state === 'merged') out[url] = 'merged'
          else if (b.state === 'closed') out[url] = 'closed'
        } catch {
          /* unknown: «Ya no está abierta» */
        }
      })
    )
    return out
  }
}
