import { describe, expect, it } from 'vitest'
import type { QaReport } from '../../preload/api'
import type { SecretStore } from '../credentials/store'
import { createQaHosting, qaBlock, splice } from './qa-hosting'

const store = (forge: 'github' | 'gitlab'): SecretStore =>
  ({ readSecret: async (f: string) => (f === forge ? { token: 'tok-123', ...(forge === 'gitlab' && { site: 'https://gitlab.acme.test' }) } : null) }) as unknown as SecretStore

interface Call {
  method: string
  url: string
  body: unknown
  headers: Record<string, string>
}
function forge(answer: (c: Call) => { status?: number; json?: unknown }) {
  const calls: Call[] = []
  const fetchImpl = (async (url: URL, init: RequestInit = {}) => {
    const raw = init.body
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw
    const c = { method: init.method ?? 'GET', url: String(url), body, headers: init.headers as Record<string, string> }
    calls.push(c)
    expect(init.redirect).toBe('error')
    const a = answer(c)
    return new Response(JSON.stringify(a.json ?? {}), { status: a.status ?? 200 })
  }) as unknown as typeof fetch
  return { calls, fetchImpl }
}

const GH = { forge: 'github' as const, ref: '/repos/acme/shop-web/pulls/7' }
const GL = { forge: 'gitlab' as const, ref: '/projects/42/merge_requests/3' }
const pic = (name: string) => ({ name, bytes: Buffer.from(`png-${name}`) })

function report(): QaReport {
  return {
    change: 'add-x',
    criteria: [
      { id: 'W1', text: 'Shows «Hola» on the home page' },
      { id: 'W2', text: 'Calls localhost:3000 from /Users/jdoe/app' },
      { id: 'W3', text: 'Nothing yet' }
    ],
    entries: [
      { id: 'W1', status: 'pass', note: '', steps: [] },
      { id: 'W2', status: 'fail', note: 'Token ghp_abc123def456 shown at «Pagar»', steps: [] }
    ],
    at: 1,
    target: { key: 'web', platform: 'chrome', dir: '', command: 'pnpm dev', why: '', source: 'detected' },
    targets: [],
    note: null,
    branch: 'feat/x',
    head: 'abc'
  }
}

describe('qa pictures on the forge', () => {
  it('github pictures land on an orphan atril-qa branch', async () => {
    const fresh = forge((c) => {
      if (c.method === 'GET' && c.url.endsWith('/git/ref/heads/atril-qa')) return { status: 404 }
      if (c.url.endsWith('/git/blobs')) return { json: { sha: `blob-${(c.body as { content: string }).content.length}` } }
      if (c.url.endsWith('/git/trees')) return { json: { sha: 'tree1' } }
      if (c.url.endsWith('/git/commits')) return { json: { sha: 'commit1' } }
      return { json: {} }
    })
    const h = createQaHosting({ store: store('github'), fetchImpl: fresh.fetchImpl })
    const links = await h.host(GH, [pic('aaaa.png'), pic('bbbb.png')])
    expect(links).toEqual({
      'aaaa.png': 'https://github.com/acme/shop-web/blob/commit1/qa/aaaa.png?raw=true',
      'bbbb.png': 'https://github.com/acme/shop-web/blob/commit1/qa/bbbb.png?raw=true'
    })
    const shape = fresh.calls.map((c) => `${c.method} ${c.url.replace('https://api.github.com/repos/acme/shop-web', '')}`)
    expect(shape).toEqual(['GET /git/ref/heads/atril-qa', 'POST /git/blobs', 'POST /git/blobs', 'POST /git/trees', 'POST /git/commits', 'POST /git/refs'])
    expect(fresh.calls[1]!.body).toEqual({ content: Buffer.from('png-aaaa.png').toString('base64'), encoding: 'base64' })
    const blob = (name: string): string => `blob-${Buffer.from(`png-${name}`).toString('base64').length}`
    expect(fresh.calls[3]!.body).toEqual({
      tree: [
        { path: 'qa/aaaa.png', mode: '100644', type: 'blob', sha: blob('aaaa.png') },
        { path: 'qa/bbbb.png', mode: '100644', type: 'blob', sha: blob('bbbb.png') }
      ]
    })
    expect(fresh.calls[4]!.body).toMatchObject({ tree: 'tree1', parents: [] })
    expect(fresh.calls[5]!.body).toEqual({ ref: 'refs/heads/atril-qa', sha: 'commit1' })

    // An existing branch grows on its tip; nothing ever names the work's branch or the contents API.
    const grown = forge((c) => {
      if (c.url.endsWith('/git/ref/heads/atril-qa')) return { json: { object: { sha: 'tip0' } } }
      if (c.url.endsWith('/git/commits/tip0')) return { json: { tree: { sha: 'tree0' } } }
      if (c.url.endsWith('/git/blobs')) return { json: { sha: 'b' } }
      if (c.url.endsWith('/git/trees')) return { json: { sha: 'tree2' } }
      if (c.url.endsWith('/git/commits')) return { json: { sha: 'commit2' } }
      return { json: {} }
    })
    await createQaHosting({ store: store('github'), fetchImpl: grown.fetchImpl }).host(GH, [pic('cccc.png')])
    expect(grown.calls.find((c) => c.url.endsWith('/git/trees'))!.body).toMatchObject({ base_tree: 'tree0' })
    expect(grown.calls.find((c) => c.url.endsWith('/git/commits'))!.body).toMatchObject({ parents: ['tip0'] })
    expect(grown.calls.at(-1)).toMatchObject({ method: 'PATCH', body: { sha: 'commit2' } })
    expect(grown.calls.at(-1)!.url).toMatch(/\/git\/refs\/heads\/atril-qa$/)
    for (const c of [...fresh.calls, ...grown.calls]) expect(c.url).not.toMatch(/feat|\/contents\/|\/pulls/)

    // A refusal comes back as the forge's problem, and the ref is never moved.
    const refused = forge((c) => (c.url.endsWith('/git/blobs') ? { status: 403 } : c.url.endsWith('atril-qa') ? { status: 404 } : { json: {} }))
    const r = await createQaHosting({ store: store('github'), fetchImpl: refused.fetchImpl }).host(GH, [pic('a.png')])
    expect(r).toMatchObject({ error: expect.any(String), fix: 'settings' })
    expect(refused.calls.some((c) => c.url.includes('/git/refs'))).toBe(false)
  })

  it('gitlab pictures go to project uploads', async () => {
    const f = forge((c) => ({ json: { full_path: `/-/project/42/uploads/s3cr/${(c.body as FormData).get('file') instanceof Blob ? 'x' : 'y'}.png` } }))
    const links = await createQaHosting({ store: store('gitlab'), fetchImpl: f.fetchImpl }).host(GL, [pic('aaaa.png')])
    expect(f.calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST https://gitlab.acme.test/api/v4/projects/42/uploads'])
    const form = f.calls[0]!.body as FormData
    expect((form.get('file') as File).name).toBe('aaaa.png')
    expect(Buffer.from(await (form.get('file') as File).arrayBuffer()).toString()).toBe('png-aaaa.png')
    expect(f.calls[0]!.headers['Content-Type']).toBeUndefined()
    expect(links).toEqual({ 'aaaa.png': 'https://gitlab.acme.test/-/project/42/uploads/s3cr/x.png' })
  })

  it('the atril block is replaced and the rest kept', async () => {
    const block = '<!-- atril-qa -->\nNEW\n<!-- /atril-qa -->'
    expect(splice('Intro\n\n<!-- atril-qa -->\nOLD\n<!-- /atril-qa -->\n\nOutro ✓', block)).toBe(`Intro\n\n${block}\n\nOutro ✓`)
    expect(splice('Intro', block)).toBe(`Intro\n\n${block}`)
    expect(splice('', block)).toBe(block)
    expect(splice(null, block)).toBe(block)
    expect(splice('A\n<!-- atril-qa -->\ncut off', block)).toBe(`A\n${block}`)
    expect(splice('A <!-- atril-qa -->1<!-- /atril-qa --> B <!-- atril-qa -->2<!-- /atril-qa --> C', block)).toBe(`A ${block} C`)

    // The block: W170's title, each criterion's word and text, its failing note quoted, After and Before pictures.
    const text = qaBlock(report(), { W1: { after: 'https://x/a.png', before: 'https://x/b.png' }, W2: { after: 'https://x/c.png' } }, '/Users/jdoe')
    expect(text.startsWith('<!-- atril-qa -->\n')).toBe(true)
    expect(text.endsWith('\n<!-- /atril-qa -->')).toBe(true)
    expect(text).toContain('Pruebas en vivo con Atril · Chrome')
    expect(text).toContain('**Pasa** · Shows «Hola» on the home page')
    expect(text).toContain('| Antes | Después |')
    expect(text).toContain('| ![Antes](https://x/b.png) | ![Después](https://x/a.png) |')
    expect(text).toContain('![Después](https://x/c.png)')
    expect(text).toContain('**Falla** ·')
    expect(text).toMatch(/\n> Token <token> shown at «Pagar»\n/)
    expect(text).toContain('**Sin probar** · Nothing yet')
    expect(text).not.toContain('Las capturas están en Atril.')

    // Written: GitHub's body, GitLab's description; every other byte as it was.
    for (const [mr, field, method] of [
      [GH, 'body', 'PATCH'],
      [GL, 'description', 'PUT']
    ] as const) {
      const current = 'Intro\n\n<!-- atril-qa -->\nOLD\n<!-- /atril-qa -->\nOutro'
      const f = forge((c) => (c.method === 'GET' ? { json: { [field]: current, ...(mr.forge === 'github' ? { base: { ref: 'main' } } : { target_branch: 'main' }) } } : { json: {} }))
      const h = createQaHosting({ store: store(mr.forge), fetchImpl: f.fetchImpl })
      expect(await h.replaceBlock(mr, current, block)).toEqual({ ok: true })
      expect(f.calls.at(-1)).toMatchObject({ method, body: { [field]: `Intro\n\n${block}\nOutro` } })
    }
  })

  it('a description changed since prepare is not written', async () => {
    const f = forge(() => ({ json: { body: 'Edited by a person', base: { ref: 'main' } } }))
    const h = createQaHosting({ store: store('github'), fetchImpl: f.fetchImpl })
    expect(await h.replaceBlock(GH, 'Original', 'BLOCK')).toEqual({ error: 'La descripción de la MR ha cambiado: publica otra vez', fix: 'recheck' })
    expect(f.calls.map((c) => c.method)).toEqual(['GET'])
    // A null description read as prepare saw it is not a change.
    const g = forge((c) => (c.method === 'GET' ? { json: { body: null, base: { ref: 'main' } } } : { json: {} }))
    expect(await createQaHosting({ store: store('github'), fetchImpl: g.fetchImpl }).replaceBlock(GH, null, 'BLOCK')).toEqual({ ok: true })
    expect(g.calls.at(-1)!.body).toEqual({ body: 'BLOCK' })
  })

  it('reads an mr: description, target branch and whether it merged', async () => {
    const gh = forge(() => ({ json: { body: 'B', base: { ref: 'main' }, merged_at: '2026-11-20T10:00:00Z' } }))
    expect(await createQaHosting({ store: store('github'), fetchImpl: gh.fetchImpl }).readMr(GH)).toEqual({ description: 'B', target: 'main', merged: true })
    const gl = forge(() => ({ json: { description: null, target_branch: 'develop', state: 'opened' } }))
    expect(await createQaHosting({ store: store('gitlab'), fetchImpl: gl.fetchImpl }).readMr(GL)).toEqual({ description: null, target: 'develop', merged: false })
    const none = await createQaHosting({ store: store('gitlab'), fetchImpl: gl.fetchImpl }).readMr(GH)
    expect(none).toMatchObject({ fix: 'settings' })
  })

  it('block text is scrubbed', () => {
    const text = qaBlock(report(), {}, '/Users/jdoe')
    expect(text).toContain('Calls <url> from <path>')
    expect(text).not.toMatch(/localhost|jdoe|ghp_/)
    // Quoted UI words stay: they are what the criterion is about.
    expect(text).toContain('«Hola»')
    expect(text).toContain('«Pagar»')
  })
})
