import type { Runner } from '../run'
import type { InboxResult, JiraIssue } from '../../preload/api'

export const INSTALL = 'brew install ankitpokhrel/jira-cli/jira-cli'
export const JQL = 'assignee = currentUser() AND sprint in openSprints() AND statusCategory != Done'

const NO_RESULT = /No result found/i

// ponytail: the CLI prepends `project = "<config project>" AND` to every --jql without
// parentheses. AND binds tighter than OR, so a false first clause OR (the real query) runs
// across every project in ONE call. Ceiling: if jira-cli ever wraps the JQL in parentheses
// this returns nothing; the fallback then is one call per project of `jira project list`.
export const QUERY = `statusCategory = Done AND statusCategory != Done OR (${JQL})`

interface RawIssue {
  key?: unknown
  fields?: {
    summary?: unknown
    issueType?: { name?: unknown }
    status?: { name?: unknown }
    components?: Array<{ name?: unknown } | string>
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function parseIssues(stdout: string): JiraIssue[] {
  const raw = JSON.parse(stdout) as RawIssue[]
  return raw.flatMap((r) => {
    const key = str(r.key)
    if (!key) return []
    const f = r.fields ?? {}
    return [
      {
        key,
        summary: str(f.summary),
        type: str(f.issueType?.name),
        status: str(f.status?.name),
        project: key.slice(0, key.lastIndexOf('-')),
        components: (f.components ?? []).map((c) => (typeof c === 'string' ? c : str(c.name))).filter(Boolean)
      }
    ]
  })
}

const missing = (code: number, stderr: string): boolean => code === 127 || /ENOENT/.test(stderr)

export async function readInbox(run: Runner): Promise<InboxResult> {
  const r = await run('jira', ['issue', 'list', '--raw', '--jql', QUERY])
  if (missing(r.code, r.stderr)) return { error: 'missing', install: INSTALL }
  if (r.code === 0) {
    try {
      const issues = parseIssues(r.stdout)
      issues.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }))
      return { issues }
    } catch {
      return { error: 'failed', message: 'jira devolvió una respuesta que Atril no entiende' }
    }
  }
  if (NO_RESULT.test(r.stderr + r.stdout)) return { issues: [] }

  // A failure that is not "no results": an unauthenticated CLI fails this too.
  const projects = await run('jira', ['project', 'list'])
  if (projects.code !== 0) return { error: 'unconfigured', message: 'Ejecuta `jira init` en tu terminal' }
  return { error: 'failed', message: r.stderr.trim() || `jira terminó con código ${r.code}` }
}
