import { describe, expect, it } from 'vitest'
import { checkJira } from './check'

const creds = { site: 'https://x.atlassian.net', email: 'a@b.c', token: 'SECRET-TOKEN' }
const reply = (status: number, body: unknown = {}) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch

describe('checkJira', () => {
  it('check shows the account or the error', async () => {
    expect(await checkJira(creds, reply(200, { displayName: 'Ana Pérez' }))).toEqual({ account: 'Ana Pérez' })

    const bad = await checkJira(creds, reply(401))
    expect(bad).toHaveProperty('error')
    expect(JSON.stringify(bad)).not.toContain('SECRET-TOKEN')

    const down = await checkJira(creds, (async () => { throw new Error(`boom ${creds.token}`) }) as typeof fetch)
    expect(JSON.stringify(down)).not.toContain('SECRET-TOKEN')

    expect(await checkJira({ ...creds, site: 'http://x.atlassian.net' }, reply(200))).toHaveProperty('error')
  })
})
