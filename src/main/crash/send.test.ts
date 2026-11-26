import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { cleanTmp, tmp } from '../test-helpers'
import { patchUi, readUi } from '../ui'
import { buildReport, type RawCrash } from './report'
import { createCrash } from './send'

const TOKEN = 'ghp_fakeTokenForCrashTests0001'
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(s),
  decrypt: (b) => b.toString()
}
const ctx = { home: '/Users/ana', versions: { atril: '0.9.0', electron: '45.1.0', macos: '15.3.1' } }
const T0 = Date.UTC(2026, 10, 26, 10)
const HOUR = 3_600_000
const raw = (message = 'Cannot read x of undefined'): Omit<RawCrash, 'at'> => ({ where: 'main', message, stack: 'Error\n    at run (/Users/ana/a.ts:1:2)' })
const sigOf = (message?: string): string => buildReport({ ...raw(message), at: T0 }, ctx).signature

interface Call {
  method: string
  url: URL
  body: Record<string, unknown> | null
  init: RequestInit
}
type Answer = { status: number; body?: unknown } | 'throw' | 'hang'

/** A fake api.github.com: `routes` keyed by `METHOD /path`, every request recorded. */
function github(routes: Record<string, Answer> = {}, sig = sigOf()) {
  const base: Record<string, Answer> = {
    'GET /repos/pausf/atril': { status: 200, body: { private: true, default_branch: 'main' } },
    'GET /repos/pausf/atril/pulls': { status: 200, body: [] },
    'GET /repos/pausf/atril/git/ref/heads/main': { status: 200, body: { object: { sha: 'abc123' } } },
    [`GET /repos/pausf/atril/git/ref/heads/atril-fallo/${sig}`]: { status: 404, body: { message: 'Not Found' } },
    'POST /repos/pausf/atril/git/refs': { status: 201, body: {} },
    [`GET /repos/pausf/atril/contents/fallos/${sig}.md`]: { status: 404, body: { message: 'Not Found' } },
    [`PUT /repos/pausf/atril/contents/fallos/${sig}.md`]: { status: 201, body: {} },
    'POST /repos/pausf/atril/pulls': { status: 201, body: { html_url: 'https://github.com/pausf/atril/pull/7' } },
    ...routes
  }
  const calls: Call[] = []
  const fetch = vi.fn(async (input: URL | string, init: RequestInit = {}) => {
    const url = new URL(String(input))
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null, init })
    const key = `${method} ${url.pathname}`
    const a = base[key]
    if (!a) return new Response(JSON.stringify({ message: `no route ${key}` }), { status: 500 })
    if (a === 'throw') throw Object.assign(new TypeError('fetch failed to https://api.github.com?secret'), { cause: { code: 'ECONNRESET' } })
    if (a === 'hang')
      return new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject((init.signal as AbortSignal).reason)))
    return new Response(JSON.stringify(a.body ?? {}), { status: a.status })
  })
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls, spy: fetch }
}

let now = T0
async function setup(o: { token?: boolean; on?: boolean } = {}) {
  const store = createSecretStore(enc)
  if (o.token !== false) await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau' })
  if (o.on !== false) await patchUi({ crashReports: 'on' })
  return store
}
const make = (store: ReturnType<typeof createSecretStore>, f: typeof fetch, timeoutMs?: number) => createCrash({ store, fetch: f, now: () => now, ...ctx, timeoutMs })
const sentFile = (): string => join(process.env['ATRIL_HOME']!, 'crash-sent.json')
const sent = (): { sent: Record<string, string>; failed: Record<string, number>; times: number[] } => JSON.parse(readFileSync(sentFile(), 'utf8'))

beforeEach(() => {
  process.env['ATRIL_HOME'] = tmp()
  now = T0
})
afterEach(() => {
  cleanTmp()
  delete process.env['ATRIL_HOME']
})

describe('crash send', () => {
  it("sends a new failure as a pull request to the official repo", async () => {
    const sig = sigOf()
    const report = buildReport({ ...raw(), at: T0 }, ctx)
    const store = await setup()
    const gh = github()
    await make(store, gh.fetch).report(raw())

    expect(gh.calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      'GET /repos/pausf/atril',
      'GET /repos/pausf/atril/pulls',
      'GET /repos/pausf/atril/git/ref/heads/main',
      `GET /repos/pausf/atril/git/ref/heads/atril-fallo/${sig}`,
      'POST /repos/pausf/atril/git/refs',
      `GET /repos/pausf/atril/contents/fallos/${sig}.md`,
      `PUT /repos/pausf/atril/contents/fallos/${sig}.md`,
      'POST /repos/pausf/atril/pulls'
    ])
    for (const c of gh.calls) {
      expect(c.url.origin).toBe('https://api.github.com')
      expect(c.init.redirect).toBe('error')
      expect(c.init.signal).toBeInstanceOf(AbortSignal)
      expect((c.init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`)
    }
    expect(gh.calls[1]!.url.searchParams.get('head')).toBe(`pausf:atril-fallo/${sig}`)
    expect(gh.calls[1]!.url.searchParams.get('state')).toBe('all')
    expect(gh.calls[4]!.body).toEqual({ ref: `refs/heads/atril-fallo/${sig}`, sha: 'abc123' })
    expect(gh.calls[5]!.url.searchParams.get('ref')).toBe(`atril-fallo/${sig}`)
    expect(gh.calls[6]!.body).toEqual({ message: `docs(fallos): ${sig}`, content: Buffer.from(report.markdown).toString('base64'), branch: `atril-fallo/${sig}` })
    expect(gh.calls[7]!.body).toEqual({ title: report.title, head: `atril-fallo/${sig}`, base: 'main', body: report.markdown })
    expect(report.title.startsWith('Fallo: ')).toBe(true)
    expect(sent().sent).toEqual({ [sig]: 'https://github.com/pausf/atril/pull/7' })
    expect((await readUi()).crashLast).toEqual({ at: T0, url: 'https://github.com/pausf/atril/pull/7' })

    // A pull request for that branch already exists (open or closed, maybe from another Mac): saved, nothing written.
    process.env['ATRIL_HOME'] = tmp()
    const existing = github({ 'GET /repos/pausf/atril/pulls': { status: 200, body: [{ html_url: 'https://github.com/pausf/atril/pull/3', state: 'closed' }] } })
    await make(await setup(), existing.fetch).report(raw())
    expect(existing.calls.map((c) => c.method)).toEqual(['GET', 'GET'])
    expect(sent().sent).toEqual({ [sig]: 'https://github.com/pausf/atril/pull/3' })

    // A half-done send: the branch and the file are already there, only the PR is opened.
    process.env['ATRIL_HOME'] = tmp()
    const half = github({
      [`GET /repos/pausf/atril/git/ref/heads/atril-fallo/${sig}`]: { status: 200, body: { object: { sha: 'def' } } },
      [`GET /repos/pausf/atril/contents/fallos/${sig}.md`]: { status: 200, body: { sha: 'f1' } }
    })
    await make(await setup(), half.fetch).report(raw())
    expect(half.calls.map((c) => `${c.method} ${c.url.pathname}`)).not.toContain('POST /repos/pausf/atril/git/refs')
    expect(half.calls.some((c) => c.method === 'PUT')).toBe(false)
    expect(half.calls.at(-1)!.url.pathname).toBe('/repos/pausf/atril/pulls')
    expect(sent().sent[sig]).toBe('https://github.com/pausf/atril/pull/7')

    // The official repo turned public: nothing is written there.
    process.env['ATRIL_HOME'] = tmp()
    const open = github({ 'GET /repos/pausf/atril': { status: 200, body: { private: false, default_branch: 'main' } } })
    await make(await setup(), open.fetch).report(raw())
    expect(open.calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual(['GET /repos/pausf/atril'])
    expect((await readUi()).crashLast).toEqual({ at: T0, error: 'pausf/atril no es privado: no envío fallos ahí.' })
    expect(sent().sent).toEqual({})
  })

  it("sends nothing when off, without a token, repeated, recently failed, over the cap or busy", async () => {
    const sig = sigOf()
    const nothing = async (store: ReturnType<typeof createSecretStore>, label: string): Promise<void> => {
      const gh = github()
      const before = existsSync(sentFile()) ? readFileSync(sentFile(), 'utf8') : null
      const lastBefore = (await readUi()).crashLast
      await make(store, gh.fetch).report(raw())
      expect(gh.spy, label).not.toHaveBeenCalled()
      expect(existsSync(sentFile()) ? readFileSync(sentFile(), 'utf8') : null, label).toBe(before)
      expect((await readUi()).crashLast, label).toEqual(lastBefore)
    }
    // Off.
    await nothing(await setup({ on: false }), 'off')
    // No GitHub token.
    process.env['ATRIL_HOME'] = tmp()
    await nothing(await setup({ token: false }), 'no token')
    // Already sent.
    process.env['ATRIL_HOME'] = tmp()
    writeFileSync(sentFile(), JSON.stringify({ sent: { [sig]: 'https://github.com/pausf/atril/pull/1' }, failed: {}, times: [] }))
    await nothing(await setup(), 'sent')
    // Failed in the last 24 hours; after them it is tried again.
    process.env['ATRIL_HOME'] = tmp()
    writeFileSync(sentFile(), JSON.stringify({ sent: {}, failed: { [sig]: T0 - 23 * HOUR }, times: [] }))
    await nothing(await setup(), 'recently failed')
    now = T0 + 2 * HOUR
    const later = github()
    await make(await setup(), later.fetch).report(raw())
    expect(later.spy).toHaveBeenCalled()
    now = T0
    // Five attempts in the last 24 hours: every send that makes a request counts.
    process.env['ATRIL_HOME'] = tmp()
    const store = await setup()
    for (const m of ['boom a', 'boom b', 'boom c', 'boom d', 'boom e']) await make(store, github({}, sigOf(m)).fetch).report(raw(m))
    expect(sent().times).toHaveLength(5)
    await nothing(store, 'cap')
    // A send is running.
    process.env['ATRIL_HOME'] = tmp()
    let release: () => void = () => undefined
    const answer = (): Response => new Response(JSON.stringify({ private: false, default_branch: 'main' }), { status: 200 })
    const slow = vi.fn(async () =>
      slow.mock.calls.length > 1
        ? answer()
        : new Promise<Response>((resolve) => {
            release = () => resolve(answer())
          })
    )
    const busyStore = await setup()
    const crash = make(busyStore, slow as unknown as typeof fetch)
    const first = crash.report(raw('first one'))
    await vi.waitFor(() => expect(slow).toHaveBeenCalledTimes(1))
    await crash.report(raw('second one'))
    expect(slow).toHaveBeenCalledTimes(1)
    release()
    await first
    // Busy is released: the next one goes.
    await crash.report(raw('third one'))
    expect(slow).toHaveBeenCalledTimes(2)
  })

  it("a failed send records why, frees the sender and never reports itself", async () => {
    const sig = sigOf()
    const rejections: unknown[] = []
    const onRejection = (r: unknown): void => void rejections.push(r)
    process.on('unhandledRejection', onRejection)
    try {
      // A throw: the network code, never the raw message.
      const thrown = github({ 'POST /repos/pausf/atril/git/refs': 'throw' })
      const crash = make(await setup(), thrown.fetch)
      await expect(crash.report(raw())).resolves.toBeUndefined()
      expect(sent().failed).toEqual({ [sig]: T0 })
      expect(sent().sent).toEqual({})
      expect((await readUi()).crashLast).toEqual({ at: T0, error: 'ECONNRESET' })
      expect(JSON.stringify(await readUi())).not.toContain('secret')
      // The sender is free again and the failure did not send itself as a new report.
      expect(thrown.calls.filter((c) => c.method === 'GET' && c.url.pathname === '/repos/pausf/atril')).toHaveLength(1)
      const again = github({}, sigOf('other failure'))
      await make(await setup(), again.fetch).report(raw('other failure'))
      expect(again.spy).toHaveBeenCalled()

      // A hang past the (injected) timeout.
      process.env['ATRIL_HOME'] = tmp()
      const hung = github({ 'GET /repos/pausf/atril/pulls': 'hang' })
      const slow = make(await setup(), hung.fetch, 50)
      await slow.report(raw())
      expect((await readUi()).crashLast).toEqual({ at: T0, error: 'TimeoutError' })
      expect(sent().failed).toEqual({ [sig]: T0 })
      expect(hung.calls.map((c) => c.method)).toEqual(['GET', 'GET'])
      const next = github({}, sigOf('after the hang'))
      await make(await setup(), next.fetch).report(raw('after the hang'))
      expect(next.spy).toHaveBeenCalled()

      // A 403: GitHub's own message, cut to 200 characters.
      process.env['ATRIL_HOME'] = tmp()
      const refused = github({ [`PUT /repos/pausf/atril/contents/fallos/${sig}.md`]: { status: 403, body: { message: 'Resource not accessible by personal access token ' + 'x'.repeat(300) } } })
      const crash403 = make(await setup(), refused.fetch)
      await crash403.report(raw())
      const last = (await readUi()).crashLast as { at: number; error: string }
      expect(last.error).toBe(('Resource not accessible by personal access token ' + 'x'.repeat(300)).slice(0, 200))
      expect(sent().failed).toEqual({ [sig]: T0 })
      expect(refused.calls.some((c) => c.url.pathname === '/repos/pausf/atril/pulls' && c.method === 'POST')).toBe(false)
      await new Promise((r) => setTimeout(r, 20))
      expect(rejections).toEqual([])
    } finally {
      process.off('unhandledRejection', onRejection)
    }
  })
})
