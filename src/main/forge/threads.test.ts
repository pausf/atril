import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { setLang } from '../lang'
import { cleanTmp, tmp } from '../test-helpers'
import { createForgeGuards } from './guards'
import { listMrs } from './mrs'
import { createThreads, type ThreadTarget } from './threads'

const TOKEN = 'ghp_super-secret-forge-token'
const GL = 'https://git.example.com'
const GH_URL = 'https://github.com/acme/api/pull/7'
const GL_URL = `${GL}/grp/shop/-/merge_requests/5`
const GH_REF = '/repos/acme/api/pulls/7'
const GL_REF = '/projects/10/merge_requests/5'
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

const at = (m: number): string => new Date(Date.UTC(2026, 10, 9, 10, m)).toISOString()
const ghc = (id: number, user: string, m: number, o: Record<string, unknown> = {}) => ({ id, user: { login: user }, created_at: at(m), body: `c${id}`, ...o })
const gln = (id: number, user: string, m: number, o: Record<string, unknown> = {}) => ({ id, author: { username: user }, created_at: at(m), body: `n${id}`, system: false, resolvable: false, ...o })

/** A fake forge answering per path with pages; `next` says more pages exist after the last one. */
function fakeForge(routes: Record<string, { pages: unknown[][]; next?: boolean }>, o: { post?: Response | (() => Response); down?: boolean } = {}) {
  const calls: Array<{ method: string; url: URL; body?: unknown; init: RequestInit }> = []
  const f = async (input: URL | string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input))
    const method = init.method ?? 'GET'
    calls.push({ method, url, init, ...(init.body !== undefined && { body: JSON.parse(String(init.body)) }) })
    if (o.down) throw Object.assign(new TypeError(`fetch failed ${url}`), { cause: { code: 'ECONNRESET' } })
    if (method === 'POST') {
      const r = typeof o.post === 'function' ? o.post() : o.post
      if (r) return r
      const body = JSON.parse(String(init.body)) as { body: string }
      return new Response(JSON.stringify({ id: 999, user: { login: 'pau' }, author: { username: 'pau' }, created_at: at(59), body: body.body }), { status: 201 })
    }
    const route = routes[url.pathname]
    if (!route) return new Response('[]', { status: 200 })
    const n = Number(url.searchParams.get('page'))
    const more = n < route.pages.length || !!route.next
    const headers: Record<string, string> = more ? (url.origin === 'https://api.github.com' ? { link: `<${url.origin}${url.pathname}?page=${n + 1}>; rel="next"` } : { 'x-next-page': String(n + 1) }) : {}
    return new Response(JSON.stringify(route.pages[n - 1] ?? []), { status: 200, headers })
  }
  return { f: vi.fn(f) as unknown as typeof fetch, calls }
}

const targets: Record<string, ThreadTarget> = {
  [GH_URL]: { forge: 'github', ref: GH_REF, author: 'eva' },
  [GL_URL]: { forge: 'gitlab', ref: GL_REF, author: 'eva' }
}

async function threads(forge: ReturnType<typeof fakeForge>, target: (url: string) => ThreadTarget | undefined = (u) => targets[u]) {
  return createThreads({ store: await connected(), fetchImpl: forge.f, target })
}

describe('mr threads', () => {
  it('threads come from both forges', async () => {
    const forge = fakeForge({
      [`${GH_REF}/comments`]: {
        pages: [
          [
            ghc(1, 'eva', 1, { path: 'src/a.ts', line: 12, diff_hunk: '@@ -1,3 +1,4 @@\n const a = 1\n+const b = <b>2</b>' }),
            ghc(3, 'leo', 5, { path: 'src/a.ts', line: 12, in_reply_to_id: 1 }),
            ghc(2, 'pau', 3, { path: 'src/a.ts', line: 12, in_reply_to_id: 1 }),
            ghc(4, 'leo', 2, { path: 'src/b.ts', line: null, original_line: 8, diff_hunk: '@@ -8 +8 @@\n-old\n+new' }),
            ghc(5, 'leo', 4, { path: 'src/c.ts', line: null, original_line: null, diff_hunk: '' })
          ]
        ]
      },
      ['/repos/acme/api/issues/7/comments']: { pages: [[ghc(20, 'leo', 9), ghc(21, 'eva', 7)]] }
    })
    const s = await threads(forge)
    const gh = await s.read(GH_URL)
    expect(gh).toEqual({
      more: false,
      threads: [
        { id: '1', forge: 'github', file: 'src/a.ts', line: 12, code: '+const b = <b>2</b>', comments: [{ id: '1', author: 'eva', at: at(1), body: 'c1' }, { id: '2', author: 'pau', at: at(3), body: 'c2' }, { id: '3', author: 'leo', at: at(5), body: 'c3' }], yourTurn: true },
        { id: '4', forge: 'github', file: 'src/b.ts', line: 8, code: '+new', comments: [{ id: '4', author: 'leo', at: at(2), body: 'c4' }], yourTurn: false },
        { id: '5', forge: 'github', file: 'src/c.ts', comments: [{ id: '5', author: 'leo', at: at(4), body: 'c5' }], yourTurn: false },
        { id: 'general', forge: 'github', comments: [{ id: '21', author: 'eva', at: at(7), body: 'c21' }, { id: '20', author: 'leo', at: at(9), body: 'c20' }], yourTurn: false }
      ]
    })
    expect(forge.calls.map((c) => `${c.url.pathname}?${c.url.search.slice(1)}`)).toEqual([`${GH_REF}/comments?per_page=100&page=1`, '/repos/acme/api/issues/7/comments?per_page=100&page=1'])
    // The token goes in a header, never in a URL, and no redirect is followed.
    for (const c of forge.calls) {
      expect(c.url.href).not.toContain(TOKEN)
      expect(c.init.redirect).toBe('error')
    }

    const lab = fakeForge({
      [`/api/v4${GL_REF}/discussions`]: {
        pages: [
          [
            { id: 'd1', individual_note: false, notes: [gln(1, 'eva', 1, { resolvable: true, resolved: true, position: { new_path: 'src/x.ts', old_path: 'src/old.ts', new_line: null, old_line: 4 } }), gln(2, 'pau', 2, { resolvable: true, resolved: false })] },
            { id: 'd2', individual_note: false, notes: [gln(3, 'eva', 3, { resolvable: true, resolved: true, position: { new_path: null, old_path: 'src/gone.ts', new_line: null, old_line: null } }), gln(4, 'leo', 4, { resolvable: true, resolved: true })] },
            { id: 'd3', individual_note: true, notes: [gln(5, 'leo', 6)] },
            { id: 'd4', individual_note: true, notes: [gln(6, 'eva', 5, { system: true, body: 'added 1 commit' })] },
            { id: 'd5', individual_note: true, notes: [gln(7, 'ana', 5)] },
            { id: 'd6', individual_note: false, notes: [gln(8, 'leo', 8), gln(9, 'eva', 9, { system: true })] }
          ]
        ]
      }
    })
    const gl = await (await threads(lab)).read(GL_URL)
    expect(gl).toEqual({
      more: false,
      threads: [
        { id: 'd1', forge: 'gitlab', file: 'src/x.ts', line: 4, resolved: false, comments: [{ id: '1', author: 'eva', at: at(1), body: 'n1' }, { id: '2', author: 'pau', at: at(2), body: 'n2' }], yourTurn: false },
        { id: 'd2', forge: 'gitlab', file: 'src/gone.ts', resolved: true, comments: [{ id: '3', author: 'eva', at: at(3), body: 'n3' }, { id: '4', author: 'leo', at: at(4), body: 'n4' }], yourTurn: false },
        { id: 'd6', forge: 'gitlab', comments: [{ id: '8', author: 'leo', at: at(8), body: 'n8' }], yourTurn: false },
        { id: 'general', forge: 'gitlab', comments: [{ id: '7', author: 'ana', at: at(5), body: 'n7' }, { id: '5', author: 'leo', at: at(6), body: 'n5' }], yourTurn: false }
      ]
    })
    expect(lab.calls.map((c) => c.url.pathname + c.url.search)).toEqual([`/api/v4${GL_REF}/discussions?per_page=100&page=1`])
  })

  it('threads are capped', async () => {
    const page = (from: number) => Array.from({ length: 100 }, (_, i) => ghc(from + i, 'leo', 1, { path: 'a.ts', line: 1 }))
    const forge = fakeForge({ [`${GH_REF}/comments`]: { pages: [page(1), page(101), page(201)], next: true } })
    const r = await (await threads(forge)).read(GH_URL)
    expect(r).toMatchObject({ more: true })
    expect('threads' in r && r.threads.length).toBe(300)
    expect(forge.calls.filter((c) => c.url.pathname.endsWith('/pulls/7/comments')).map((c) => c.url.searchParams.get('page'))).toEqual(['1', '2', '3'])

    // Exactly three pages and no next: nothing more.
    const full = fakeForge({ [`/api/v4${GL_REF}/discussions`]: { pages: [[], [], []] } })
    expect(await (await threads(full)).read(GL_URL)).toMatchObject({ more: false })
    const over = fakeForge({ [`/api/v4${GL_REF}/discussions`]: { pages: [[], [], []], next: true } })
    expect(await (await threads(over)).read(GL_URL)).toMatchObject({ more: true })
    expect(over.calls).toHaveLength(3)
  })

  it('your turn is the last word of someone else', async () => {
    const thread = (...who: string[]) => ({ pages: [who.map((u, i) => ghc(i + 1, u, i, { path: 'a.ts', line: 1, ...(i > 0 && { in_reply_to_id: 1 }) }))] })
    const turn = async (author: string, ...who: string[]): Promise<boolean> => {
      const forge = fakeForge({ [`${GH_REF}/comments`]: thread(...who) })
      const r = await (await threads(forge, () => ({ forge: 'github', ref: GH_REF, author }))).read(GH_URL)
      return 'threads' in r && r.threads[0]!.yourTurn
    }
    expect(await turn('eva', 'pau', 'leo')).toBe(true)
    expect(await turn('eva', 'leo', 'pau', 'leo')).toBe(true)
    expect(await turn('eva', 'pau', 'leo', 'pau')).toBe(false)
    expect(await turn('eva', 'leo', 'eva')).toBe(false)
    // Your MR: any thread whose last word is someone else's.
    expect(await turn('pau', 'leo')).toBe(true)
    expect(await turn('pau', 'leo', 'pau')).toBe(false)

    const general = fakeForge({ [`/api/v4${GL_REF}/discussions`]: { pages: [[{ id: 'a', individual_note: true, notes: [gln(1, 'pau', 1)] }, { id: 'b', individual_note: true, notes: [gln(2, 'eva', 2)] }]] } })
    const r = await (await threads(general)).read(GL_URL)
    expect('threads' in r && r.threads[0]).toMatchObject({ id: 'general', yourTurn: true })
  })

  it('a reply is posted once to the right place', async () => {
    const cases: Array<[string, string, string]> = [
      [GH_URL, '1', `${GH_REF}/comments/1/replies`],
      [GH_URL, 'general', '/repos/acme/api/issues/7/comments'],
      [GL_URL, 'd1a2', `/api/v4${GL_REF}/discussions/d1a2/notes`],
      [GL_URL, 'general', `/api/v4${GL_REF}/notes`]
    ]
    for (const [url, id, path] of cases) {
      const forge = fakeForge({})
      const r = await (await threads(forge)).reply(url, id, 'Hecho, gracias')
      expect(r, path).toEqual({ comment: { id: '999', author: 'pau', at: at(59), body: 'Hecho, gracias' } })
      expect(forge.calls.map((c) => [c.method, c.url.pathname, c.body])).toEqual([['POST', path, { body: 'Hecho, gracias' }]])
      expect(forge.calls[0]!.init.redirect).toBe('error')
    }

    // Empty replies and ids that are not a thread's are never sent.
    const forge = fakeForge({})
    const s = await threads(forge)
    expect(await s.reply(GH_URL, '1', '   \n')).toEqual({ error: 'Escribe una respuesta' })
    expect(await s.reply(GH_URL, '../../x', 'hola')).toMatchObject({ error: expect.any(String) })
    expect(forge.calls).toHaveLength(0)

    // A failure says which forge and why.
    const down = fakeForge({}, { post: new Response('{}', { status: 403 }) })
    expect(await (await threads(down)).reply(GL_URL, 'general', 'hola')).toEqual({ error: 'GitLab no te deja ver esto con ese token.' })
    expect(down.calls).toHaveLength(1)
    const off = fakeForge({}, { down: true })
    expect(await (await threads(off)).reply(GH_URL, 'general', 'hola')).toEqual({ error: 'No llego a GitHub: ¿hay conexión?' })
    expect(await (await threads(off)).read(GH_URL)).toEqual({ error: 'No llego a GitHub: ¿hay conexión?' })
  })

  it('only listed mrs are read or answered', async () => {
    const store = await connected()
    const guards = createForgeGuards()
    const glMr = (iid: number, author: string) => ({ web_url: `${GL}/grp/shop/-/merge_requests/${iid}`, title: 't', author: { username: author }, project_id: 10, iid, updated_at: new Date().toISOString(), references: { full: `grp/shop!${iid}` } })
    const listing = (async (input: URL | string) => {
      const u = new URL(String(input))
      if (u.origin === 'https://api.github.com') return new Response(JSON.stringify(u.pathname === '/search/issues' ? { total_count: 0, items: [] } : []), { status: 200 })
      if (u.pathname === '/api/v4/merge_requests') return new Response(JSON.stringify(u.searchParams.get('scope') === 'created_by_me' ? [glMr(1, 'pau')] : [glMr(2, 'eva')]), { status: 200 })
      if (u.pathname === '/api/v4/projects') return new Response(JSON.stringify([{ id: 10 }]), { status: 200 })
      if (u.pathname === '/api/v4/projects/10/merge_requests') return new Response(JSON.stringify([glMr(3, 'leo')]), { status: 200 })
      return new Response('{}', { status: 404 })
    }) as unknown as typeof fetch
    await listMrs(store, listing, guards.scorable, guards.threadable)

    const forge = fakeForge({})
    const s = createThreads({ store, fetchImpl: forge.f, target: guards.threadTarget })
    const gone = { error: 'Esta MR ya no está en la lista: actualiza' }
    for (const url of ['https://evil.example.com/x', GH_URL]) {
      expect(await s.read(url), url).toEqual(gone)
      expect(await s.reply(url, 'general', 'hola'), url).toEqual(gone)
    }
    expect(forge.calls).toHaveLength(0)

    // All three lists are readable, with the author the listing gave.
    for (const iid of [1, 2, 3]) expect(await s.read(`${GL}/grp/shop/-/merge_requests/${iid}`)).toEqual({ threads: [], more: false })
    expect(guards.threadTarget(`${GL}/grp/shop/-/merge_requests/3`)).toEqual({ forge: 'gitlab', ref: '/projects/10/merge_requests/3', author: 'leo' })

    // The next listing replaces the set.
    guards.threadable(new Map())
    const calls = forge.calls.length
    expect(await s.reply(`${GL}/grp/shop/-/merge_requests/1`, 'general', 'hola')).toEqual(gone)
    expect(forge.calls).toHaveLength(calls)
  })
})
