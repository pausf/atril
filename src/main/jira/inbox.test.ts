import { describe, expect, it } from 'vitest'
import { JQL, readInbox } from './inbox'
import { groupOf } from './inbox'

const CREDS = { site: 'https://acme.atlassian.net', email: 'ada@example.com', token: 'tok-SECRET-123' }

// Shape of GET /rest/api/3/search/jql, with invented content.
const BODY = {
  issues: [
    {
      id: '2',
      key: 'PF-2',
      fields: {
        summary: 'Fix the cart total',
        issuetype: { id: '10', name: 'Bug', subtask: false },
        status: { id: '3', name: 'In Progress', statusCategory: { key: 'indeterminate' } },
        components: [{ name: 'checkout' }]
      }
    },
    {
      id: '1',
      key: 'PF-1',
      fields: {
        summary: 'Add a filter',
        issuetype: { id: '11', name: 'Story', subtask: false },
        status: { id: '2', name: 'To Do', statusCategory: { key: 'new' } },
        components: []
      }
    }
  ]
}

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })

describe('inbox', () => {
  it('queries my open sprint issues', async () => {
    const calls: Array<{ url: URL; init: RequestInit | undefined }> = []
    const fake = (async (input: URL | string, init?: RequestInit) => {
      calls.push({ url: new URL(String(input)), init })
      return json({ issues: [] })
    }) as typeof fetch

    await readInbox(CREDS, fake)

    expect(calls).toHaveLength(1)
    const { url, init } = calls[0]!
    expect(init?.method ?? 'GET').toBe('GET')
    expect(url.origin + url.pathname).toBe('https://acme.atlassian.net/rest/api/3/search/jql')
    expect(url.searchParams.get('jql')).toBe(
      'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC'
    )
    expect(JQL).toBe(url.searchParams.get('jql'))
    expect(url.searchParams.get('fields')).toBe('summary,issuetype,status,components')
    expect(url.searchParams.get('maxResults')).toBe('100')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe(`Basic ${Buffer.from('ada@example.com:tok-SECRET-123').toString('base64')}`)
    expect(headers.get('accept')).toBe('application/json')
  })

  it('parses issues from raw json', async () => {
    const r = await readInbox(CREDS, (async () => json(BODY)) as typeof fetch)

    expect(r).toEqual({
      issues: [
        // Jira's order (updated DESC) is kept, not re-sorted by key.
        { key: 'PF-2', summary: 'Fix the cart total', type: 'Bug', status: 'In Progress', statusId: '3', project: 'PF', components: ['checkout'], group: 'doing' },
        { key: 'PF-1', summary: 'Add a filter', type: 'Story', status: 'To Do', statusId: '2', project: 'PF', components: [], group: 'todo' }
      ],
      groups: [
        { id: 'todo', title: 'Por empezar', folded: false, keys: ['PF-1'] },
        { id: 'doing', title: 'En curso', folded: false, keys: ['PF-2'] }
      ],
      notice: { text: 'Elige tu tablero en Ajustes para ver sus columnas', settings: true }
    })
  })

  it('no jira token is unconfigured', async () => {
    let called = false
    const never = (async () => {
      called = true
      return json({})
    }) as typeof fetch
    expect(await readInbox(null, never)).toEqual({ error: 'unconfigured' })
    expect(called).toBe(false)
  })

  it('a jira failure says its cause and fix', async () => {
    // A saved token Jira rejects is a failure with its cause, never «unconfigured».
    for (const [status, message, fix] of [
      [401, 'Jira ha rechazado tu token.', 'settings'],
      [403, 'Jira no te deja ver esto con ese token.', 'settings'],
      [404, 'Jira no encuentra esa dirección.', 'settings'],
      [429, 'Jira pide esperar: demasiadas consultas.', 'retry'],
      [500, 'Jira está fallando ahora mismo.', 'retry']
    ] as const) {
      const r = await readInbox(CREDS, (async () => json({ errorMessages: ['nope'] }, status)) as typeof fetch)
      expect(r).toEqual({ error: 'failed', message, detail: `HTTP ${status}`, fix })
    }
    const boom = (async () => {
      throw Object.assign(new TypeError(`connect ECONNREFUSED Basic ${CREDS.token}`), { cause: { code: 'ECONNREFUSED' } })
    }) as typeof fetch
    const r = await readInbox(CREDS, boom)
    expect(r).toEqual({ error: 'failed', message: 'No llego a Jira: ¿hay conexión?', detail: 'ECONNREFUSED', fix: 'retry' })
    expect(JSON.stringify(r)).not.toContain(CREDS.token)
    // A body that is not JSON names that, not a network failure.
    const html = (async () => new Response('<html>', { status: 200 })) as typeof fetch
    expect(await readInbox(CREDS, html)).toEqual({ error: 'failed', message: 'Jira ha contestado algo que no entiendo.', detail: 'SyntaxError', fix: 'retry' })
  })

  it('groups tasks by status', () => {
    expect(groupOf('Backlog', 'new')).toBe('todo')
    expect(groupOf('To Do', 'new')).toBe('todo')
    expect(groupOf('In Progress', 'indeterminate')).toBe('doing')
    expect(groupOf('En curso', 'indeterminate')).toBe('doing')
    expect(groupOf('Code Review', 'indeterminate')).toBe('review')
    expect(groupOf('Testing', 'indeterminate')).toBe('review')
    expect(groupOf('Ready to Deploy', 'indeterminate')).toBe('review')
  })

  it('task with a workspace shows it instead of start', async () => {
    const r = await readInbox(CREDS, (async () => json(BODY)) as typeof fetch, [
      { id: 'ws1', jiraKey: 'PF-1' },
      { id: 'ws2' }
    ])
    if (!('issues' in r)) throw new Error('no issues')
    expect(r.issues.find((i) => i.key === 'PF-1')?.workspaceId).toBe('ws1')
    expect(r.issues.find((i) => i.key === 'PF-2')).not.toHaveProperty('workspaceId')
  })

  it('only my tasks even with a board', async () => {
    const urls: URL[] = []
    const fetch = (async (u: URL | string) => {
      const url = new URL(String(u))
      urls.push(url)
      return url.pathname.endsWith('/configuration')
        ? json({ columnConfig: { columns: [{ name: 'To Do', statuses: [{ id: '1' }] }] } })
        : json(BODY)
    }) as typeof globalThis.fetch

    await readInbox(CREDS, fetch, [], { id: 7, name: 'TEAM' })

    // The board gives columns only: never its own issues, never anyone else's.
    expect(urls.map((u) => u.pathname).sort()).toEqual(['/rest/agile/1.0/board/7/configuration', '/rest/api/3/search/jql'])
    expect(urls.find((u) => u.pathname === '/rest/api/3/search/jql')?.searchParams.get('jql')).toMatch(/^assignee = currentUser\(\) AND/)
  })
})
