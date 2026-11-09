import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrScoreState } from '../../preload/api'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { setLang } from '../lang'
import type { RunOptions, RunResult, Runner } from '../run'
import { cleanTmp, tmp } from '../test-helpers'
import { createForgeGuards } from './guards'
import { listMrs } from './mrs'
import { createScorer, metrics, type ScoreTarget } from './scores'

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

const AI = { difficulty: 3, risk: 2, what: 'Añade un filtro.', why: 'Toca la consulta.', where: ['src/a.ts'] }
const claudeOk = (ai: unknown = AI): RunResult => ({ code: 0, stdout: JSON.stringify({ type: 'result', is_error: false, result: '', structured_output: ai }), stderr: '' })

/** A fake claude: records each call and answers with `answer`, which may wait. */
function fakeClaude(answer: (call: number) => RunResult | Promise<RunResult> = () => claudeOk()) {
  const calls: Array<{ cmd: string; args: string[]; opts: RunOptions }> = []
  const run: Runner = async (cmd, args, opts = {}) => {
    calls.push({ cmd, args, opts })
    return answer(calls.length)
  }
  return { run: vi.fn(run) as unknown as Runner, calls }
}

/** A fake forge: GitHub's pull (JSON or diff by Accept) and GitLab's diffs pages. */
function fakeForge(o: { ghHead?: string; ghDiff?: string | Response; glPages?: unknown[][]; down?: boolean } = {}) {
  const calls: Array<{ url: URL; init: RequestInit }> = []
  const f = async (input: URL | string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input))
    calls.push({ url, init })
    if (o.down) throw Object.assign(new TypeError(`fetch failed ${url}`), { cause: { code: 'ECONNRESET' } })
    const accept = (init.headers as Record<string, string>)['Accept']
    if (url.pathname === '/repos/acme/api/pulls/7') {
      if (accept === 'application/vnd.github.diff') return o.ghDiff instanceof Response ? o.ghDiff : new Response(o.ghDiff ?? fileDiff('src/a.ts', 3), { status: 200 })
      return new Response(JSON.stringify({ number: 7, head: { sha: o.ghHead ?? 'gh1' } }), { status: 200 })
    }
    if (/^\/api\/v4\/projects\/10\/merge_requests\/\d+\/diffs$/.test(url.pathname)) {
      const pages = o.glPages ?? [[]]
      const n = Number(url.searchParams.get('page'))
      const body = pages[n - 1] ?? []
      return new Response(JSON.stringify(body), { status: 200, headers: n < pages.length ? { 'x-next-page': String(n + 1) } : {} })
    }
    return new Response('{}', { status: 404 })
  }
  return { f: vi.fn(f) as unknown as typeof fetch, calls }
}

const targets: Record<string, ScoreTarget> = {
  [GH_URL]: { forge: 'github', ref: '/repos/acme/api/pulls/7', head: 'gh1' },
  [GL_URL]: { forge: 'gitlab', ref: '/projects/10/merge_requests/5', head: 'gl1' }
}

async function scorer(o: { claude?: ReturnType<typeof fakeClaude>; forge?: ReturnType<typeof fakeForge>; target?: (url: string) => ScoreTarget | undefined } = {}) {
  const claude = o.claude ?? fakeClaude()
  const forge = o.forge ?? fakeForge()
  const changes: Array<[string, MrScoreState['state']]> = []
  const s = createScorer({
    store: await connected(),
    run: claude.run,
    fetchImpl: forge.f,
    target: o.target ?? ((url) => targets[url]),
    emit: (url, st) => changes.push([url, st.state])
  })
  return { s, claude, forge, changes }
}

const stored = (): string[] => {
  try {
    return readdirSync(join(home, 'scores'))
  } catch {
    return []
  }
}

describe('mr scores', () => {
  it('metrics come from the diff alone', () => {
    const diff =
      fileDiff('src/a.ts', 3, 2) +
      // A line that looks like a header inside a hunk is still a change.
      ['diff --git a/src/b.ts b/src/b.ts', '--- a/src/b.ts', '+++ b/src/b.ts', '@@ -1 +1,2 @@', ' same', '+++plus', '---minus'].join('\n') +
      '\n' +
      fileDiff('src/latest.ts', 1)
    expect(metrics(diff)).toEqual({ added: 5, removed: 3, files: 3, tests: false, size: 'S' })

    const tests = ['test/a.ts', 'src/Tests/a.php', 'spec/x.rb', 'specs/x.rb', 'src/__tests__/a.ts', 'src/a.test.ts', 'src/a.SPEC.tsx', 'pkg/a_test.go', 'src/CartTest.php', 'A/BTest.java', 'k/CTest.kt', 'n/DTest.cs']
    for (const path of tests) expect(metrics(fileDiff(path, 1)).tests, path).toBe(true)
    for (const path of ['src/latest.ts', 'src/contest/a.ts', 'src/testing.ts', 'src/a.ts', 'src/latest.php', 'src/Contest.java']) expect(metrics(fileDiff(path, 1)).tests, path).toBe(false)
    // The xUnit suffix is case-sensitive: OrdersTest.php is a test, latest.php is not.
    for (const path of ['tests/x.ts', 'src/OrdersTest.php', 'src/a.spec.ts', 'pkg/a_test.go']) expect(metrics(fileDiff(path, 1)).tests, path).toBe(true)

    const size = (n: number) => metrics(fileDiff('a.ts', n)).size
    expect([size(99), size(100), size(399), size(400), size(999), size(1000)]).toEqual(['S', 'M', 'M', 'L', 'L', 'XL'])
    expect(metrics(fileDiff('a.ts', 60, 40)).size).toBe('M')
  })

  it('scoring runs claude with no tools and the diff on stdin', async () => {
    setLang('en')
    const diff = fileDiff('src/a.ts', 3, 1)
    const { s, claude, forge } = await scorer({ forge: fakeForge({ ghDiff: diff }) })
    const r = await s.score(GH_URL)
    expect(r).toEqual({ state: 'done', score: { head: 'gh1', metrics: { added: 3, removed: 1, files: 1, tests: false, size: 'S' }, ai: AI, lang: 'en', at: expect.any(String) } })

    expect(claude.calls).toHaveLength(1)
    const { cmd, args, opts } = claude.calls[0]!
    expect(cmd).toBe('claude')
    const instruction = args.at(-1)!
    const schema = JSON.parse(args.at(-2)!)
    expect(args.slice(0, -2)).toEqual(['-p', '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--json-schema'])
    expect(schema).toMatchObject({ type: 'object', additionalProperties: false, required: ['difficulty', 'risk', 'what', 'why', 'where'] })
    expect(instruction).toMatch(/English/)
    expect(opts.input).toBe(diff)
    expect(opts.timeoutMs).toBe(180_000)
    // The diff never rides in argv, and no token reaches Claude.
    expect(args.join(' ')).not.toContain('+new 0')
    expect(JSON.stringify(claude.calls)).not.toContain(TOKEN)

    // GitHub: the pull for its head, then its diff; the token only in headers, never through a redirect.
    expect(forge.calls.map((c) => (c.init.headers as Record<string, string>)['Accept'])).toEqual(['application/vnd.github+json', 'application/vnd.github.diff'])
    for (const c of forge.calls) {
      expect(String(c.url)).not.toContain(TOKEN)
      expect(c.init.redirect).toBe('error')
      expect(c.init.signal).toBeInstanceOf(AbortSignal)
    }

    // GitLab: pages of diffs mounted as a unified diff; a file GitLab cuts still counts, with a note.
    setLang('es')
    const glForge = fakeForge({
      glPages: [
        Array.from({ length: 100 }, (_, i) => ({ old_path: `f${i}.ts`, new_path: `f${i}.ts`, diff: '@@ -1 +1 @@\n-a\n+b\n' })),
        [{ old_path: 'old.ts', new_path: 'new.ts', diff: '@@ -1 +1,2 @@\n a\n+b\n' }, { old_path: 'big.json', new_path: 'big.json', diff: '', too_large: true }]
      ]
    })
    const gl = await scorer({ forge: glForge })
    const g = await gl.s.score(GL_URL)
    expect(g).toMatchObject({ state: 'done', score: { head: 'gl1', lang: 'es', metrics: { added: 101, removed: 100, files: 102, size: 'M' } } })
    expect(glForge.calls.map((c) => [c.url.pathname, c.url.searchParams.get('per_page'), c.url.searchParams.get('page')])).toEqual([
      ['/api/v4/projects/10/merge_requests/5/diffs', '100', '1'],
      ['/api/v4/projects/10/merge_requests/5/diffs', '100', '2']
    ])
    const sent = gl.claude.calls[0]!.opts.input!
    expect(sent).toContain('diff --git a/old.ts b/new.ts\n--- a/old.ts\n+++ b/new.ts\n@@ -1 +1,2 @@\n a\n+b\n')
    expect(sent).toMatch(/diff --git a\/big\.json b\/big\.json\n--- a\/big\.json\n\+\+\+ b\/big\.json\n\\ .*too large/)
    expect(gl.claude.calls[0]!.args.at(-1)).toMatch(/Spanish/)

    // Over 120 KB: cut at the last whole file before it, with a line saying so; metrics keep the whole diff.
    const chunk = (i: number) => fileDiff(`src/f${i}.ts`, 1) + '+' + 'x'.repeat(30 * 1024) + '\n'
    const big = [0, 1, 2, 3, 4].map(chunk).join('')
    const cut = await scorer({ forge: fakeForge({ ghDiff: big, ghHead: 'gh-big' }) })
    const c = await cut.s.score(GH_URL)
    const input = cut.claude.calls[0]!.opts.input!
    expect(input.startsWith([0, 1, 2].map(chunk).join(''))).toBe(true)
    expect(input).not.toContain('src/f3.ts')
    expect(input.slice([0, 1, 2].map(chunk).join('').length)).toMatch(/^\[.*cut.*\]\n$/)
    expect(Buffer.byteLength(input)).toBeLessThanOrEqual(120 * 1024 + 200)
    expect(c).toMatchObject({ state: 'done', score: { metrics: { files: 5, added: 10 }, cut: { seen: Math.round(Buffer.byteLength([0, 1, 2].map(chunk).join('')) / 1024), total: Math.round(Buffer.byteLength(big) / 1024) } } })
  })

  it('failures store nothing and say why', async () => {
    const say = async (o: Parameters<typeof scorer>[0]) => {
      const { s, claude } = await scorer(o)
      const r = await s.score(GH_URL)
      return { r, claude }
    }

    // The diff does not arrive: M6's texts, nothing run.
    let x = await say({ forge: fakeForge({ ghDiff: new Response('', { status: 406 }) }) })
    expect(x.r).toEqual({ state: 'error', text: 'No se ha podido traer el diff: es demasiado grande para GitHub' })
    expect(x.claude.calls).toHaveLength(0)
    x = await say({ forge: fakeForge({ ghDiff: new Response('', { status: 401 }) }) })
    expect(x.r).toEqual({ state: 'error', text: 'No se ha podido traer el diff: GitHub ha rechazado el token: reemplázalo en Ajustes' })
    x = await say({ forge: fakeForge({ ghDiff: new Response('', { status: 502 }) }) })
    expect(x.r).toEqual({ state: 'error', text: 'No se ha podido traer el diff: GitHub ha respondido 502' })
    x = await say({ forge: fakeForge({ down: true }) })
    expect(x.r).toEqual({ state: 'error', text: 'No se ha podido traer el diff: No se ha podido conectar con GitHub (ECONNRESET).' })

    // Claude fails: the exit code, the timeout or the schema — never its output.
    const leak = 'SECRET-STDERR-from-claude'
    x = await say({ claude: fakeClaude(() => ({ code: 2, stdout: leak, stderr: leak })) })
    expect(x.r).toEqual({ state: 'error', text: 'Claude no ha podido puntuar esta MR (2)' })
    x = await say({ claude: fakeClaude(() => ({ code: 124, stdout: leak, stderr: '' })) })
    expect(x.r).toEqual({ state: 'error', text: 'Claude no ha podido puntuar esta MR (tiempo agotado)' })
    for (const bad of [
      { ...AI, difficulty: 6 },
      { ...AI, risk: 1.5 },
      { ...AI, what: 'x'.repeat(301) },
      { ...AI, where: ['a', 'b', 'c', 'd'] },
      { ...AI, extra: leak },
      { difficulty: 1, risk: 1, what: '', why: '' },
      null
    ]) {
      x = await say({ claude: fakeClaude(() => claudeOk(bad)) })
      expect(x.r, JSON.stringify(bad)).toEqual({ state: 'error', text: 'Claude no ha podido puntuar esta MR (respuesta fuera del esquema)' })
    }
    x = await say({ claude: fakeClaude(() => ({ code: 0, stdout: `not json ${leak}`, stderr: '' })) })
    expect(x.r).toEqual({ state: 'error', text: 'Claude no ha podido puntuar esta MR (respuesta fuera del esquema)' })
    x = await say({ claude: fakeClaude(() => ({ code: 0, stdout: JSON.stringify({ is_error: true, structured_output: AI }), stderr: '' })) })
    expect(x.r).toEqual({ state: 'error', text: 'Claude no ha podido puntuar esta MR (respuesta fuera del esquema)' })

    expect(stored()).toEqual([])
    // The failure is what the row shows next.
    const { s } = await scorer({ claude: fakeClaude(() => ({ code: 3, stdout: '', stderr: leak })) })
    await s.score(GH_URL)
    expect(await s.stateOf([GH_URL])).toEqual({ [GH_URL]: { state: 'error', text: 'Claude no ha podido puntuar esta MR (3)' } })
  })

  it('only listed mine and review urls are scored', async () => {
    const store = await connected()
    const guards = createForgeGuards()
    const glMr = (iid: number, author: string) => ({ web_url: `${GL}/grp/shop/-/merge_requests/${iid}`, title: 't', author: { username: author }, project_id: 10, iid, sha: `sha${iid}`, updated_at: new Date().toISOString(), references: { full: `grp/shop!${iid}` } })
    const listing = (async (input: URL | string) => {
      const u = new URL(String(input))
      if (u.origin === 'https://api.github.com') return new Response(JSON.stringify(u.pathname === '/search/issues' ? { total_count: 0, items: [] } : []), { status: 200 })
      if (u.pathname === '/api/v4/merge_requests') return new Response(JSON.stringify(u.searchParams.get('scope') === 'created_by_me' ? [glMr(1, 'pau')] : [glMr(2, 'eva')]), { status: 200 })
      if (u.pathname === '/api/v4/projects') return new Response(JSON.stringify([{ id: 10 }]), { status: 200 })
      if (u.pathname === '/api/v4/projects/10/merge_requests') return new Response(JSON.stringify([glMr(3, 'leo')]), { status: 200 })
      return new Response('{}', { status: 404 })
    }) as unknown as typeof fetch
    const lists = await listMrs(store, listing, guards.scorable)
    guards.listed([...lists.mine, ...lists.review, ...lists.following].map((m) => m.url))
    expect(lists.mine[0]!.head).toBe('sha1')
    expect(lists.following.map((m) => m.url)).toEqual([`${GL}/grp/shop/-/merge_requests/3`])
    // The forge's API path never reaches the window.
    expect(JSON.stringify(lists)).not.toContain('/projects/10')

    const forge = fakeForge()
    const claude = fakeClaude()
    const s = createScorer({ store, run: claude.run, fetchImpl: forge.f, target: guards.scoreTarget, emit: () => undefined })
    for (const url of [`${GL}/grp/shop/-/merge_requests/3`, 'https://evil.example.com/x', GH_URL]) {
      expect(await s.score(url), url).toEqual({ state: 'error', text: 'Solo se pueden puntuar tus MR y las que te toca revisar' })
    }
    expect(forge.calls).toHaveLength(0)
    expect(claude.calls).toHaveLength(0)

    // Mías and Me toca revisar are scored, with the head the listing gave.
    expect(await s.score(`${GL}/grp/shop/-/merge_requests/1`)).toMatchObject({ state: 'done', score: { head: 'sha1' } })
    expect(await s.score(`${GL}/grp/shop/-/merge_requests/2`)).toMatchObject({ state: 'done', score: { head: 'sha2' } })
    expect(forge.calls.map((c) => c.url.pathname)).toEqual(['/api/v4/projects/10/merge_requests/1/diffs', '/api/v4/projects/10/merge_requests/2/diffs'])

    // The next listing replaces the set.
    guards.scorable(new Map())
    expect(await s.score(`${GL}/grp/shop/-/merge_requests/1`)).toMatchObject({ state: 'error' })
    expect(claude.calls).toHaveLength(2)
  })

  it('a score is kept per commit', async () => {
    const { s, claude, forge } = await scorer()
    const first = await s.score(GH_URL)
    expect(claude.calls).toHaveLength(1)
    expect(stored()).toHaveLength(1)

    // Same commit: the stored score, no Claude, no diff fetched.
    const fetched = forge.calls.length
    expect(await s.score(GH_URL)).toEqual(first)
    expect(claude.calls).toHaveLength(1)
    expect(forge.calls.slice(fetched).map((c) => (c.init.headers as Record<string, string>)['Accept'])).toEqual(['application/vnd.github+json'])
    expect(await s.stateOf([GH_URL, GL_URL])).toEqual({ [GH_URL]: first, [GL_URL]: { state: 'none' } })

    // A new commit scores again and replaces it.
    const next = await scorer({ forge: fakeForge({ ghHead: 'gh2' }) })
    const again = await next.s.score(GH_URL)
    expect(next.claude.calls).toHaveLength(1)
    expect(again).toMatchObject({ state: 'done', score: { head: 'gh2' } })
    expect(stored()).toHaveLength(1)
    expect(await next.s.stateOf([GH_URL])).toEqual({ [GH_URL]: again })

    // GitLab: a cache hit for the listing's head fetches nothing at all.
    const gl = await scorer()
    await gl.s.score(GL_URL)
    const glFetched = gl.forge.calls.length
    await gl.s.score(GL_URL)
    expect(gl.forge.calls).toHaveLength(glFetched)
    expect(gl.claude.calls).toHaveLength(1)
  })

  it('scores run one at a time', async () => {
    const release: Array<() => void> = []
    const order: string[] = []
    let running = 0
    let peak = 0
    const claude = fakeClaude(async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise<void>((r) => release.push(r))
      running--
      return claudeOk()
    })
    const extra = 'https://github.com/acme/api/pull/8'
    const t3: Record<string, ScoreTarget> = { ...targets, [extra]: { forge: 'gitlab', ref: '/projects/10/merge_requests/5', head: 'gl8' } }
    const { s, changes } = await scorer({ claude, target: (u) => t3[u] })

    const a = s.score(GH_URL)
    const b = s.score(GL_URL)
    const c = s.score(extra)
    // Asking again while queued or running returns that same run.
    expect(s.score(GL_URL)).toBe(b)
    expect(s.score(GH_URL)).toBe(a)
    for (const p of [a, b, c]) void p.then(() => order.push(p === a ? 'a' : p === b ? 'b' : 'c'))

    await vi.waitFor(() => expect(release).toHaveLength(1))
    expect(await s.stateOf([GH_URL, GL_URL, extra])).toEqual({ [GH_URL]: { state: 'running' }, [GL_URL]: { state: 'queued' }, [extra]: { state: 'queued' } })
    for (let i = 0; i < 3; i++) {
      await vi.waitFor(() => expect(release.length).toBe(i + 1))
      release[i]!()
    }
    await Promise.all([a, b, c])
    expect(order).toEqual(['a', 'b', 'c'])
    expect(peak).toBe(1)
    expect(claude.calls).toHaveLength(3)
    expect(changes.filter(([u]) => u === GL_URL).map(([, st]) => st)).toEqual(['queued', 'running', 'done'])
  })
})
