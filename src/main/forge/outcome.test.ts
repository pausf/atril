import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { cleanTmp, tmp } from '../test-helpers'
import { createOutcome } from './outcome'

const TOKEN = 'ghp_outcome-token'
const GL = 'https://git.example.com'
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}
beforeEach(() => {
  process.env['ATRIL_HOME'] = tmp()
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })

describe('mr outcome', () => {
  it('a vanished MR is merged, closed or unknown', async () => {
    const store = createSecretStore(enc)
    await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau' })
    await store.saveSecret('gitlab', { token: TOKEN, site: GL }, { account: 'pau' })
    const answers: Record<string, () => Response | Promise<Response>> = {
      'https://api.github.com/repos/acme/web/pulls/1': () => json({ state: 'closed', merged: true }),
      'https://api.github.com/repos/acme/web/pulls/2': () => json({ state: 'closed', merged: false }),
      'https://api.github.com/repos/acme/web/pulls/3': () => json({ state: 'open', merged: false }),
      'https://api.github.com/repos/acme/web/pulls/4': () => json({}, 500),
      [`${GL}/api/v4/projects/grp%2Fsub%2Fshop/merge_requests/5`]: () => json({ state: 'merged' }),
      [`${GL}/api/v4/projects/grp%2Fsub%2Fshop/merge_requests/6`]: () => json({ state: 'closed' }),
      [`${GL}/api/v4/projects/grp%2Fsub%2Fshop/merge_requests/7`]: () => Promise.reject(new TypeError('fetch failed'))
    }
    const seen: Array<{ url: string; headers: Record<string, string>; redirect?: string; signal?: AbortSignal }> = []
    const fetchImpl = vi.fn(async (url: URL | string, init?: RequestInit) => {
      seen.push({ url: String(url), headers: init?.headers as Record<string, string>, redirect: init?.redirect, signal: init?.signal ?? undefined })
      const a = answers[String(url)]
      return a ? a() : json({}, 404)
    }) as unknown as typeof fetch
    const outcome = createOutcome(store, fetchImpl)
    const gh = (n: number) => ({ url: `https://github.com/acme/web/pull/${n}`, forge: 'github' as const })
    const gl = (n: number) => ({ url: `${GL}/grp/sub/shop/-/merge_requests/${n}`, forge: 'gitlab' as const })

    expect(await outcome([gh(1), gh(2), gh(3), gh(4), gl(5), gl(6), gl(7)])).toEqual({
      [gh(1).url]: 'merged',
      [gh(2).url]: 'closed',
      [gl(5).url]: 'merged',
      [gl(6).url]: 'closed'
    })
    // One request each, with the token only in its header, no redirects and a timeout.
    expect(seen).toHaveLength(7)
    expect(seen.every((s) => s.redirect === 'error' && s.signal instanceof AbortSignal)).toBe(true)
    const sent = (url: string) => seen.find((s) => s.url === url)!.headers
    expect(sent('https://api.github.com/repos/acme/web/pulls/1')['Authorization']).toBe(`Bearer ${TOKEN}`)
    expect(sent(`${GL}/api/v4/projects/grp%2Fsub%2Fshop/merge_requests/5`)['PRIVATE-TOKEN']).toBe(TOKEN)

    // At most 10 per listing; the rest are not asked and answer nothing.
    seen.length = 0
    const many = Array.from({ length: 13 }, (_, i) => gh(100 + i))
    expect(await outcome(many)).toEqual({})
    expect(seen).toHaveLength(10)

    // A URL on another host than the saved site is never sent the token.
    seen.length = 0
    expect(await outcome([{ url: 'https://evil.example.com/grp/shop/-/merge_requests/1', forge: 'gitlab' }, { url: 'https://gitlab.com.evil/acme/web/pull/1', forge: 'github' }])).toEqual({})
    expect(seen).toEqual([])

    // No token for that forge: nothing asked.
    await store.deleteSecret('github')
    expect(await outcome([gh(1)])).toEqual({})
    expect(seen).toEqual([])
  })
})
