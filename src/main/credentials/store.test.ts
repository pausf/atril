import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, tmp } from '../test-helpers'
import { jiraSettings } from './jira'
import { createSecretStore, type Encryptor } from './store'

const TOKEN = 'ATATT3xFfGF0-super-secret-token'

// Reversible but unreadable: reversed + base64 hides the token from a byte search.
const enc = (available = true): Encryptor => ({
  isAvailable: () => available,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
})

let home: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
  vi.restoreAllMocks()
})

describe('secret store', () => {
  it('saved token is encrypted at rest', async () => {
    const store = createSecretStore(enc())
    await store.saveSecret('jira', { token: TOKEN, email: 'a@b.c' }, { account: 'Ana', site: 'https://x.atlassian.net' })
    const bytes = await readFile(join(home, 'secrets.bin'))
    expect(bytes.includes(TOKEN)).toBe(false)
    expect(await store.readSecret('jira')).toEqual({ token: TOKEN, email: 'a@b.c' })
  })

  it('refuses to save without keychain encryption', async () => {
    const store = createSecretStore(enc(false))
    const r = await store.saveSecret('jira', { token: TOKEN })
    expect(r).toHaveProperty('error')
    expect((await store.hasSecret('jira')).saved).toBe(false)
  })

  it('token never leaves the main process', async () => {
    const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')]
    const store = createSecretStore(enc())
    const fetchOk = (async () => new Response(JSON.stringify({ displayName: 'Ana' }), { status: 200 })) as typeof fetch
    const jira = jiraSettings(store, fetchOk)

    const saved = await jira.save({ site: 'https://x.atlassian.net', email: 'a@b.c', token: TOKEN })
    const status = await jira.status()
    expect(JSON.stringify([saved, status])).not.toContain(TOKEN)
    expect(status).toEqual({ saved: true, account: 'Ana', site: 'https://x.atlassian.net' })

    const written = await readFile(join(home, 'secrets.bin'), 'utf8')
    expect(written).not.toContain(TOKEN)
    for (const spy of logs) expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN)
  })
})
