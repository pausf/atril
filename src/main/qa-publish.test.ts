import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../preload/api'
import { createSecretStore, type Encryptor } from './credentials/store'
import { createThreads, type ThreadTarget } from './forge/threads'
import { setLang } from './lang'
import type { MrRef, MrState, Problem } from './forge/qa-hosting'
import { createQaPublish } from './qa-publish'
import { run, type Runner } from './run'
import { cleanTmp, git, tmp } from './test-helpers'

const ID = 'qpub0001'
const BRANCH = 'feat/pf-1'
const TOKEN = 'ghp_super-secret-forge-token'
const OWN = 'https://github.com/acme/shop-web/pull/41'
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}

const PROPOSAL = [
  '# add-x',
  '',
  '## Verification criteria',
  '',
  '- **W1** La fecha salta al siguiente laborable.',
  '- **W2** Respeta el festivo de la provincia.',
  '- **W3** Pide la provincia antes de pagar.',
  '- **W4** Guarda la elección.',
  ''
].join('\n')

let home: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
  setLang('es')
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  setLang('es')
  cleanTmp()
})

/** A registered repo with the given origin, a work on BRANCH in it, and its QA report. */
function seed(origin: string, files: Record<string, string> = { 'package.json': JSON.stringify({ scripts: { dev: 'x' } }) }): void {
  const root = tmp()
  git(root, 'init', '-q')
  for (const [name, body] of Object.entries({ ...files, '.agents/changes/add-x/proposal.md': PROPOSAL })) {
    mkdirSync(join(root, name, '..'), { recursive: true })
    writeFileSync(join(root, name), body)
  }
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'init')
  git(root, 'remote', 'add', 'origin', origin)
  writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'shop', path: root }] }))
  writeFileSync(
    join(home, 'workspaces.json'),
    JSON.stringify({ workspaces: [{ id: ID, repoId: 'shop', branch: BRANCH, mode: 'worktree', path: root, baseCommit: 'abc', agent: 'claude', session: `atril-${ID}`, paneId: '%1' }] })
  )
  mkdirSync(join(home, 'qa', ID), { recursive: true })
  writeFileSync(
    join(home, 'qa', ID, 'report.json'),
    JSON.stringify({
      criteria: [
        { id: 'W1', status: 'pass', note: 'ok', steps: [{ text: 'Abrir /checkout' }] },
        { id: 'W2', status: 'fail', note: 'esperaba sábado 14, sale viernes 13', steps: [{ text: 'Elegir Madrid' }] },
        { id: 'W3', status: 'fail', note: '', steps: [{ text: 'Abrir /checkout' }, { text: 'Pagar sin provincia' }] }
      ]
    })
  )
}

const item = (url: string, project: string, branch: string, updatedAt: string): MrItem => ({ forge: 'github', url, title: 't', project, author: 'pau', updatedAt, branch })
const lists = (mine: MrItem[], review: MrItem[] = []): MrLists => ({ connected: ['github'], mine, review, following: [], more: { mine: [], review: [], following: [] }, errors: [] })

async function store() {
  const s = createSecretStore(enc)
  await s.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau', site: 'https://github.com' })
  return s
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ...[
    ['IHDR', 'h'.repeat(13)],
    ['IDAT', 'px'],
    ['IEND', '']
  ].map(([type, data]) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data!.length)
    return Buffer.concat([len, Buffer.from(type!), Buffer.from(data!), Buffer.alloc(4)])
  })
])

/** A forge for the pictures: what each MR answers, and every call made. */
function fakeHosting(mrs: Record<string, MrState>) {
  const calls: string[] = []
  const blocks: string[] = []
  return {
    calls,
    blocks,
    hosting: {
      readMr: async (mr: MrRef): Promise<MrState | Problem> => (calls.push(`read ${mr.ref}`), mrs[mr.ref] ?? { error: 'no', fix: 'settings' }),
      host: async (mr: MrRef, pics: Array<{ name: string }>): Promise<Record<string, string> | Problem> => (calls.push(`host ${mr.ref}`), Object.fromEntries(pics.map((p) => [p.name, `https://img/${p.name}`]))),
      replaceBlock: async (mr: MrRef, _expected: string | null, block: string): Promise<{ ok: true } | Problem> => (calls.push(`write ${mr.ref}`), blocks.push(block), { ok: true })
    }
  }
}
const OWN_REF = '/repos/acme/shop-web/pulls/41'
function noPictures(h = fakeHosting({}), ocr: (f: string) => Promise<string | null> = async () => '') {
  return {
    ocr,
    host: 'mac.local',
    user: 'jdoe',
    hosting: h.hosting,
    target: (url: string) => (url === OWN ? { forge: 'github' as const, ref: OWN_REF } : undefined),
    home: '/Users/jdoe'
  }
}
/** Each criterion's steps get one shot, named by the criterion, with the given view. */
function shots(views: Record<string, string | undefined>): void {
  const file = join(home, 'qa', ID, 'report.json')
  const criteria = Object.entries(views).map(([id, view]) => {
    writeFileSync(join(home, 'qa', ID, `${id}.png`), PNG)
    return { id, status: 'pass', note: '', steps: [{ text: 'open', shot: `${id}.png`, ...(view && { view }) }] }
  })
  writeFileSync(file, JSON.stringify({ criteria }))
}

describe('qa to the mr', () => {
  it("the work's own mr is found by repo and branch", async () => {
    seed('git@github.com:acme/shop-web.git')
    const fresh = lists(
      [
        item('https://github.com/acme/cms-admin/pull/3', 'acme/cms-admin', BRANCH, '2026-11-11T12:00:00Z'),
        item('https://github.com/acme/shop-web/pull/40', 'acme/shop-web', 'feat/other', '2026-11-11T12:00:00Z'),
        item('https://github.com/acme/shop-web/pull/39', 'acme/shop-web', BRANCH, '2026-11-09T10:00:00Z'),
        item(OWN, 'acme/shop-web', BRANCH, '2026-11-10T10:00:00Z')
      ],
      // Someone else's MR on the same branch is never the work's: it cannot be commented as its author.
      [item('https://github.com/acme/shop-web/pull/50', 'acme/shop-web', BRANCH, '2026-11-11T12:00:00Z')]
    )
    let now = 1_000_000
    let last: { at: number; lists: MrLists } | null = null
    const list = vi.fn(async () => {
      last = { at: now, lists: fresh }
      return fresh
    })
    const qa = createQaPublish({ ...noPictures(), run, last: () => last, list, post: vi.fn(), now: () => now })

    // Never listed: main lists itself; the most recently updated of the work's own wins.
    expect(await qa.mrFor(ID)).toEqual({ url: OWN })
    expect(list).toHaveBeenCalledTimes(1)

    // A listing under 60 s old is reused…
    now += 59_000
    expect(await qa.mrFor(ID)).toEqual({ url: OWN })
    expect(list).toHaveBeenCalledTimes(1)
    // …an older one is not.
    now += 2_000
    expect(await qa.mrFor(ID)).toEqual({ url: OWN })
    expect(list).toHaveBeenCalledTimes(2)

    // No MR of Mías on that repo and branch, or no such work: none.
    last = { at: now, lists: lists([], fresh.mine) }
    expect(await qa.mrFor(ID)).toBeNull()
    expect(await qa.mrFor('nope0001')).toBeNull()
  })

  it('the qa summary reaches the mr as one comment', async () => {
    seed('https://github.com/acme/shop-web.git')
    const calls: Array<{ method: string; url: string; body: unknown }> = []
    let answer = (): Response => new Response(JSON.stringify({ id: 9, user: { login: 'pau' }, created_at: '2026-11-11T12:00:00Z', body: 'x' }), { status: 201 })
    const fetchImpl = (async (input: URL | string, init: RequestInit = {}) => {
      calls.push({ method: init.method ?? 'GET', url: String(input), body: init.body ? JSON.parse(String(init.body)) : undefined })
      return answer()
    }) as typeof fetch
    const targets: Record<string, ThreadTarget> = { [OWN]: { forge: 'github', ref: '/repos/acme/shop-web/pulls/41', author: 'pau' } }
    const threads = createThreads({ store: await store(), fetchImpl, target: (url) => targets[url] })
    const listed = lists([item(OWN, 'acme/shop-web', BRANCH, '2026-11-10T10:00:00Z')])
    const qa = createQaPublish({ ...noPictures(), run, last: () => ({ at: Date.now(), lists: listed }), list: async () => listed, post: (url, body) => threads.reply(url, 'general', body) })

    expect(await qa.publish(ID)).toEqual({ url: OWN })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.method).toBe('POST')
    expect(calls[0]!.url).toBe('https://api.github.com/repos/acme/shop-web/issues/41/comments')
    expect(calls[0]!.body).toEqual({
      body: [
        'Pruebas en vivo con Atril · Chrome',
        'Pasa · La fecha salta al siguiente laborable.',
        'Falla · Respeta el festivo de la provincia.\n> esperaba sábado 14, sale viernes 13',
        'Falla · Pide la provincia antes de pagar.\n> Pagar sin provincia',
        'Sin probar · Guarda la elección.',
        'Las capturas están en Atril.'
      ].join('\n\n')
    })

    // In the app's language, and without a target the first line names none.
    setLang('en')
    seed('https://github.com/acme/shop-web.git', { 'a.txt': 'x' })
    calls.length = 0
    expect(await qa.publish(ID)).toEqual({ url: OWN })
    expect(calls).toHaveLength(1)
    const body = (calls[0]!.body as { body: string }).body.split('\n\n')
    expect(body[0]).toBe('Live tests with Atril')
    expect(body[1]).toBe('Passing · La fecha salta al siguiente laborable.')
    expect(body.at(-2)).toBe('Untested · Guarda la elección.')
    expect(body.at(-1)).toBe('The screenshots are in Atril.')

    // A failing forge answers W150's sentence, its fix and its code; nothing else is sent.
    setLang('es')
    answer = () => new Response('{}', { status: 500 })
    calls.length = 0
    expect(await qa.publish(ID)).toEqual({ error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 500', fix: 'retry' })
    expect(calls).toHaveLength(1)
    // With no MR, nothing is posted.
    const none = createQaPublish({ ...noPictures(), run, last: () => ({ at: Date.now(), lists: lists([]) }), list: async () => lists([]), post: (url, body) => threads.reply(url, 'general', body) })
    calls.length = 0
    expect(await none.publish(ID)).toMatchObject({ error: 'Abre la MR para poder publicar aquí la QA.' })
    expect(calls).toHaveLength(0)
  })

  const silent = (): { listed: MrLists; post: (url: string, body: string) => Promise<{ error: string } | { comment: never }>; posted: string[] } => {
    const posted: string[] = []
    return { listed: lists([item(OWN, 'acme/shop-web', BRANCH, '2026-11-10T10:00:00Z')]), posted, post: async (_url, body) => (posted.push(body), { comment: undefined as never }) }
  }

  it('prepare reads the mr and writes nothing', async () => {
    seed('https://github.com/acme/shop-web.git')
    shots({ W1: 'home', W2: undefined })
    const h = fakeHosting({ [OWN_REF]: { description: 'Intro', target: 'main', merged: false } })
    const ran: string[] = []
    const spy: Runner = (cmd, args, opts) => (ran.push(cmd), run(cmd, args, opts))
    const { listed, post, posted } = silent()
    const qa = createQaPublish({ ...noPictures(h), run: spy, last: () => ({ at: Date.now(), lists: listed }), list: async () => listed, post })
    const r = await qa.preparePublish(ID)
    if (!('rows' in r)) throw new Error(r.error)
    expect(r.rows.map((x) => [x.id, x.verdict])).toEqual([
      ['W1', 'send'],
      ['W2', 'send']
    ])
    expect(r.token).toMatch(/^[0-9a-f]{32}$/)
    expect(h.calls).toEqual([`read ${OWN_REF}`])
    expect(posted).toEqual([])
    expect(ran.filter((c) => c !== 'git')).toEqual([])
  })

  it('a view already in the target branch shows as before', async () => {
    seed('https://github.com/acme/shop-web.git')
    shots({ W1: 'home', W2: 'cart', W3: undefined })
    const old = (n: number): string => `https://github.com/acme/shop-web/pull/${n}`
    const ref = (n: number): string => `/repos/acme/shop-web/pulls/${n}`
    const row = (view: string, n: number, at: number) => ({ view, link: `https://img/old-${n}-${view}.png`, mr: old(n), forge: 'github', ref: ref(n), at })
    mkdirSync(join(home, 'qa-views'), { recursive: true })
    writeFileSync(
      join(home, 'qa-views', 'shop.json'),
      JSON.stringify({
        rows: [
          row('home', 1, 100), // merged into main: the before
          row('home', 2, 200), // merged into develop
          row('home', 3, 300), // still open
          row('home', 41, 400), // this same MR, published earlier
          // cart: six newer open ones push the merged one past the five read
          row('cart', 9, 10),
          ...[11, 12, 13, 14, 15, 16].map((n) => row('cart', n, 1000 + n))
        ]
      })
    )
    const merged = (target: string): MrState => ({ description: '', target, merged: true })
    const open: MrState = { description: '', target: 'main', merged: false }
    const h = fakeHosting({
      [OWN_REF]: { description: 'Intro', target: 'main', merged: false },
      [ref(1)]: merged('main'),
      [ref(2)]: merged('develop'),
      [ref(3)]: open,
      [ref(9)]: merged('main'),
      ...Object.fromEntries([11, 12, 13, 14, 15, 16].map((n) => [ref(n), open]))
    })
    const { listed, post, posted } = silent()
    const qa = createQaPublish({ ...noPictures(h), run, last: () => ({ at: Date.now(), lists: listed }), list: async () => listed, post })
    const r = await qa.preparePublish(ID)
    if (!('token' in r) || !r.token) throw new Error('no token')
    expect(await qa.publish(ID, r.token)).toEqual({ url: OWN })
    expect(posted).toEqual([])

    const block = h.blocks[0]!
    expect(block).toContain('| ![Antes](https://img/old-1-home.png) | ![Después](https://img/')
    expect(block).not.toContain('old-9-cart')
    expect(h.calls.filter((c) => c.startsWith('read')).filter((c) => /pulls\/(9|1[1-6])$/.test(c))).toHaveLength(5)
    // This MR is read once, by prepare; never as its own «Antes».
    expect(h.calls.filter((c) => c === `read ${ref(41)}`)).toHaveLength(1)

    // The ledger now holds this MR's two views with their links.
    const ledger = JSON.parse(readFileSync(join(home, 'qa-views', 'shop.json'), 'utf8')) as { rows: Array<{ view: string; mr: string; link: string }> }
    const mine = ledger.rows.filter((x) => x.mr === OWN && x.link.startsWith('https://img/') && !x.link.includes('old'))
    expect(mine.map((x) => x.view).sort()).toEqual(['cart', 'home'])

    // The token is spent by the success.
    expect(await qa.publish(ID, r.token)).toMatchObject({ fix: 'recheck' })
  })

  it('without sendable pictures the comment goes as today', async () => {
    // No shots: no rows, no token, no forge read; publish posts W170's comment.
    seed('https://github.com/acme/shop-web.git')
    const h = fakeHosting({ [OWN_REF]: { description: 'Intro', target: 'main', merged: false } })
    const { listed, post, posted } = silent()
    const qa = createQaPublish({ ...noPictures(h), run, last: () => ({ at: Date.now(), lists: listed }), list: async () => listed, post })
    expect(await qa.preparePublish(ID)).toEqual({ rows: [], token: null })
    expect(await qa.publish(ID)).toEqual({ url: OWN })
    expect(posted).toHaveLength(1)
    expect(posted[0]).toContain('Las capturas están en Atril.')
    expect(h.calls).toEqual([])

    // Every picture blocked: the sheet's «Publicar sin imágenes» posts the same comment, nothing hosted or written.
    shots({ W1: 'home', W2: 'cart' })
    const blocked = createQaPublish({ ...noPictures(h, async () => 'http://localhost:3000'), run, last: () => ({ at: Date.now(), lists: listed }), list: async () => listed, post })
    const r = await blocked.preparePublish(ID)
    if (!('rows' in r) || !r.token) throw new Error('expected rows')
    expect(r.rows.every((x) => x.verdict === 'blocked' && x.reason === 'host')).toBe(true)
    expect(await blocked.publish(ID, r.token)).toEqual({ url: OWN })
    expect(posted).toHaveLength(2)
    expect(h.calls.filter((c) => !c.startsWith('read'))).toEqual([])
    expect(existsSync(join(home, 'qa-views', 'shop.json'))).toBe(false)
  })
})
