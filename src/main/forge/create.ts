import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { FORGE_NAME, forgeApi, networkCode, type ForgeId } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { t } from '../lang'
import { registerRepo } from '../repos'
import type { Runner } from '../run'

export interface CreateRequest {
  forge: ForgeId
  name: string
  description: string
  public: boolean
  /** S23 enforced in main too: public without this is refused. */
  confirmPublic?: boolean
}
export type Created = { url: string; sshUrl: string; path: string }

const NAME_RE = /^[A-Za-z0-9._-]{1,100}$/

/** W49: what both forges accept as a plain repo name; anything stranger is refused before a request. */
export const validRepoName = (name: string): boolean => NAME_RE.test(name) && name !== '.' && name !== '..'

/** The forge's own words for a refusal: GitHub nests them under errors[], GitLab under message. */
function reason(body: unknown, status: number): string {
  const b = (body ?? {}) as { message?: unknown; errors?: { message?: unknown }[] }
  const nested = b.errors?.map((e) => e.message).find((m) => typeof m === 'string')
  const text =
    typeof nested === 'string'
      ? nested
      : typeof b.message === 'string'
        ? b.message
        : b.message && typeof b.message === 'object'
          ? Object.entries(b.message).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(', ') : String(v)}`).join('; ')
          : `HTTP ${status}`
  return text.slice(0, 200)
}

/** W50: a personal repo with a README, private unless confirmed public. */
export async function createRepo(store: SecretStore, req: CreateRequest, fetchImpl: typeof fetch = fetch): Promise<Created | { error: string }> {
  const name = req.name
  if (!validRepoName(name)) return { error: t('Nombre de repo no válido') }
  if (req.public && req.confirmPublic !== true) return { error: t('Un repo público necesita tu confirmación.') }
  const forgeName = FORGE_NAME[req.forge]
  const secret = await store.readSecret(req.forge)
  if (!secret?.['token']) return { error: t('Conecta {forge} en Ajustes antes de crear un repo.', { forge: forgeName }) }
  const { base, headers } = forgeApi(req.forge, secret['site'] ?? 'https://gitlab.com', secret['token'])
  const body =
    req.forge === 'github'
      ? { name, description: req.description, private: !req.public, auto_init: true }
      : { name, description: req.description, visibility: req.public ? 'public' : 'private', initialize_with_readme: true }
  try {
    const res = await fetchImpl(new URL(`${base}${req.forge === 'github' ? '/user/repos' : '/projects'}`), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // A redirect would carry the token to another host.
      redirect: 'error',
      signal: AbortSignal.timeout(20_000)
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) return { error: t('{forge} no ha creado el repo: {detail}', { forge: forgeName, detail: reason(data, res.status) }) }
    const url = String(data['html_url'] ?? data['web_url'] ?? '')
    const sshUrl = String(data['ssh_url'] ?? data['ssh_url_to_repo'] ?? '')
    const path = String(data['name'] && req.forge === 'github' ? data['name'] : (data['path'] ?? name))
    return { url, sshUrl, path }
  } catch (err) {
    return { error: t('No se ha podido conectar con {forge} ({detail}).', { forge: forgeName, detail: networkCode(err) }) }
  }
}

export type CloneResult = { registered: string } | { cloneError: string; cloneCommand: string }

/**
 * W51: clone the forge's SSH URL into <folder>/<path> and register it. No credential ever goes
 * into the command or its environment; BatchMode makes a missing key fail instead of prompting.
 */
export async function cloneAndRegister(created: Created, folder: string, run: Runner): Promise<CloneResult> {
  const dest = join(folder, created.path)
  const cloneCommand = `git clone ${created.sshUrl} ${dest}`
  if (existsSync(dest)) return { cloneError: t('La carpeta {detail} ya existe: no se ha clonado.', { detail: dest }), cloneCommand }
  // Only what git and ssh need: no credential-like variable from the person's shell rides along.
  const env: NodeJS.ProcessEnv = { GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' }
  for (const k of ['PATH', 'HOME', 'USER', 'LANG', 'SSH_AUTH_SOCK', 'TMPDIR']) if (process.env[k]) env[k] = process.env[k]
  const r = await run('git', ['clone', '--', created.sshUrl, dest], { env })
  if (r.code !== 0) {
    const detail = r.stderr.trim().split('\n').at(-1)?.slice(0, 160) ?? ''
    return { cloneError: t('No se ha podido clonar por SSH ({detail}). Hazlo a mano:', { detail }), cloneCommand }
  }
  let reg = await registerRepo(dest, run)
  if ('error' in reg && reg.error === 'invalid-id') reg = await registerRepo(dest, run, { id: 'repo' })
  if ('suggested' in reg) reg = await registerRepo(dest, run, { id: reg.suggested })
  if ('error' in reg) return { cloneError: t('Clonado en {detail}, pero no se ha podido añadir a Atril.', { detail: dest }), cloneCommand }
  return { registered: reg.repo.id }
}
