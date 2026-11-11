import type { ForgeId, ForgeStatus } from '../../preload/api'
import { t } from '../lang'
import { netProblem, type NetProblem } from '../net-problem'
import type { SecretStore } from './store'

export type { ForgeId }
export const FORGES: readonly ForgeId[] = ['github', 'gitlab']
export const FORGE_NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

export interface ForgeCreds {
  /** GitLab only; GitHub is always github.com. */
  site?: string
  token: string
}

/** Where the forge's REST API lives and how a token is presented to it. */
export function forgeApi(forge: ForgeId, site: string, token: string): { base: string; headers: Record<string, string> } {
  return forge === 'github'
    ? { base: 'https://api.github.com', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    : { base: `${site}/api/v4`, headers: { 'PRIVATE-TOKEN': token, Accept: 'application/json' } }
}

/** Network error codes are an enumeration (ENOTFOUND…): safe to show; a message could echo the request. */
export function networkCode(err: unknown): string {
  const cause = (err as { cause?: { code?: unknown } }).cause?.code
  if (typeof cause === 'string' && /^[A-Z0-9_]+$/.test(cause)) return cause
  return err instanceof Error ? err.name : 'Error'
}

/** S34: the W150 sentence and «No se ha guardado.»; the code goes to the folded detail. */
const notSaved = (p: NetProblem): { error: string; detail: string } => ({ error: `${p.error} ${t('No se ha guardado.')}`, detail: p.detail })

async function check(forge: ForgeId, site: string, token: string, fetchImpl: typeof fetch): Promise<{ account: string } | { error: string; detail?: string }> {
  const name = FORGE_NAME[forge]
  const { base, headers } = forgeApi(forge, site, token)
  try {
    // A redirect would carry the token to another host.
    const res = await fetchImpl(new URL(`${base}/user`), { headers, redirect: 'error', signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return notSaved(netProblem(name, { status: res.status }))
    const me = (await res.json()) as { login?: string; username?: string; name?: string }
    return { account: me.login || me.username || me.name || name }
  } catch (err) {
    return notSaved(netProblem(name, { error: err }))
  }
}

/** S20, S25: stored only after the forge accepts the token; the window only ever sees saved, account and site. */
export const forgeSettings = (store: SecretStore, fetchImpl: typeof fetch = fetch) => ({
  async status(forge: ForgeId): Promise<ForgeStatus> {
    const s = await store.hasSecret(forge)
    return s.saved ? { saved: true, account: s.account, site: s.site } : { saved: false }
  },

  async save(forge: ForgeId, creds: ForgeCreds): Promise<{ account: string } | { error: string; detail?: string }> {
    let site = 'https://github.com'
    if (forge === 'gitlab') {
      let url: URL
      try {
        url = new URL((creds.site || 'https://gitlab.com').trim())
      } catch {
        return { error: t('La dirección de GitLab no es válida.') }
      }
      if (url.protocol !== 'https:') return { error: t('La dirección de GitLab debe empezar por https://') }
      site = url.origin
    }
    const checked = await check(forge, site, creds.token.trim(), fetchImpl)
    if ('error' in checked) return checked
    const saved = await store.saveSecret(forge, { token: creds.token.trim(), site }, { account: checked.account, site })
    return 'error' in saved ? saved : checked
  },

  delete: (forge: ForgeId): Promise<void> => store.deleteSecret(forge)
})
