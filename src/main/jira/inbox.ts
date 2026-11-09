import type { JiraCreds } from '../credentials/check'
import type { InboxResult, JiraIssue } from '../../preload/api'

export const JQL = 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC'

interface RawIssue {
  key?: unknown
  fields?: {
    summary?: unknown
    issuetype?: { name?: unknown }
    status?: { name?: unknown; statusCategory?: { key?: unknown } }
    components?: Array<{ name?: unknown }>
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// Jira only has three status categories; "in progress" covers review, testing and deploy too.
export const groupOf = (status: string, category: string): JiraIssue['group'] =>
  category === 'new' ? 'todo' : /progress|curso|doing|desarroll/i.test(status) ? 'doing' : 'review'

function parseIssues(body: { issues?: RawIssue[] }): JiraIssue[] {
  return (body.issues ?? []).flatMap((r) => {
    const key = str(r.key)
    if (!key) return []
    const f = r.fields ?? {}
    return [
      {
        key,
        summary: str(f.summary),
        type: str(f.issuetype?.name),
        status: str(f.status?.name),
        group: groupOf(str(f.status?.name), str(f.status?.statusCategory?.key)),
        project: key.slice(0, key.lastIndexOf('-')),
        components: (f.components ?? []).map((c) => str(c.name)).filter(Boolean)
      }
    ]
  })
}

export async function readInbox(creds: JiraCreds | null, fetchImpl: typeof fetch = fetch): Promise<InboxResult> {
  if (!creds) return { error: 'unconfigured' }

  // ponytail: one page of 100 issues; /search/jql paginates by nextPageToken, which this ignores.
  // Ceiling: a person with more than 100 open tasks sees the 100 most recently updated.
  const url = new URL('/rest/api/3/search/jql', new URL(creds.site.trim()).origin)
  url.searchParams.set('jql', JQL)
  url.searchParams.set('fields', 'summary,issuetype,status,components')
  url.searchParams.set('maxResults', '100')

  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.token}`).toString('base64')}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10_000)
    })
    if (res.status === 401 || res.status === 403)
      return { error: 'unconfigured', message: 'Jira ha rechazado el token. Revísalo en Ajustes.' }
    if (!res.ok) return { error: 'failed', message: `Jira respondió ${res.status}` }
    const issues = parseIssues((await res.json()) as { issues?: RawIssue[] })
    return { issues }
  } catch (err) {
    // Network errors can echo the request; never pass err.message through.
    const timeout = err instanceof Error && err.name === 'TimeoutError'
    return { error: 'failed', message: timeout ? 'Jira no ha respondido en 10 s.' : 'No se ha podido conectar con Jira.' }
  }
}
