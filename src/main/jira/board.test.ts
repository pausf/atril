import { describe, expect, it, vi } from 'vitest'
import type { JiraIssue } from '../../preload/api'
import { groupByBoard, readBoardColumns, type BoardColumn } from './board'
import { readInbox } from './inbox'

const CREDS = { site: 'https://acme.atlassian.net', email: 'ada@example.com', token: 'tok-SECRET-123' }

const COLUMNS: BoardColumn[] = [
  { name: 'Backlog', statusIds: ['1'] },
  { name: 'To Do', statusIds: ['2'] },
  { name: 'In Progress', statusIds: ['3', '4'] },
  { name: 'Code Review', statusIds: ['5'] },
  { name: 'Testing', statusIds: ['6'] },
  { name: 'Ready to Deploy', statusIds: ['7'] }
]

const issue = (key: string, statusId: string, group: JiraIssue['group'] = 'doing'): JiraIssue => ({
  key, summary: key, type: 'Story', status: `S${statusId}`, statusId, project: 'PF', components: [], group
})

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })

describe('board', () => {
  it('groups tasks by the board columns in order', () => {
    // Jira's order is "updated DESC", not the board's: the board's order must win.
    const issues = [issue('PF-1', '5'), issue('PF-2', '2'), issue('PF-3', '4'), issue('PF-4', '3'), issue('PF-5', '7')]
    expect(groupByBoard(issues, COLUMNS)).toEqual([
      { id: 'col-1', title: 'To Do', folded: false, keys: ['PF-2'] },
      { id: 'col-2', title: 'In Progress', folded: false, keys: ['PF-3', 'PF-4'] },
      { id: 'col-3', title: 'Code Review', folded: false, keys: ['PF-1'] },
      { id: 'col-5', title: 'Ready to Deploy', folded: false, keys: ['PF-5'] }
    ])
  })

  it('tasks outside the board go last', () => {
    const issues = [issue('PF-1', '99'), issue('PF-2', '2'), issue('PF-3', '7')]
    const groups = groupByBoard(issues, COLUMNS)
    expect(groups.map((g) => g.title)).toEqual(['To Do', 'Ready to Deploy', 'Fuera del tablero'])
    expect(groups.at(-1)).toEqual({ id: 'outside', title: 'Fuera del tablero', folded: true, keys: ['PF-1'] })
  })

  it('refuses a board id that is not a positive integer', async () => {
    const fake = vi.fn(async () => json({}))
    for (const bad of [0, -3, 1.5, NaN, '12', '1/../../x', null, undefined]) {
      const r = await readBoardColumns(CREDS, bad, fake as unknown as typeof fetch)
      expect(r).toHaveProperty('error')
    }
    expect(fake).not.toHaveBeenCalled()
  })

  it('board failure falls back to the status groups', async () => {
    const search = { issues: [
      { key: 'PF-1', fields: { summary: 'a', status: { id: '2', name: 'To Do', statusCategory: { key: 'new' } } } },
      { key: 'PF-2', fields: { summary: 'b', status: { id: '3', name: 'In Progress', statusCategory: { key: 'indeterminate' } } } }
    ] }
    const fake = (async (input: URL | string) =>
      String(input).includes('/rest/agile/') ? json({ errorMessages: ['nope'] }, 404) : json(search)) as typeof fetch

    const r = await readInbox(CREDS, fake, [], { id: 7, name: 'TEAM' })
    if (!('issues' in r)) throw new Error('no issues')
    expect(r.groups).toEqual([
      { id: 'todo', title: 'Por empezar', folded: false, keys: ['PF-1'] },
      { id: 'doing', title: 'En curso', folded: false, keys: ['PF-2'] }
    ])
    expect(r.notice).toEqual({ text: 'No se pudo leer el tablero (404)' })
    expect(JSON.stringify(r)).not.toContain(CREDS.token)
  })
})
