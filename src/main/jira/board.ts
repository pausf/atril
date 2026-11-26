import type { JiraCreds } from '../credentials/check'
import type { InboxGroup, InboxNotice, JiraBoard, JiraIssue } from '../../preload/api'
import { t } from '../lang'
import { netProblem } from '../net-problem'

export interface BoardColumn {
  name: string
  statusIds: string[]
}

export type BoardRead = { columns: BoardColumn[] } | { error: string; detail?: string }

export const isBoardId = (id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

const categories = (): ReadonlyArray<[JiraIssue['group'], string, boolean]> => [
  ['todo', t('To start'), false],
  ['doing', t('In progress'), false],
  ['review', t('In review and deployment'), true]
]

export function groupsByCategory(issues: JiraIssue[]): InboxGroup[] {
  return categories().map(([id, title, folded]) => ({ id, title, folded, keys: issues.filter((i) => i.group === id).map((i) => i.key) })).filter(
    (g) => g.keys.length > 0
  )
}

/** Column groups keep the board's order, with ids `col-<index in the board>` so the first column stays recognisable when empty ones are dropped. */
export function groupByBoard(issues: JiraIssue[], columns: BoardColumn[]): InboxGroup[] {
  const columnOf = new Map<string, number>()
  columns.forEach((c, n) => c.statusIds.forEach((s) => columnOf.has(s) || columnOf.set(s, n)))
  const keys: string[][] = columns.map(() => [])
  const outside: string[] = []
  for (const i of issues) {
    const n = columnOf.get(i.statusId)
    if (n === undefined) outside.push(i.key)
    else keys[n]!.push(i.key)
  }
  const groups = columns.map((c, n): InboxGroup => ({ id: `col-${n}`, title: c.name, folded: false, keys: keys[n]! }))
  return [...groups, { id: 'outside', title: t('Outside the board'), folded: true, keys: outside }].filter((g) => g.keys.length > 0)
}

export async function readBoardColumns(creds: JiraCreds, id: unknown, fetchImpl: typeof fetch = fetch): Promise<BoardRead> {
  if (!isBoardId(id)) return { error: t('invalid id') }
  const url = new URL(`/rest/agile/1.0/board/${id}/configuration`, new URL(creds.site.trim()).origin)
  try {
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.token}`).toString('base64')}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return netProblem('Jira', { status: res.status })
    const body = (await res.json()) as { columnConfig?: { columns?: Array<{ name?: unknown; statuses?: Array<{ id?: unknown }> }> } }
    const raw = body.columnConfig?.columns
    if (!Array.isArray(raw) || raw.length === 0) return { error: t('unexpected response') }
    return {
      columns: raw.map((c) => ({
        name: typeof c.name === 'string' ? c.name : '',
        statusIds: (c.statuses ?? []).flatMap((s) => (typeof s.id === 'string' ? [s.id] : []))
      }))
    }
  } catch (err) {
    return netProblem('Jira', { error: err })
  }
}

/** Board columns when a board is picked and readable; the status categories otherwise, always saying why. */
export async function inboxGroups(
  creds: JiraCreds,
  board: JiraBoard | null | undefined,
  issues: JiraIssue[],
  fetchImpl: typeof fetch = fetch
): Promise<{ groups: InboxGroup[]; notice?: InboxNotice }> {
  if (!board) return { groups: groupsByCategory(issues), notice: { text: t('Pick your board in Settings to see its columns'), settings: true } }
  const read = await readBoardColumns(creds, board.id, fetchImpl)
  if ('error' in read)
    return { groups: groupsByCategory(issues), notice: { text: t("I can't read the board: {problem}", { problem: read.error }), ...(read.detail && { detail: read.detail }) } }
  return { groups: groupByBoard(issues, read.columns) }
}
