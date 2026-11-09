import { describe, expect, it } from 'vitest'
import { JQL, readInbox } from './inbox'

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
        status: { name: 'In Progress' },
        components: [{ name: 'checkout' }]
      }
    },
    {
      id: '1',
      key: 'PF-1',
      fields: {
        summary: 'Add a filter',
        issuetype: { id: '11', name: 'Story', subtask: false },
        status: { name: 'To Do' },
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
      'assignee = currentUser() AND sprint in openSprints() AND statusCategory != Done'
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
        { key: 'PF-1', summary: 'Add a filter', type: 'Story', status: 'To Do', project: 'PF', components: [] },
        { key: 'PF-2', summary: 'Fix the cart total', type: 'Bug', status: 'In Progress', project: 'PF', components: ['checkout'] }
      ]
    })
  })

  it('unconfigured jira asks the person to run jira init', async () => {
    let called = false
    const never = (async () => {
      called = true
      return json({})
    }) as typeof fetch
    expect(await readInbox(null, never)).toEqual({ error: 'unconfigured' })
    expect(called).toBe(false)

    const r = await readInbox(CREDS, (async () => json({ errorMessages: ['nope'] }, 401)) as typeof fetch)
    expect(r).toEqual({ error: 'unconfigured', message: 'Jira ha rechazado el token. Revísalo en Ajustes.' })
    expect(JSON.stringify(r)).not.toContain(CREDS.token)
  })

  it('reports other failures without echoing the network error', async () => {
    expect(await readInbox(CREDS, (async () => json({}, 500)) as typeof fetch)).toEqual({
      error: 'failed',
      message: 'Jira respondió 500'
    })
    const boom = (async () => {
      throw new Error(`connect ECONNREFUSED Basic ${CREDS.token}`)
    }) as typeof fetch
    const r = await readInbox(CREDS, boom)
    expect(r).toMatchObject({ error: 'failed' })
    expect(JSON.stringify(r)).not.toContain(CREDS.token)
  })
})
