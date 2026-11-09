import { t } from '../lang'

export interface JiraCreds {
  site: string
  email: string
  token: string
}

export type CheckResult = { account: string; avatar?: string } | { error: string }

const MAX_AVATAR = 200 * 1024

/** The image as a data URL, so the renderer never talks to Atlassian. Any failure means no avatar. */
async function fetchAvatar(url: string, site: URL, auth: string, fetchImpl: typeof fetch): Promise<string | undefined> {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return undefined
    // The token only goes to the Jira site itself; Atlassian's avatar CDN is public.
    const res = await fetchImpl(u, {
      headers: u.origin === site.origin ? { Authorization: `Basic ${auth}` } : {},
      signal: AbortSignal.timeout(5_000)
    })
    const type = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png'
    if (!res.ok || !type.startsWith('image/')) return undefined
    const bytes = Buffer.from(await res.arrayBuffer())
    return bytes.length > 0 && bytes.length <= MAX_AVATAR ? `data:${type};base64,${bytes.toString('base64')}` : undefined
  } catch {
    return undefined
  }
}

export async function checkJira(
  { site, email, token }: JiraCreds,
  fetchImpl: typeof fetch = fetch
): Promise<CheckResult> {
  let base: URL
  try {
    base = new URL(site.trim())
  } catch {
    return { error: t('La dirección de Jira no es válida. Usa algo como https://tuempresa.atlassian.net') }
  }
  if (base.protocol !== 'https:') return { error: t('La dirección de Jira debe empezar por https://') }

  const auth = Buffer.from(`${email}:${token}`).toString('base64')
  try {
    const res = await fetchImpl(new URL('/rest/api/3/myself', base.origin), {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return { error: t('Jira ha rechazado el token ({status}). No se ha guardado.', { status: res.status }) }
    const me = (await res.json()) as { displayName?: string; emailAddress?: string; avatarUrls?: Record<string, string> }
    const url = me.avatarUrls?.['48x48']
    const avatar = url ? await fetchAvatar(url, base, auth, fetchImpl) : undefined
    return { account: me.displayName || me.emailAddress || email, ...(avatar && { avatar }) }
  } catch (err) {
    // Network errors can echo the request; never pass err.message through. Codes are an
    // enumeration (ENOTFOUND, CERT_HAS_EXPIRED…), safe to show and the only way to debug.
    const timeout = err instanceof Error && err.name === 'TimeoutError'
    const cause = (err as { cause?: { code?: unknown } }).cause?.code
    const code = typeof cause === 'string' && /^[A-Z0-9_]+$/.test(cause) ? cause : err instanceof Error ? err.name : 'Error'
    console.error(`[atril] Jira check failed: ${code}`)
    return { error: timeout ? t('Jira no ha respondido en 10 s.') : t('No se ha podido conectar con Jira ({code}).', { code }) }
  }
}
