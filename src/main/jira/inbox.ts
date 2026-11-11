import type { JiraCreds } from '../credentials/check'
import type { InboxResult, JiraBoard, JiraIssue } from '../../preload/api'
import { netProblem, type NetProblem } from '../net-problem'
import { inboxGroups } from './board'

export const JQL = 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC'

interface RawIssue {
  key?: unknown
  fields?: {
    summary?: unknown
    issuetype?: { name?: unknown }
    status?: { id?: unknown; name?: unknown; statusCategory?: { key?: unknown } }
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
        statusId: str(f.status?.id),
        group: groupOf(str(f.status?.name), str(f.status?.statusCategory?.key)),
        project: key.slice(0, key.lastIndexOf('-')),
        components: (f.components ?? []).map((c) => str(c.name)).filter(Boolean)
      }
    ]
  })
}

/** I9: a task whose key is in a workspace record points at that workspace. */
function linkWorkspaces(issues: JiraIssue[], records: Array<{ id: string; jiraKey?: string }>): JiraIssue[] {
  return issues.map((i) => {
    const ws = records.find((r) => r.jiraKey === i.key)
    return ws ? { ...i, workspaceId: ws.id } : i
  })
}

const failed = (p: NetProblem): InboxResult => ({ error: 'failed', message: p.error, detail: p.detail, fix: p.fix })

export async function readInbox(
  creds: JiraCreds | null,
  fetchImpl: typeof fetch = fetch,
  records: Array<{ id: string; jiraKey?: string }> = [],
  board?: JiraBoard | null
): Promise<InboxResult> {
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
    if (!res.ok) return failed(netProblem('Jira', { status: res.status }))
    const issues = linkWorkspaces(parseIssues((await res.json()) as { issues?: RawIssue[] }), records)
    return { issues, ...(await inboxGroups(creds, board, issues, fetchImpl)) }
  } catch (err) {
    // I29: netProblem keeps err.message out; only a code reaches the window.
    return failed(netProblem('Jira', { error: err }))
  }
}
