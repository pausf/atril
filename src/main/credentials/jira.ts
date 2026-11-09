import { checkJira, type JiraCreds } from './check'
import type { SecretStatus, SecretStore } from './store'

export type JiraSaveResult = { account: string } | { error: string }

export const jiraSettings = (store: SecretStore, fetchImpl?: typeof fetch) => ({
  status: (): Promise<SecretStatus> => store.hasSecret('jira'),

  // Saved only after the check succeeds; the token is never part of the result.
  async save(creds: JiraCreds): Promise<JiraSaveResult> {
    const checked = await checkJira(creds, fetchImpl)
    if ('error' in checked) return checked
    const site = new URL(creds.site.trim()).origin
    const saved = await store.saveSecret('jira', { ...creds, site }, { account: checked.account, site })
    return 'error' in saved ? saved : { account: checked.account }
  },

  delete: (): Promise<void> => store.deleteSecret('jira')
})
