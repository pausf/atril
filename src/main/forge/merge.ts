import type { MrListName, MrLists, MrMergeResult } from '../../preload/api'
import { FORGE_NAME, forgeApi, type ForgeId } from '../credentials/forge'
import type { SecretStore } from '../credentials/store'
import { t } from '../lang'
import { netProblem } from '../net-problem'

/** What main knows of an MR from its latest listing; the API path never leaves main. */
export interface MergeEntry {
  list: MrListName
  forge: ForgeId
  ref: string
  head?: string
  mergeable?: true
}

interface Deps {
  store: SecretStore
  fetchImpl?: typeof fetch
  /** M41: the MR behind an URL in main's latest listing. */
  entry: (url: string) => MergeEntry | undefined
  /** Lists again after a merge, so the MR leaves Mías. */
  relist: () => Promise<MrLists>
}

/** M41, M50: merges an MR of Mías once, only confirmed and only when the forge said it could. */
export function createMerge({ store, fetchImpl = fetch, entry, relist }: Deps) {
  const busy = new Set<string>()
  const refused = (): MrMergeResult => ({ error: t('Esta MR no se puede fusionar desde Atril ahora: actualiza'), fix: 'retry' })

  async function put(e: MergeEntry & { head: string }): Promise<MrMergeResult> {
    const secret = await store.readSecret(e.forge).catch(() => null)
    if (!secret?.['token']) return refused()
    const name = FORGE_NAME[e.forge]
    const { base, headers } = forgeApi(e.forge, secret['site'] ?? 'https://gitlab.com', secret['token'])
    // The head we listed: the forge refuses with 409 if the MR moved since.
    const body = e.forge === 'github' ? { merge_method: 'squash', sha: e.head } : { sha: e.head }
    let res: Response
    try {
      // A redirect would carry the token to another host.
      res = await fetchImpl(new URL(`${base}${e.ref}/merge`), { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(10_000) })
    } catch (err) {
      return netProblem(name, { error: err })
    }
    if (res.status === 409) return { error: t('La MR ha cambiado desde que la abriste: actualiza y vuelve a mirarla.'), fix: 'retry' }
    if ([405, 406, 422].includes(res.status)) return { error: t('{forge} no ha dejado fusionar esta MR.', { forge: name }), fix: 'forge' }
    if (!res.ok) return netProblem(name, { status: res.status })
    const listed = await relist().catch(() => null)
    const failed = listed ? listed.errors[0] : { error: t('No he podido volver a listar tus MR.'), detail: 'Error', fix: 'retry' as const }
    return failed ? { merged: true, list: { error: failed.error, detail: failed.detail, fix: failed.fix } } : { merged: true }
  }

  return {
    async merge(url: string, confirmed: boolean): Promise<MrMergeResult> {
      if (busy.has(url)) return { error: t('Ya se está fusionando esta MR'), fix: 'retry' }
      const e = entry(url)
      if (confirmed !== true || !e || e.list !== 'mine' || e.mergeable !== true || !e.head) return refused()
      busy.add(url)
      try {
        return await put({ ...e, head: e.head })
      } finally {
        busy.delete(url)
      }
    }
  }
}
