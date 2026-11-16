import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { setLang } from '../lang'
import { cleanTmp, tmp } from '../test-helpers'
import { createPage, parseDiff } from './page'
import type { ThreadTarget } from './threads'

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

const targets: Record<string, ThreadTarget> = {
  [GH_URL]: { forge: 'github', ref: GH_REF, author: 'eva' },
  [GL_URL]: { forge: 'gitlab', ref: GL_REF, author: 'eva' }
}

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1..2 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -10,4 +10,5 @@ function x() {',
  ' keep',
  '-gone',
  '+new one',
  '+new two',
  ' tail',
  '\\ No newline at end of file',
  '@@ -40,2 +41,2 @@',
  '-old40',
  '+new41',
  ' same',
  'diff --git a/old name.ts b/new name.ts',
  'similarity index 90%',
  'rename from old name.ts',
  'rename to new name.ts',
  '--- a/old name.ts',
  '+++ b/new name.ts',
  '@@ -1 +1 @@',
  '-a',
  '+b',
  'diff --git a/.agents/changes/add-x/proposal.md b/.agents/changes/add-x/proposal.md',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/.agents/changes/add-x/proposal.md',
  '@@ -0,0 +1,2 @@',
  '+# add-x',
  '+--- not a header',
  'diff --git a/.agents/changes/old-y/proposal.md b/.agents/changes/old-y/proposal.md',
  'deleted file mode 100644',
  '--- a/.agents/changes/old-y/proposal.md',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-# old-y',
  ''
].join('\n')

/** A fake forge by path; a function answers per request, an Error is thrown, a number is that status. */
function fakeForge(routes: Record<string, unknown>) {
  const calls: Array<{ url: URL; init: RequestInit }> = []
  const f = vi.fn(async (input: URL | string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input))
    calls.push({ url, init })
    const accept = (init.headers as Record<string, string>)['Accept'] ?? ''
    const key = accept.includes('diff') ? `${url.pathname}#diff` : url.pathname
    const r = routes[key]
    if (r === undefined) return new Response('[]', { status: 200 })
    if (r instanceof Error) throw r
    if (typeof r === 'number') return new Response('{}', { status: r })
    if (typeof r === 'string') return new Response(r, { status: 200 })
    return new Response(JSON.stringify(r), { status: 200 })
  })
  return { f: f as unknown as typeof fetch, calls }
}

const page = async (forge: ReturnType<typeof fakeForge>) => createPage({ store: await connected(), fetchImpl: forge.f, target: (u) => targets[u] })

describe('mr page', () => {
  it('a diff parses into files with both line numbers', () => {
    const files = parseDiff(DIFF)
    expect(files.map((f) => [f.path, f.oldPath, f.added, f.removed])).toEqual([
      ['src/a.ts', 'src/a.ts', 3, 2],
      ['new name.ts', 'old name.ts', 1, 1],
      ['.agents/changes/add-x/proposal.md', '.agents/changes/add-x/proposal.md', 2, 0],
      ['.agents/changes/old-y/proposal.md', '.agents/changes/old-y/proposal.md', 0, 1]
    ])
    // Each line carries its kind and its numbers; hunk headers and «\ No newline» are not lines.
    expect(files[0]!.lines).toEqual([
      { kind: 'context', old: 10, new: 10, text: 'keep' },
      { kind: 'removed', old: 11, text: 'gone' },
      { kind: 'added', new: 11, text: 'new one' },
      { kind: 'added', new: 12, text: 'new two' },
      { kind: 'context', old: 12, new: 13, text: 'tail' },
      { kind: 'removed', old: 40, text: 'old40' },
      { kind: 'added', new: 41, text: 'new41' },
      { kind: 'context', old: 41, new: 42, text: 'same' }
    ])
    // A «---» inside a hunk is an added line, not a header.
    expect(files[2]!.lines.at(-1)).toEqual({ kind: 'added', new: 2, text: '--- not a header' })

    // GitLab's unsent file.
    const gl = parseDiff('diff --git a/big.json b/big.json\n--- a/big.json\n+++ b/big.json\n\\ GitLab did not send this file: too large\n')
    expect(gl).toEqual([{ path: 'big.json', oldPath: 'big.json', added: 0, removed: 0, lines: [], tooLarge: true }])

    // Past the cap, files keep their name and counts but no lines.
    const big = (n: number) => `diff --git a/f${n}.ts b/f${n}.ts\n--- a/f${n}.ts\n+++ b/f${n}.ts\n@@ -1 +1 @@\n-${'x'.repeat(400)}\n+${'y'.repeat(400)}\n`
    const capped = parseDiff(big(1) + big(2) + big(3), 1000)
    expect(capped.map((f) => [f.path, f.cut ?? false, f.lines.length, f.added])).toEqual([
      ['f1.ts', false, 2, 1],
      ['f2.ts', true, 0, 1],
      ['f3.ts', true, 0, 1]
    ])
  })

  it('the page reads the diff, reviewers and contract of a listed mr', async () => {
    // GitHub: requested reviewers are pending (a pending request wins), the latest review of each person counts, the author is not a reviewer.
    const gh = fakeForge({
      [`${GH_REF}#diff`]: DIFF,
      [GH_REF]: { requested_reviewers: [{ login: 'leo' }], user: { login: 'eva' } },
      [`${GH_REF}/reviews`]: [
        { user: { login: 'ana' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-11-01T10:00:00Z' },
        { user: { login: 'ana' }, state: 'APPROVED', submitted_at: '2026-11-02T10:00:00Z' },
        { user: { login: 'leo' }, state: 'COMMENTED', submitted_at: '2026-11-02T10:00:00Z' },
        { user: { login: 'max' }, state: 'COMMENTED', submitted_at: '2026-11-02T10:00:00Z' },
        { user: { login: 'max' }, state: 'DISMISSED', submitted_at: '2026-11-03T10:00:00Z' },
        { user: { login: 'eva' }, state: 'COMMENTED', submitted_at: '2026-11-03T10:00:00Z' },
        { user: { login: 'ivo' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-11-03T10:00:00Z' }
      ]
    })
    const r = await (await page(gh)).read(GH_URL)
    if ('error' in r) throw new Error(r.error)
    expect(r.files.map((f) => f.path)).toEqual(['src/a.ts', 'new name.ts', '.agents/changes/add-x/proposal.md', '.agents/changes/old-y/proposal.md'])
    expect(r.reviewers).toEqual([
      { name: 'leo', state: 'pending' },
      { name: 'ana', state: 'approved' },
      { name: 'max', state: 'commented' },
      { name: 'ivo', state: 'changes' }
    ])
    // The contract is an added or modified proposal.md, never a deleted one.
    expect(r.contract).toBe('add-x')
    for (const c of gh.calls) {
      expect(c.url.href).not.toContain(TOKEN)
      expect(c.init.redirect).toBe('error')
    }

    // GitLab: reviewers are pending, approvals approved; the diff is GitLab's assembled one.
    const gl = fakeForge({
      [`/api/v4${GL_REF}/diffs`]: [{ old_path: 'a.ts', new_path: 'a.ts', diff: '@@ -1 +1 @@\n-a\n+b\n' }, { old_path: 'big.json', new_path: 'big.json', too_large: true }],
      [`/api/v4${GL_REF}`]: { reviewers: [{ username: 'leo' }, { username: 'ana' }, { username: 'eva' }], author: { username: 'eva' } },
      [`/api/v4${GL_REF}/approvals`]: { approved_by: [{ user: { username: 'ana' } }] }
    })
    const lab = await (await page(gl)).read(GL_URL)
    if ('error' in lab) throw new Error(lab.error)
    expect(lab.files.map((f) => [f.path, f.tooLarge ?? false])).toEqual([['a.ts', false], ['big.json', true]])
    expect(lab.reviewers).toEqual([{ name: 'leo', state: 'pending' }, { name: 'ana', state: 'approved' }])
    expect(lab.contract).toBeUndefined()

    // GitLab's deleted proposal.md is no contract; its added one is.
    const glC = fakeForge({
      [`/api/v4${GL_REF}/diffs`]: [
        { old_path: '.agents/changes/old-y/proposal.md', new_path: '.agents/changes/old-y/proposal.md', deleted_file: true, diff: '@@ -1 +0,0 @@\n-# old-y\n' },
        { old_path: '.agents/changes/add-z/proposal.md', new_path: '.agents/changes/add-z/proposal.md', new_file: true, diff: '@@ -0,0 +1 @@\n+# add-z\n' }
      ],
      [`/api/v4${GL_REF}`]: { reviewers: [] }
    })
    expect(await (await page(glC)).read(GL_URL)).toMatchObject({ contract: 'add-z' })

    // A reviewers answer that is not JSON fails its card only.
    const junk = fakeForge({ [`${GH_REF}#diff`]: DIFF, [GH_REF]: { requested_reviewers: [] }, [`${GH_REF}/reviews`]: '<html>proxy</html>' })
    const junkPage = await (await page(junk)).read(GH_URL)
    expect(junkPage).toMatchObject({ contract: 'add-x', reviewers: { error: expect.any(String) } })
    expect('files' in junkPage && junkPage.files).toHaveLength(4)

    // A failed reviewers request fails its card only: files and contract still come.
    const halfGh = fakeForge({ [`${GH_REF}#diff`]: DIFF, [GH_REF]: { requested_reviewers: [] }, [`${GH_REF}/reviews`]: 500 })
    const half = await (await page(halfGh)).read(GH_URL)
    expect(half).toMatchObject({ contract: 'add-x', reviewers: { error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 500', fix: 'retry' } })
    expect('files' in half && half.files).toHaveLength(4)
    const halfGl = fakeForge({ [`/api/v4${GL_REF}/diffs`]: [], [`/api/v4${GL_REF}`]: { reviewers: [] }, [`/api/v4${GL_REF}/approvals`]: 403 })
    expect(await (await page(halfGl)).read(GL_URL)).toMatchObject({ files: [], reviewers: { error: 'GitLab no te deja ver esto con ese token.', detail: 'HTTP 403', fix: 'settings' } })

    // Only a failed diff fails the whole page, with W150.
    const down = fakeForge({ [`${GH_REF}#diff`]: Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }) })
    expect(await (await page(down)).read(GH_URL)).toEqual({ error: 'No encuentro GitHub.', detail: 'ENOTFOUND', fix: 'settings' })
    const glDown = fakeForge({ [`/api/v4${GL_REF}/diffs`]: 502 })
    expect(await (await page(glDown)).read(GL_URL)).toEqual({ error: 'GitLab está fallando ahora mismo.', detail: 'HTTP 502', fix: 'retry' })

    // GitHub's 406 is M16's «too large»: no lines, cut.
    const huge = fakeForge({ [`${GH_REF}#diff`]: 406, [GH_REF]: { requested_reviewers: [] }, [`${GH_REF}/reviews`]: [] })
    expect(await (await page(huge)).read(GH_URL)).toMatchObject({ files: [], cut: true, reviewers: [] })

    // An URL outside the listing is refused without a request.
    const none = fakeForge({})
    expect(await (await page(none)).read('https://github.com/acme/api/pull/999')).toEqual({ error: 'Esta MR ya no está en la lista: actualiza' })
    expect(none.calls).toHaveLength(0)
  })
})
