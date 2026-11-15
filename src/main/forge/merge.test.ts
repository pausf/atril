import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrLists } from '../../preload/api'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { setLang } from '../lang'
import { cleanTmp, tmp } from '../test-helpers'
import { createMerge, type MergeEntry } from './merge'

const TOKEN = 'ghp_super-secret-forge-token'
const GL = 'https://git.example.com'
const GH_URL = 'https://github.com/acme/api/pull/7'
const GL_URL = `${GL}/grp/shop/-/merge_requests/5`
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}

beforeEach(() => {
  process.env['ATRIL_HOME'] = tmp()
  setLang('es')
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

async function connected() {
  const store = createSecretStore(enc)
  await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau', site: 'https://github.com' })
  await store.saveSecret('gitlab', { token: TOKEN, site: GL }, { account: 'pau', site: GL })
  return store
}

const entries: Record<string, MergeEntry> = {
  [GH_URL]: { list: 'mine', forge: 'github', ref: '/repos/acme/api/pulls/7', head: 'abc', mergeable: true },
  [GL_URL]: { list: 'mine', forge: 'gitlab', ref: '/projects/10/merge_requests/5', head: 'def', mergeable: true }
}
const emptyList: MrLists = { connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [] }

/** Answers every PUT with `status` (an Error is thrown); `hold` keeps the answer until released. */
function fakeForge(status: number | Error = 200) {
  const calls: Array<{ method: string; url: URL; body: unknown; init: RequestInit }> = []
  let release: () => void = () => undefined
  const held = new Promise<void>((r) => (release = r))
  let hold = false
  const f = vi.fn(async (input: URL | string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input))
    calls.push({ method: init.method ?? 'GET', url, body: init.body ? JSON.parse(String(init.body)) : undefined, init })
    if (hold) await held
    if (status instanceof Error) throw status
    return new Response(JSON.stringify({ merged: true, message: 'Pull Request successfully merged <script>' }), { status })
  })
  return { f: f as unknown as typeof fetch, calls, hold: () => (hold = true), release: () => release() }
}

async function merger(forge: ReturnType<typeof fakeForge>, o: { entry?: (u: string) => MergeEntry | undefined; relist?: () => Promise<MrLists> } = {}) {
  const relist = vi.fn(o.relist ?? (async () => emptyList))
  return { m: createMerge({ store: await connected(), fetchImpl: forge.f, entry: o.entry ?? ((u) => entries[u]), relist }), relist }
}

const REFUSED = { error: 'Esta MR no se puede fusionar desde Atril ahora: actualiza', fix: 'retry' }

describe('merge', () => {
  it('an mr merges once only when mine, mergeable and confirmed', async () => {
    // GitHub: squash, with the known head, then a new listing.
    const gh = fakeForge()
    const { m, relist } = await merger(gh)
    expect(await m.merge(GH_URL, true)).toEqual({ merged: true })
    expect(gh.calls.map((c) => [c.method, c.url.href, c.body])).toEqual([['PUT', 'https://api.github.com/repos/acme/api/pulls/7/merge', { merge_method: 'squash', sha: 'abc' }]])
    expect(gh.calls[0]!.init.redirect).toBe('error')
    expect(gh.calls[0]!.url.href).not.toContain(TOKEN)
    expect(relist).toHaveBeenCalledTimes(1)

    // GitLab: only the head; the project decides the method.
    const gl = fakeForge()
    const lab = await merger(gl)
    expect(await lab.m.merge(GL_URL, true)).toEqual({ merged: true })
    expect(gl.calls.map((c) => [c.method, c.url.href, c.body])).toEqual([['PUT', `${GL}/api/v4/projects/10/merge_requests/5/merge`, { sha: 'def' }]])

    // A failed new listing still says merged, with the listing's own problem.
    const after = await merger(fakeForge(), { relist: async () => ({ ...emptyList, errors: [{ forge: 'github', error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 502', fix: 'retry' }] }) })
    expect(await after.m.merge(GH_URL, true)).toEqual({ merged: true, list: { error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 502', fix: 'retry' } })

    // Refused without a request: not confirmed, not mine, not mergeable, no head, not listed.
    const none = fakeForge()
    const cases: Array<[string, boolean | unknown, ((u: string) => MergeEntry | undefined) | undefined]> = [
      ['unconfirmed', false, undefined],
      ['truthy, not true', 'yes', undefined],
      ['review list', true, () => ({ ...entries[GH_URL]!, list: 'review' })],
      ['following list', true, () => ({ ...entries[GH_URL]!, list: 'following' })],
      ['not mergeable', true, () => ({ ...entries[GH_URL]!, mergeable: undefined })],
      ['no head', true, () => ({ ...entries[GH_URL]!, head: undefined })],
      ['not listed', true, () => undefined]
    ]
    for (const [, confirmed, entry] of cases) {
      const { m: x } = await merger(none, { entry })
      expect(await x.merge(GH_URL, confirmed as boolean)).toEqual(REFUSED)
    }
    expect(none.calls).toHaveLength(0)

    // A second call while the first is in flight is refused; the first still merges once.
    const slow = fakeForge()
    slow.hold()
    const { m: once } = await merger(slow)
    const first = once.merge(GH_URL, true)
    await vi.waitFor(() => expect(slow.calls).toHaveLength(1))
    expect(await once.merge(GH_URL, true)).toEqual({ error: 'Ya se está fusionando esta MR', fix: 'retry' })
    slow.release()
    expect(await first).toEqual({ merged: true })
    expect(slow.calls).toHaveLength(1)
  })

  it('a refused merge says why and merges nothing', async () => {
    const answer = async (status: number | Error, url = GH_URL) => {
      const forge = fakeForge(status)
      const { m, relist } = await merger(forge)
      const r = await m.merge(url, true)
      expect(forge.calls).toHaveLength(1)
      expect(relist).not.toHaveBeenCalled()
      return r
    }
    expect(await answer(409)).toEqual({ error: 'La MR ha cambiado desde que la abriste: actualiza y vuelve a mirarla.', fix: 'retry' })
    expect(await answer(405)).toEqual({ error: 'GitHub no ha dejado fusionar esta MR.', fix: 'forge' })
    expect(await answer(406, GL_URL)).toEqual({ error: 'GitLab no ha dejado fusionar esta MR.', fix: 'forge' })
    expect(await answer(422)).toEqual({ error: 'GitHub no ha dejado fusionar esta MR.', fix: 'forge' })
    expect(await answer(401)).toEqual({ error: 'GitHub ha rechazado tu token.', detail: 'HTTP 401', fix: 'settings' })
    expect(await answer(503, GL_URL)).toEqual({ error: 'GitLab está fallando ahora mismo.', detail: 'HTTP 503', fix: 'retry' })
    expect(await answer(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }))).toEqual({ error: 'No llego a GitHub: ¿hay conexión?', detail: 'ECONNRESET', fix: 'retry' })
  })
})
