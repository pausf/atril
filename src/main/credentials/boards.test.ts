import { describe, expect, it } from 'vitest'
import { searchBoards } from './boards'

const CREDS = { site: 'https://acme.atlassian.net', email: 'ada@example.com', token: 'tok-SECRET-123' }
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })

describe('board search', () => {
  it('asks Jira for boards by name and keeps id, name and type', async () => {
    let url!: URL
    const fake = (async (input: URL | string) => {
      url = new URL(String(input))
      return json({ values: [{ id: 7, name: 'TEAM', type: 'kanban', self: 'x' }, { id: 'bad', name: 'no' }] })
    }) as typeof fetch
    expect(await searchBoards(CREDS, 'dx', fake)).toEqual([{ id: 7, name: 'TEAM', type: 'kanban' }])
    expect(url.origin + url.pathname).toBe('https://acme.atlassian.net/rest/agile/1.0/board')
    expect(url.searchParams.get('name')).toBe('dx')
    expect(url.searchParams.get('maxResults')).toBe('50')
  })

  it('reports failures without the token', async () => {
    const r = await searchBoards(CREDS, 'dx', (async () => {
      throw new Error(`boom Basic ${CREDS.token}`)
    }) as typeof fetch)
    expect(r).toHaveProperty('error')
    expect(JSON.stringify(r)).not.toContain(CREDS.token)
    expect(await searchBoards(CREDS, 'dx', (async () => json({}, 403)) as typeof fetch)).toEqual({ error: 'Jira respondió 403' })
  })
})
