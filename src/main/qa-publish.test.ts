import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../preload/api'
import { createSecretStore, type Encryptor } from './credentials/store'
import { createThreads, type ThreadTarget } from './forge/threads'
import { setLang } from './lang'
import { createQaPublish } from './qa-publish'
import { run } from './run'
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
    const qa = createQaPublish({ run, last: () => last, list, post: vi.fn(), now: () => now })

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
    const qa = createQaPublish({ run, last: () => ({ at: Date.now(), lists: listed }), list: async () => listed, post: (url, body) => threads.reply(url, 'general', body) })

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
    const none = createQaPublish({ run, last: () => ({ at: Date.now(), lists: lists([]) }), list: async () => lists([]), post: (url, body) => threads.reply(url, 'general', body) })
    calls.length = 0
    expect(await none.publish(ID)).toMatchObject({ error: 'Abre la MR para poder publicar aquí la QA.' })
    expect(calls).toHaveLength(0)
  })
})
