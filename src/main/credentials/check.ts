export interface JiraCreds {
  site: string
  email: string
  token: string
}

export type CheckResult = { account: string } | { error: string }

export async function checkJira(
  { site, email, token }: JiraCreds,
  fetchImpl: typeof fetch = fetch
): Promise<CheckResult> {
  let base: URL
  try {
    base = new URL(site.trim())
  } catch {
    return { error: 'La dirección de Jira no es válida. Usa algo como https://tuempresa.atlassian.net' }
  }
  if (base.protocol !== 'https:') return { error: 'La dirección de Jira debe empezar por https://' }

  const auth = Buffer.from(`${email}:${token}`).toString('base64')
  try {
    const res = await fetchImpl(new URL('/rest/api/3/myself', base.origin), {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return { error: `Jira ha rechazado el token (${res.status}). No se ha guardado.` }
    const me = (await res.json()) as { displayName?: string; emailAddress?: string }
    return { account: me.displayName || me.emailAddress || email }
  } catch (err) {
    // Network errors can echo the request; never pass err.message through. Codes are an
    // enumeration (ENOTFOUND, CERT_HAS_EXPIRED…), safe to show and the only way to debug.
    const timeout = err instanceof Error && err.name === 'TimeoutError'
    const cause = (err as { cause?: { code?: unknown } }).cause?.code
    const code = typeof cause === 'string' && /^[A-Z0-9_]+$/.test(cause) ? cause : err instanceof Error ? err.name : 'Error'
    console.error(`[atril] Jira check failed: ${code}`)
    return { error: timeout ? 'Jira no ha respondido en 10 s.' : `No se ha podido conectar con Jira (${code}).` }
  }
}
