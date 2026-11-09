import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceView } from '../../preload/api'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { setLang } from '../lang'
import type { RunOptions, RunResult, Runner } from '../run'
import { cleanTmp, tmp } from '../test-helpers'
import { createLenses } from './lenses'
import { createQueue, createScorer, type ScoreTarget } from './scores'
import { createThreads } from './threads'

const TOKEN = 'ghp_super-secret-forge-token'
const GL = 'https://git.example.com'
const GH_URL = 'https://github.com/acme/api/pull/7'
const GL_URL = `${GL}/grp/shop/-/merge_requests/5`
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}

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

async function connected() {
  const store = createSecretStore(enc)
  await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau', site: 'https://github.com' })
  await store.saveSecret('gitlab', { token: TOKEN, site: GL }, { account: 'pau', site: GL })
  return store
}

const fileDiff = (path: string, plus: number, minus = 0): string =>
  [`diff --git a/${path} b/${path}`, `index 111..222 100644`, `--- a/${path}`, `+++ b/${path}`, `@@ -1,${minus} +1,${plus} @@`, ...Array.from({ length: minus }, (_, i) => `-old ${i}`), ...Array.from({ length: plus }, (_, i) => `+new ${i}`)].join('\n') + '\n'

const F1 = { lens: 'security', severity: 'high', file: 'src/a.ts', line: 12, text: 'Entrada sin validar.' }
const F2 = { lens: 'tests', severity: 'low', text: 'Falta un test del caso vacío.' }
const claudeOk = (findings: unknown[] = [F1, F2]): RunResult => ({ code: 0, stdout: JSON.stringify({ type: 'result', is_error: false, result: '', structured_output: { findings } }), stderr: '' })

/** A fake claude plus a fake `git remote get-url origin` keyed by workspace path. */
function fakeRun(o: { answer?: (call: number) => RunResult | Promise<RunResult>; origins?: Record<string, string> } = {}) {
  const calls: Array<{ cmd: string; args: string[]; opts: RunOptions }> = []
  const gits: string[][] = []
  const run: Runner = async (cmd, args, opts = {}) => {
    if (cmd === 'git') {
      gits.push(args)
      const origin = o.origins?.[args[1]!]
      return origin ? { code: 0, stdout: `${origin}\n`, stderr: '' } : { code: 1, stdout: '', stderr: 'no origin' }
    }
    calls.push({ cmd, args, opts })
    return (o.answer ?? (() => claudeOk()))(calls.length)
  }
  return { run: vi.fn(run) as unknown as Runner, calls, gits }
}

/** A fake forge: the pull and its diff, GitLab diffs pages, and every POST recorded (or answered by `post`). */
function fakeForge(o: { ghHead?: string; ghDiff?: string | Response; post?: () => Response; down?: boolean } = {}) {
  const calls: Array<{ method: string; url: URL; init: RequestInit; body?: { body: string } }> = []
  const f = async (input: URL | string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input))
    const method = init.method ?? 'GET'
    calls.push({ method, url, init, ...(init.body !== undefined && { body: JSON.parse(String(init.body)) }) })
    if (o.down) throw Object.assign(new TypeError(`fetch failed ${url}`), { cause: { code: 'ECONNRESET' } })
    if (method === 'POST') return o.post?.() ?? new Response(JSON.stringify({ id: 999, user: { login: 'pau' }, created_at: new Date().toISOString(), body: 'x' }), { status: 201 })
    const accept = (init.headers as Record<string, string>)['Accept']
    if (url.pathname === '/repos/acme/api/pulls/7') {
      if (accept === 'application/vnd.github.diff') return o.ghDiff instanceof Response ? o.ghDiff : new Response(o.ghDiff ?? fileDiff('src/a.ts', 3), { status: 200 })
      return new Response(JSON.stringify({ number: 7, head: { sha: o.ghHead ?? 'gh1' } }), { status: 200 })
    }
    if (url.pathname === '/api/v4/projects/10/merge_requests/5/diffs') return new Response(JSON.stringify([{ old_path: 'a.rb', new_path: 'a.rb', diff: '@@ -1 +1 @@\n-a\n+b\n' }]), { status: 200 })
    return new Response('{}', { status: 404 })
  }
  return { f: vi.fn(f) as unknown as typeof fetch, calls }
}

const targets: Record<string, ScoreTarget> = {
  [GH_URL]: { forge: 'github', ref: '/repos/acme/api/pulls/7', head: 'gh1', project: 'acme/api', branch: 'feat/x' },
  [GL_URL]: { forge: 'gitlab', ref: '/projects/10/merge_requests/5', head: 'gl1', project: 'grp/shop', branch: 'feat/y' }
}

const ws = (id: string, branch: string, o: Partial<WorkspaceView> = {}): WorkspaceView => ({
  id,
  repoId: id,
  branch,
  mode: 'worktree',
  path: `/wt/${id}`,
  baseCommit: 'abc',
  agent: 'claude',
  session: `atril-${id}`,
  paneId: '%1',
  alive: true,
  ...o
})

interface Setup {
  claude?: ReturnType<typeof fakeRun>
  forge?: ReturnType<typeof fakeForge>
  target?: (url: string) => ScoreTarget | undefined
  listed?: (url: string) => boolean
  workspaces?: WorkspaceView[]
  send?: (id: string, text: string) => Promise<'sent' | 'ignored' | 'gone'>
  queue?: ReturnType<typeof createQueue>
  /** Keep what earlier lensers of this test stored; otherwise every lenser starts with none. */
  keep?: boolean
}

async function lenser(o: Setup = {}) {
  if (!o.keep) rmSync(join(home, 'lenses'), { recursive: true, force: true })
  const claude = o.claude ?? fakeRun()
  const forge = o.forge ?? fakeForge()
  const store = await connected()
  const target = o.target ?? ((url) => targets[url])
  const threads = createThreads({ store, fetchImpl: forge.f, target: (url) => (target(url) ? { forge: target(url)!.forge, ref: target(url)!.ref, author: 'ana' } : undefined) })
  const send = vi.fn(o.send ?? (async () => 'sent' as const))
  const l = createLenses({
    store,
    run: claude.run,
    fetchImpl: forge.f,
    target,
    listed: o.listed ?? ((url) => target(url) !== undefined),
    post: (url, body) => threads.reply(url, 'general', body),
    send,
    workspaces: async () => o.workspaces ?? [],
    ...(o.queue && { queue: o.queue })
  })
  return { l, claude, forge, send }
}

const stored = (): string[] => {
  try {
    return readdirSync(join(home, 'lenses'))
  } catch {
    return []
  }
}

const open = async (l: Awaited<ReturnType<typeof lenser>>['l'], url = GH_URL) => {
  const r = await l.review(url)
  if ('error' in r) throw new Error(r.error)
  return r
}

describe('mr lens drafts', () => {
  it('the lens review runs claude like the score and keeps drafts', async () => {
    setLang('en')
    const diff = fileDiff('src/a.ts', 3, 1)
    const { l, claude, forge } = await lenser({ forge: fakeForge({ ghDiff: diff }) })
    const r = await open(l)
    expect(r).toEqual({
      head: 'gh1',
      stale: false,
      canSend: false,
      drafts: [
        { id: expect.any(String), ...F1, state: 'open' },
        { id: expect.any(String), ...F2, state: 'open' }
      ]
    })
    expect(r.drafts[0]!.id).not.toBe(r.drafts[1]!.id)

    // Exactly the score's call: no tools, no session, the diff on stdin, never in argv.
    expect(claude.calls).toHaveLength(1)
    const { cmd, args, opts } = claude.calls[0]!
    expect(cmd).toBe('claude')
    expect(args.slice(0, -2)).toEqual(['-p', '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--json-schema'])
    const schema = JSON.parse(args.at(-2)!)
    expect(schema).toMatchObject({ type: 'object', additionalProperties: false, required: ['findings'] })
    expect(schema.properties.findings).toMatchObject({ type: 'array', maxItems: 12 })
    expect(schema.properties.findings.items).toMatchObject({ additionalProperties: false, required: ['lens', 'severity', 'text'] })
    expect(schema.properties.findings.items.properties.lens.enum).toEqual(['intent', 'security', 'design', 'reliability', 'tests'])
    expect(schema.properties.findings.items.properties.severity.enum).toEqual(['high', 'medium', 'low'])
    expect(schema.properties.findings.items.properties.text.maxLength).toBe(400)
    const instruction = args.at(-1)!
    expect(instruction).toMatch(/English/)
    for (const lens of ['intent', 'security', 'design', 'reliability', 'tests']) expect(instruction.toLowerCase(), lens).toContain(lens)
    expect(instruction).toMatch(/size S/)
    expect(opts.input).toBe(diff)
    expect(opts.timeoutMs).toBe(180_000)
    expect(args.join(' ')).not.toContain('+new 0')
    expect(JSON.stringify(claude.calls)).not.toContain(TOKEN)
    for (const c of forge.calls) expect(c.init.redirect).toBe('error')

    // Kept: one file, and the drafts are what draftsOf answers.
    expect(stored()).toHaveLength(1)
    expect(await l.draftsOf(GH_URL)).toEqual(r)

    // The same cut as the score: whole files up to 120 KB, with a line saying so.
    const chunk = (i: number) => fileDiff(`src/f${i}.ts`, 1) + '+' + 'x'.repeat(30 * 1024) + '\n'
    const big = await lenser({ forge: fakeForge({ ghDiff: [0, 1, 2, 3, 4].map(chunk).join('') }) })
    await open(big.l)
    const input = big.claude.calls[0]!.opts.input!
    expect(input).not.toContain('src/f3.ts')
    expect(input).toMatch(/\[.*cut.*\]\n$/)

    // Zero findings is an answer: stored, shown as no drafts.
    setLang('es')
    const none = await lenser({ claude: fakeRun({ answer: () => claudeOk([]) }) })
    expect(await none.l.review(GH_URL)).toEqual({ head: 'gh1', stale: false, canSend: false, drafts: [] })
    expect(stored()).toHaveLength(1)

    // The GitLab MR runs through its diffs the same way.
    const gl = await lenser()
    expect(await gl.l.review(GL_URL)).toMatchObject({ head: 'gl1', drafts: [{ lens: 'security' }, { lens: 'tests' }] })
    expect(gl.claude.calls[0]!.opts.input).toContain('diff --git a/a.rb b/a.rb')
    expect(gl.claude.calls[0]!.args.at(-1)).toMatch(/Spanish/)
  })

  it('a failing review stores nothing and says why', async () => {
    const say = async (o: Setup) => {
      const { l, claude } = await lenser(o)
      return { r: await l.review(GH_URL), claude }
    }
    const leak = 'SECRET-STDERR-from-claude'
    const detail = (d: string) => ({ error: `Claude no ha podido revisar esta MR: ${d}` })

    // The diff does not arrive: M6's texts, nothing run.
    let x = await say({ forge: fakeForge({ ghDiff: new Response('', { status: 502 }) }) })
    expect(x.r).toEqual(detail('GitHub ha respondido 502'))
    expect(x.claude.calls).toHaveLength(0)
    x = await say({ forge: fakeForge({ ghDiff: new Response('', { status: 406 }) }) })
    expect(x.r).toEqual(detail('es demasiado grande para GitHub'))
    x = await say({ forge: fakeForge({ down: true }) })
    expect(x.r).toEqual(detail('No se ha podido conectar con GitHub (ECONNRESET).'))

    x = await say({ claude: fakeRun({ answer: () => ({ code: 2, stdout: leak, stderr: leak }) }) })
    expect(x.r).toEqual(detail('2'))
    x = await say({ claude: fakeRun({ answer: () => ({ code: 124, stdout: leak, stderr: '' }) }) })
    expect(x.r).toEqual(detail('tiempo agotado'))
    for (const bad of [
      Array.from({ length: 13 }, () => F2),
      [{ ...F1, text: 'x'.repeat(401) }],
      [{ ...F1, lens: 'style' }],
      [{ ...F1, severity: 'critical' }],
      [{ ...F1, line: 1.5 }],
      [{ ...F1, file: 3 }],
      [{ ...F1, extra: leak }],
      [{ lens: 'tests', severity: 'low' }]
    ]) {
      x = await say({ claude: fakeRun({ answer: () => claudeOk(bad) }) })
      expect(x.r, JSON.stringify(bad)).toEqual(detail('respuesta fuera del esquema'))
    }
    for (const stdout of [`not json ${leak}`, JSON.stringify({ is_error: true, structured_output: { findings: [] } }), JSON.stringify({ is_error: false, structured_output: [F1] })]) {
      x = await say({ claude: fakeRun({ answer: () => ({ code: 0, stdout, stderr: '' }) }) })
      expect(x.r).toEqual(detail('respuesta fuera del esquema'))
    }
    expect(stored()).toEqual([])
    // Twelve is the most allowed, and then it is stored.
    const twelve = await say({ claude: fakeRun({ answer: () => claudeOk(Array.from({ length: 12 }, () => F2)) }) })
    expect('error' in twelve.r).toBe(false)
    expect(stored()).toHaveLength(1)

    // M17: an URL outside Mías and Me toca revisar is refused, without a request or a claude.
    const refused = await lenser({ target: () => undefined })
    expect(await refused.l.review('https://evil.example.com/x')).toEqual({ error: 'Solo se pueden puntuar tus MR y las que te toca revisar' })
    expect(await refused.l.review(GH_URL)).toEqual({ error: 'Solo se pueden puntuar tus MR y las que te toca revisar' })
    expect(refused.forge.calls).toHaveLength(0)
    expect(refused.claude.calls).toHaveLength(0)
  })

  it('reviews and scores share one runner, in the order asked', async () => {
    const release: Array<() => void> = []
    let running = 0
    let peak = 0
    const claude = fakeRun({
      answer: async () => {
        running++
        peak = Math.max(peak, running)
        await new Promise<void>((r) => release.push(r))
        running--
        return { code: 0, stdout: JSON.stringify({ is_error: false, structured_output: { findings: [], difficulty: 1, risk: 1, what: 'a', why: 'b', where: [] } }), stderr: '' }
      }
    })
    const queue = createQueue()
    const forge = fakeForge()
    const store = await connected()
    const scorer = createScorer({ store, run: claude.run, fetchImpl: forge.f, target: (u) => targets[u], emit: () => undefined, queue })
    const { l } = await lenser({ claude, forge, queue })
    const order: string[] = []

    const score = scorer.score(GH_URL).then(() => order.push('score'))
    const review = l.review(GH_URL)
    void review.then(() => order.push('review'))
    // Asking again for the same review returns the same run, and the score of the same URL does not collide with it.
    expect(l.review(GH_URL)).toBe(review)
    const second = l.review(GL_URL)
    void second.then(() => order.push('review2'))

    for (let i = 0; i < 3; i++) {
      await vi.waitFor(() => expect(release.length).toBe(i + 1))
      release[i]!()
    }
    await Promise.all([score, review, second])
    expect(order).toEqual(['score', 'review', 'review2'])
    expect(peak).toBe(1)
    expect(claude.calls).toHaveLength(3)
  })

  it('drafts are kept per commit', async () => {
    const { l, claude, forge } = await lenser()
    const first = await open(l)
    expect(claude.calls).toHaveLength(1)

    // Same head: the stored drafts, no Claude and no diff fetched.
    const fetched = forge.calls.length
    expect(await l.review(GH_URL)).toEqual(first)
    expect(claude.calls).toHaveLength(1)
    expect(forge.calls.slice(fetched).map((c) => (c.init.headers as Record<string, string>)['Accept'])).toEqual(['application/vnd.github+json'])

    // A newer head in the listing: kept, marked as from an earlier commit.
    const newer = await lenser({ keep: true, target: (u) => (u === GH_URL ? { ...targets[u]!, head: 'gh2' } : targets[u]) })
    expect(await newer.l.draftsOf(GH_URL)).toEqual({ ...first, stale: true })
    expect(newer.claude.calls).toHaveLength(0)
    // Unknown listed head: nothing says it is stale.
    const unknown = await lenser({ keep: true, target: (u) => (u === GH_URL ? { ...targets[u]!, head: undefined } : targets[u]) })
    expect(await unknown.l.draftsOf(GH_URL)).toEqual(first)

    // Asking again on the new head replaces every draft, published ones included.
    const second = await lenser({ keep: true, target: (u) => (u === GH_URL ? { ...targets[u]!, head: 'gh2' } : targets[u]), forge: fakeForge({ ghHead: 'gh2' }), claude: fakeRun({ answer: () => claudeOk([{ lens: 'design', severity: 'medium', text: 'Otra cosa.' }]) }) })
    const previous = await second.l.draftsOf(GH_URL)
    expect(previous).toMatchObject({ head: 'gh1' })
    const again = await open(second.l)
    expect(again).toMatchObject({ head: 'gh2', stale: false, drafts: [{ lens: 'design', text: 'Otra cosa.', state: 'open' }] })
    expect(second.claude.calls).toHaveLength(1)
    expect(again.drafts.map((d) => d.id)).not.toContain(first.drafts[0]!.id)
    expect(stored()).toHaveLength(1)
    expect(await second.l.draftsOf(GH_URL)).toEqual(again)

    // No head, nothing stored (as M13): the drafts are answered, not kept.
    const headless = await lenser({ target: (u) => (u === GL_URL ? { forge: 'gitlab', ref: targets[u]!.ref } : undefined) })
    const before = stored().length
    expect(await headless.l.review(GL_URL)).toMatchObject({ drafts: [{ lens: 'security' }, { lens: 'tests' }] })
    expect(stored()).toHaveLength(before)
    expect(await headless.l.draftsOf(GL_URL)).toEqual({ stale: false, canSend: false, drafts: [] })
  })

  it('a draft is published once as a general comment', async () => {
    const { l, forge } = await lenser()
    const r = await open(l)
    const [secured, tests] = r.drafts as [(typeof r.drafts)[0], (typeof r.drafts)[0]]
    const posts = () => forge.calls.filter((c) => c.method === 'POST')

    // Two clicks at once: one post.
    const [a, b] = await Promise.all([l.publish(GH_URL, secured.id), l.publish(GH_URL, secured.id)])
    expect(posts()).toHaveLength(1)
    expect([a, b].filter((x) => 'error' in x)).toHaveLength(1)
    expect(posts()[0]!.url.pathname).toBe('/repos/acme/api/issues/7/comments')
    expect(posts()[0]!.body).toEqual({ body: '**security · high** — `src/a.ts:12`\n\nEntrada sin validar.' })
    const done = [a, b].find((x) => !('error' in x))!
    expect(done).toMatchObject({ drafts: [{ id: secured.id, state: 'published' }, { id: tests.id, state: 'open' }] })
    expect(await l.draftsOf(GH_URL)).toEqual(done)

    // A published draft is not posted, sent or discarded again.
    for (const act of [l.publish, l.send, l.discard]) {
      expect(await act(GH_URL, secured.id)).toEqual({ error: 'Ese borrador ya no está abierto' })
    }
    expect(await l.publish(GH_URL, 'nope')).toEqual({ error: 'Ese borrador ya no está abierto' })
    expect(posts()).toHaveLength(1)

    // No location when `file` is absent; the text goes as written, markup included.
    await l.publish(GH_URL, tests.id)
    expect(posts()[1]!.body).toEqual({ body: '**tests · low**\n\nFalta un test del caso vacío.' })
    const odd = await lenser({ claude: fakeRun({ answer: () => claudeOk([{ lens: 'intent', severity: 'medium', file: 'src/b.ts', text: '<b>mal</b>\n- uno' }]) }) })
    const o = await open(odd.l)
    await odd.l.publish(GH_URL, o.drafts[0]!.id)
    expect(odd.forge.calls.find((c) => c.method === 'POST')!.body).toEqual({ body: '**intent · medium** — `src/b.ts`\n\n<b>mal</b>\n- uno' })

    // GitLab: the MR's general note.
    const gl = await lenser()
    const g = await open(gl.l, GL_URL)
    await gl.l.publish(GL_URL, g.drafts[0]!.id)
    expect(gl.forge.calls.find((c) => c.method === 'POST')!.url.pathname).toBe('/api/v4/projects/10/merge_requests/5/notes')

    // A failure keeps it open with M6's message, and it can be tried again.
    let fail = true
    const flaky = await lenser({ forge: fakeForge({ post: () => (fail ? new Response('', { status: 500 }) : new Response(JSON.stringify({ id: 1, created_at: '2026-11-09T10:00:00Z', body: 'x' }), { status: 201 })) }) })
    const f = await open(flaky.l)
    expect(await flaky.l.publish(GH_URL, f.drafts[0]!.id)).toEqual({ error: 'GitHub ha respondido 500' })
    expect(await flaky.l.draftsOf(GH_URL)).toMatchObject({ drafts: [{ state: 'open' }, { state: 'open' }] })
    fail = false
    expect(await flaky.l.publish(GH_URL, f.drafts[0]!.id)).toMatchObject({ drafts: [{ state: 'published' }, { state: 'open' }] })

    // An MR outside the latest listing: refused without a request, the draft stays open.
    let listed = true
    const gone = await lenser({ listed: () => listed })
    const x = await open(gone.l)
    listed = false
    const before = gone.forge.calls.length
    for (const act of [gone.l.publish, gone.l.send, gone.l.discard]) {
      expect(await act(GH_URL, x.drafts[0]!.id)).toEqual({ error: 'Esta MR ya no está en la lista: actualiza' })
    }
    expect(gone.forge.calls).toHaveLength(before)
    listed = true
    expect(await gone.l.draftsOf(GH_URL)).toMatchObject({ drafts: [{ state: 'open' }, { state: 'open' }] })

    // Discarding removes the draft and nothing else.
    expect(await gone.l.discard(GH_URL, x.drafts[0]!.id)).toMatchObject({ drafts: [{ id: x.drafts[1]!.id, state: 'open' }] })
    expect(posts()).toHaveLength(2)
  })

  it('a draft goes to the one agent on that branch', async () => {
    const origins = { '/wt/api': 'git@github.com:acme/api.git', '/wt/api2': 'https://github.com/acme/api.git', '/wt/other': 'git@github.com:acme/api-extra.git', '/wt/shop': `${GL}/grp/shop.git` }
    const one = [ws('api', 'feat/x', { path: '/wt/api' }), ws('other', 'feat/x', { path: '/wt/other' }), ws('dead', 'feat/x', { path: '/wt/api2', alive: false }), ws('elsewhere', 'feat/z', { path: '/wt/api2' })]
    const sent: Array<[string, string]> = []
    const claude = fakeRun({ origins })
    const { l, send } = await lenser({ claude, workspaces: one, send: async (id, text) => (sent.push([id, text]), 'sent') })
    const r = await open(l)
    expect(r.canSend).toBe(true)
    expect(await l.draftsOf(GH_URL)).toMatchObject({ canSend: true })
    // The origin is asked of each live workspace on that branch, in its own folder.
    expect(claude.gits.every((g) => g[0] === '-C' && g.slice(2).join(' ') === 'remote get-url origin')).toBe(true)

    const [secured, tests] = r.drafts as [(typeof r.drafts)[0], (typeof r.drafts)[0]]
    const sentOne = await l.send(GH_URL, secured.id)
    expect(sent).toEqual([['api', 'Revisión de Libretto (security, high) en src/a.ts:12: Entrada sin validar.']])
    expect(sentOne).toMatchObject({ drafts: [{ id: secured.id, state: 'sent' }, { id: tests.id, state: 'open' }] })
    // No location: «la MR».
    await l.send(GH_URL, tests.id)
    expect(sent[1]).toEqual(['api', 'Revisión de Libretto (tests, low) en la MR: Falta un test del caso vacío.'])
    // Sent once.
    expect(await l.send(GH_URL, secured.id)).toEqual({ error: 'Ese borrador ya no está abierto' })
    expect(send).toHaveBeenCalledTimes(2)

    // File without line: just the file.
    const fileOnly = await lenser({ claude: fakeRun({ origins, answer: () => claudeOk([{ lens: 'design', severity: 'low', file: 'src/c.ts', text: 'Nombre confuso.' }]) }), workspaces: one, send: async (id, text) => (sent.push([id, text]), 'sent') })
    const fo = await open(fileOnly.l)
    await fileOnly.l.send(GH_URL, fo.drafts[0]!.id)
    expect(sent.at(-1)![1]).toBe('Revisión de Libretto (design, low) en src/c.ts: Nombre confuso.')

    // Two live workspaces on that branch in repos of the project: not offered, never sent.
    const two = await lenser({ claude: fakeRun({ origins }), workspaces: [ws('api', 'feat/x', { path: '/wt/api' }), ws('api2', 'feat/x', { path: '/wt/api2' })] })
    const t2 = await open(two.l)
    expect(t2.canSend).toBe(false)
    expect(await two.l.send(GH_URL, t2.drafts[0]!.id)).toEqual({ error: 'No se pudo enviar: ese trabajo ya no está' })
    expect(two.send).not.toHaveBeenCalled()

    // None: a dead one, another branch, another project, no origin.
    for (const list of [[], [ws('api', 'feat/x', { path: '/wt/api', alive: false })], [ws('api', 'feat/z', { path: '/wt/api' })], [ws('other', 'feat/x', { path: '/wt/other' })], [ws('x', 'feat/x', { path: '/wt/unknown' })]]) {
      const none = await lenser({ claude: fakeRun({ origins }), workspaces: list })
      expect((await open(none.l)).canSend).toBe(false)
    }
    // An MR with no branch known cannot be sent either.
    const branchless = await lenser({ claude: fakeRun({ origins }), workspaces: one, target: (u) => (u === GH_URL ? { ...targets[u]!, branch: undefined } : undefined) })
    expect((await open(branchless.l)).canSend).toBe(false)

    // GitLab: the project path of the MR against the origin.
    const gl = await lenser({ claude: fakeRun({ origins }), workspaces: [ws('shop', 'feat/y', { path: '/wt/shop' })] })
    expect((await open(gl.l, GL_URL)).canSend).toBe(true)

    // The agent is gone or ignored the text: the draft stays open with N3's message.
    for (const answer of ['gone', 'ignored'] as const) {
      const bad = await lenser({ claude: fakeRun({ origins }), workspaces: one, send: async () => answer })
      const b = await open(bad.l)
      expect(await bad.l.send(GH_URL, b.drafts[0]!.id)).toEqual({ error: 'No se pudo enviar: ese trabajo ya no está' })
      expect(await bad.l.draftsOf(GH_URL)).toMatchObject({ drafts: [{ state: 'open' }, { state: 'open' }] })
    }
  })
})
