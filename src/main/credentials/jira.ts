import { checkJira, type JiraCreds } from './check'
import type { SecretStatus, SecretStore } from './store'
import { t } from '../lang'

export type JiraSaveResult = { account: string } | { error: string }

export const jiraSettings = (store: SecretStore, fetchImpl?: typeof fetch) => ({
  status: (): Promise<SecretStatus> => store.hasSecret('jira'),

  // Saved only after the check succeeds; the token is never part of the result.
  async save(creds: JiraCreds): Promise<JiraSaveResult> {
    const checked = await checkJira(creds, fetchImpl)
    if ('error' in checked) return checked
    const site = new URL(creds.site.trim()).origin
    // Reemplazar changes the token, not the board.
    const { board } = await store.hasSecret('jira')
    const saved = await store.saveSecret(
      'jira',
      { ...creds, site },
      { account: checked.account, site, ...(checked.avatar && { avatar: checked.avatar }), ...(board && { board }) }
    )
    return 'error' in saved ? saved : { account: checked.account }
  },

  // Board id and name sit beside the account metadata, never in the token blob.
  async pickBoard(board: { id: number; name: string } | null): Promise<{ ok: true } | { error: string }> {
    if (board && !(Number.isInteger(board.id) && board.id > 0 && typeof board.name === 'string'))
      return { error: t('Tablero no válido.') }
    return (await store.setBoard('jira', board && { id: board.id, name: board.name })) ? { ok: true } : { error: t('Conecta Jira antes de elegir un tablero.') }
  },

  delete: (): Promise<void> => store.deleteSecret('jira')
})
