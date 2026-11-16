import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrDraft, MrDrafts, MrDraftsResult } from '../../preload/api'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { setLang } from '../lang'
import type { RunResult, Runner } from '../run'
import { cleanTmp, tmp } from '../test-helpers'
import { createLenses } from './lenses'
import type { ScoreTarget } from './scores'
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
  cleanTmp()
})

const LINE = { lens: 'security', severity: 'high', file: 'src/a.ts', line: 12, text: 'Entrada sin validar.' }
const claudeWith = (findings: unknown[]): Runner =>
  vi.fn(async (): Promise<RunResult> => ({ code: 0, stdout: JSON.stringify({ type: 'result', is_error: false, result: '', structured_output: { findings } }), stderr: '' })) as unknown as Runner

type Call = { method: string; url: URL; body?: Record<string, unknown> }

/**
 * A fake forge: GitHub's pull, GitLab's MR with its diff_refs (heads in `forgeHead`, a read answering `read`),
 * both diffs with one renamed file, every POST recorded and answered by `answer` (a thrown error is the network).
 */
function fakeForge(answer: (path: string) => number = () => 201) {
  const calls: Call[] = []
  const forgeHead = { gh: 'gh1', gl: 'gl1' }
  const state = { read: 200 }
  const f = async (input: URL | string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input))
    const method = init.method ?? 'GET'
    calls.push({ method, url, ...(init.body !== undefined && { body: JSON.parse(String(init.body)) }) })
    if (method === 'POST') {
      const status = answer(url.pathname)
      if (status === 0) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } })
      return new Response(status < 300 ? JSON.stringify({ id: 1, created_at: '2026-11-10T10:00:00Z', body: 'x' }) : '{"message":"line not in diff"}', { status })
    }
    const accept = (init.headers as Record<string, string>)['Accept']
    if (url.pathname === '/repos/acme/api/pulls/7') {
      if (accept === 'application/vnd.github.diff') return new Response('diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-a\n+b\n', { status: 200 })
      return new Response(JSON.stringify({ number: 7, head: { sha: forgeHead.gh } }), { status: state.read })
    }
    if (url.pathname === '/api/v4/projects/10/merge_requests/5') return new Response(JSON.stringify({ iid: 5, sha: forgeHead.gl, diff_refs: { base_sha: 'base1', start_sha: 'start1', head_sha: forgeHead.gl } }), { status: state.read })
    if (url.pathname === '/api/v4/projects/10/merge_requests/5/diffs')
      return new Response(JSON.stringify([{ old_path: 'src/a.ts', new_path: 'src/a.ts', diff: '@@ -1 +1 @@\n-a\n+b\n' }, { old_path: 'src/old.ts', new_path: 'src/new.ts', diff: '@@ -1 +1 @@\n-a\n+b\n' }]), { status: 200 })
    return new Response('{}', { status: 404 })
  }
  return { f: f as typeof fetch, calls, forgeHead, state, posts: () => calls.filter((c) => c.method === 'POST') }
}

async function lenser(o: { findings?: unknown[]; answer?: (path: string) => number; heads?: Record<string, string> } = {}) {
  // Every lenser starts with no stored drafts.
  rmSync(join(home, 'lenses'), { recursive: true, force: true })
  const store = createSecretStore(enc)
  await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau', site: 'https://github.com' })
  await store.saveSecret('gitlab', { token: TOKEN, site: GL }, { account: 'pau', site: GL })
  const forge = fakeForge(o.answer)
  // `heads` stands for main's latest listing: changing it after the review makes the drafts stale (M26).
  const heads = o.heads ?? { [GH_URL]: 'gh1', [GL_URL]: 'gl1' }
  const target = (url: string): ScoreTarget | undefined =>
    url === GH_URL ? { forge: 'github', ref: '/repos/acme/api/pulls/7', head: heads[GH_URL]!, project: 'acme/api', branch: 'feat/x' } : url === GL_URL ? { forge: 'gitlab', ref: '/projects/10/merge_requests/5', head: heads[GL_URL]!, project: 'grp/shop', branch: 'feat/y' } : undefined
  const threads = createThreads({ store, fetchImpl: forge.f, target: (url) => (target(url) ? { forge: target(url)!.forge, ref: target(url)!.ref, author: 'ana' } : undefined) })
  const l = createLenses({
    store,
    run: claudeWith(o.findings ?? [LINE]),
    fetchImpl: forge.f,
    target,
    listed: (url) => target(url) !== undefined,
    post: (url, body) => threads.reply(url, 'general', body),
    send: async () => 'sent',
    workspaces: async () => []
  })
  return { l, forge, heads }
}

const drafts = (r: MrDraftsResult): MrDraft[] => {
  if ('error' in r) throw new Error(r.error)
  return (r as MrDrafts).drafts
}

describe('mr line comments', () => {
  it('a draft lands on its line', async () => {
    // GitHub: a review comment on the drafts' head, right side; one post for two clicks.
    const gh = await lenser()
    const [d] = drafts(await gh.l.review(GH_URL))
    const before = gh.forge.calls.length
    const [a, b] = await Promise.all([gh.l.publish(GH_URL, d!.id), gh.l.publish(GH_URL, d!.id)])
    expect(gh.forge.posts()).toHaveLength(1)
    expect([a, b].filter((x) => 'error' in x)).toHaveLength(1)
    // The pull is read from the forge first, then posted to.
    expect(gh.forge.calls.slice(before).map((c) => `${c.method} ${c.url.pathname}`)).toEqual(['GET /repos/acme/api/pulls/7', 'POST /repos/acme/api/pulls/7/comments'])
    const post = gh.forge.posts()[0]!
    expect(post.url.href).toBe('https://api.github.com/repos/acme/api/pulls/7/comments')
    expect(post.body).toEqual({ body: '**security · high**\n\nEntrada sin validar.', commit_id: 'gh1', path: 'src/a.ts', line: 12, side: 'RIGHT' })
    const done = drafts([a, b].find((x) => !('error' in x))!)
    expect(done).toEqual([{ ...d, state: 'published' }])
    expect(drafts(await gh.l.draftsOf(GH_URL))).toEqual(done)

    // GitLab: a discussion positioned on the MR's diff_refs, read just before, with the file's old and new path.
    const renamed = { ...LINE, file: 'src/new.ts', line: 3 }
    const gl = await lenser({ findings: [LINE, renamed] })
    const [g, rn] = drafts(await gl.l.review(GL_URL))
    const reads = () => gl.forge.calls.filter((c) => c.method === 'GET' && c.url.pathname === '/api/v4/projects/10/merge_requests/5').length
    // The review read the MR for its description (M49); publishing reads it once more, just before posting.
    const reviewed = reads()
    expect(drafts(await gl.l.publish(GL_URL, g!.id))).toEqual([{ ...g, state: 'published' }, rn])
    expect(reads() - reviewed).toBe(1)
    expect(gl.forge.posts()).toHaveLength(1)
    const note = gl.forge.posts()[0]!
    expect(note.url.href).toBe(`${GL}/api/v4/projects/10/merge_requests/5/discussions`)
    expect(note.body).toEqual({
      body: '**security · high**\n\nEntrada sin validar.',
      position: { position_type: 'text', base_sha: 'base1', start_sha: 'start1', head_sha: 'gl1', old_path: 'src/a.ts', new_path: 'src/a.ts', new_line: 12 }
    })
    await gl.l.publish(GL_URL, rn!.id)
    expect(gl.forge.posts()[1]!.body).toMatchObject({ position: { old_path: 'src/old.ts', new_path: 'src/new.ts', new_line: 3 } })

    // A failed read of the MR keeps the draft open with M6's message and posts nothing.
    for (const [url, text] of [[GH_URL, 'GitHub está fallando ahora mismo.'], [GL_URL, 'GitLab está fallando ahora mismo.']] as const) {
      const r = await lenser()
      const [x] = drafts(await r.l.review(url))
      r.forge.state.read = 503
      expect(await r.l.publish(url, x!.id)).toEqual({ error: text })
      expect(r.forge.posts()).toHaveLength(0)
      expect(drafts(await r.l.draftsOf(url))).toEqual([x])
    }
  })

  it('a draft that cannot land falls back to a general comment', async () => {
    const general = '**security · high** — `src/a.ts:12`\n\nEntrada sin validar.'

    const NOTE = 'Publicado como comentario general: la forja no aceptó esa línea'
    // The forge refuses the line (GitHub 422, GitLab 400): one general comment after it, and the draft says so.
    const gh = await lenser({ answer: (p) => (p.endsWith('/pulls/7/comments') ? 422 : 201) })
    const [d] = drafts(await gh.l.review(GH_URL))
    const out = drafts(await gh.l.publish(GH_URL, d!.id))
    expect(gh.forge.posts().map((c) => c.url.pathname)).toEqual(['/repos/acme/api/pulls/7/comments', '/repos/acme/api/issues/7/comments'])
    expect(gh.forge.posts()[1]!.body).toEqual({ body: general })
    expect(out).toEqual([{ ...d, state: 'published', note: NOTE }])
    expect(drafts(await gh.l.draftsOf(GH_URL))).toEqual(out)

    const gl = await lenser({ answer: (p) => (p.endsWith('/discussions') ? 400 : 201) })
    const [g] = drafts(await gl.l.review(GL_URL))
    expect(drafts(await gl.l.publish(GL_URL, g!.id))).toEqual([{ ...g, state: 'published', note: NOTE }])
    expect(gl.forge.posts().map((c) => c.url.pathname)).toEqual(['/api/v4/projects/10/merge_requests/5/discussions', '/api/v4/projects/10/merge_requests/5/notes'])
    expect(gl.forge.posts()[1]!.body).toEqual({ body: general })

    // A newer head, in the listing (stale drafts) or only at the forge: the general comment, never a line that may have moved, and no note.
    for (const url of [GH_URL, GL_URL]) {
      for (const where of ['listing', 'forge'] as const) {
        const st = await lenser()
        const [s] = drafts(await st.l.review(url))
        if (where === 'listing') st.heads[url] = 'newer'
        else st.forge.forgeHead[url === GH_URL ? 'gh' : 'gl'] = 'newer'
        expect(drafts(await st.l.publish(url, s!.id))).toEqual([{ ...s, state: 'published' }])
        expect(st.forge.posts()).toHaveLength(1)
        expect(st.forge.posts()[0]!.url.pathname).toMatch(/\/(issues\/7\/comments|merge_requests\/5\/notes)$/)
        expect(st.forge.posts()[0]!.body).toEqual({ body: general })
      }
    }

    // No line, or no file: the general comment, once, with no note.
    const bare = await lenser({ findings: [{ ...LINE, line: undefined }, { lens: 'tests', severity: 'low', text: 'Falta un test.' }] })
    const [noLine, noFile] = drafts(await bare.l.review(GH_URL))
    await bare.l.publish(GH_URL, noLine!.id)
    expect(drafts(await bare.l.publish(GH_URL, noFile!.id))).toEqual([{ ...noLine, state: 'published' }, { ...noFile, state: 'published' }])
    expect(bare.forge.posts().map((c) => [c.url.pathname, c.body])).toEqual([
      ['/repos/acme/api/issues/7/comments', { body: '**security · high** — `src/a.ts`\n\nEntrada sin validar.' }],
      ['/repos/acme/api/issues/7/comments', { body: '**tests · low**\n\nFalta un test.' }]
    ])

    // Any other failure of the line post (5xx, network): the draft stays open with M6's message and nothing else is posted.
    for (const [status, url, text] of [
      [500, GH_URL, 'GitHub está fallando ahora mismo.'],
      [502, GL_URL, 'GitLab está fallando ahora mismo.'],
      [0, GH_URL, 'No llego a GitHub: ¿hay conexión?']
    ] as const) {
      const down = await lenser({ answer: () => status })
      const [x] = drafts(await down.l.review(url))
      expect(await down.l.publish(url, x!.id)).toEqual({ error: text })
      expect(down.forge.posts()).toHaveLength(1)
      expect(drafts(await down.l.draftsOf(url))).toEqual([x])
    }
  })
})
