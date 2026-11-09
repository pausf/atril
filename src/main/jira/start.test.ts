import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasSession } from '../tmux'
import { run } from '../run'
import { listWorkspaces } from '../workspaces'
import { agentSpy, cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxSock } from '../test-helpers'
import { proposeStart, start } from './start'

const CREDS = { site: 'https://acme.atlassian.net', email: 'ada@example.com', token: 'tok-SECRET-123' }
const TRANSITIONS = {
  transitions: [
    { id: '11', name: 'To Do', to: { statusCategory: { key: 'new' } } },
    { id: '21', name: 'In Progress', to: { statusCategory: { key: 'indeterminate' } } }
  ]
}

function fakeJira(postStatus = 204): { fetch: typeof fetch; calls: Array<{ method: string; path: string; body?: string }> } {
  const calls: Array<{ method: string; path: string; body?: string }> = []
  const impl = (async (input: URL | string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    calls.push({ method, path: new URL(String(input)).pathname, ...(typeof init?.body === 'string' && { body: init.body }) })
    return method === 'GET' ? new Response(JSON.stringify(TRANSITIONS)) : new Response(null, { status: postStatus })
  }) as typeof fetch
  return { fetch: impl, calls }
}

let sock: string
let home: string
let repo: string

beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
  repo = makeRegisteredRepo(home)
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const issue = { key: 'PF-1', components: ['checkout'] }
const req = { ...issue, repoId: 'demo', branch: 'PF-1', model: 'default' as const }

describe('start', () => {
  it('remembers the repo per project and component', async () => {
    const first = await proposeStart(issue)
    expect(first).not.toHaveProperty('repoId')

    const jira = fakeJira()
    const r = await start(req, { creds: CREDS, fetchImpl: jira.fetch })
    expect('workspace' in r).toBe(true)

    expect(await proposeStart({ key: 'PF-2', components: ['checkout'] })).toMatchObject({ repoId: 'demo' })
    expect(await proposeStart({ key: 'PF-3', components: [] })).not.toHaveProperty('repoId')
    expect(await proposeStart({ key: 'PF-4', components: ['cart'] })).not.toHaveProperty('repoId')
    expect(await proposeStart({ key: 'XX-2', components: ['checkout'] })).not.toHaveProperty('repoId')

    const file = JSON.parse(readFileSync(join(home, 'repos.json'), 'utf8'))
    expect(file.jiraRepos).toEqual({ 'PF|checkout': 'demo' })
    expect(file.repos).toHaveLength(1)
  })

  it('proposes the issue key as the branch', async () => {
    const p = await proposeStart({ key: 'WEB-3535', components: [] }, { repoId: 'demo' })
    expect(p).toMatchObject({ repoId: 'demo', branch: 'WEB-3535', mode: 'worktree' })
    expect(p).not.toHaveProperty('note')
    expect((p as { reason: string }).reason).not.toBe('')
  })

  it('start launches libretto-flow with the key', async () => {
    const spy = agentSpy(run)
    const jira = fakeJira()
    const r = await start({ ...req, model: 'sonnet' }, { run: spy.run, creds: CREDS, fetchImpl: jira.fetch })
    if (!('workspace' in r)) throw new Error(r.error)

    const argv = spy.argvs[0]!
    expect(argv[0]).toBe('claude')
    expect(argv[argv.indexOf('--settings') + 1]).toMatch(/hooks\.json$/)
    expect(argv).toContain('--plugin-dir')
    expect(argv.slice(argv.indexOf('--model'), argv.indexOf('--model') + 2)).toEqual(['--model', 'sonnet'])
    expect(argv.at(-1)).toBe('/libretto:libretto-flow PF-1')

    expect(r.workspace).toMatchObject({ jiraKey: 'PF-1', model: 'sonnet', branch: 'PF-1', alive: true })
    expect(jira.calls).toEqual([
      { method: 'GET', path: '/rest/api/3/issue/PF-1/transitions' },
      { method: 'POST', path: '/rest/api/3/issue/PF-1/transitions', body: JSON.stringify({ transition: { id: '21' } }) }
    ])
    expect(r).not.toHaveProperty('transitionError')

    const plain = agentSpy(run)
    await start({ ...req, key: 'PF-2', branch: 'PF-2' }, { run: plain.run, creds: CREDS, fetchImpl: fakeJira().fetch })
    expect(plain.argvs[0]).not.toContain('--model')
  })

  it('refuses a malformed issue key', async () => {
    const spy = agentSpy(run)
    const jira = fakeJira()
    for (const key of ['pf-1', 'PF-', 'PF-1; rm -rf ~', '1PF-1', 'PF-1\n']) {
      expect(await start({ ...req, key }, { run: spy.run, creds: CREDS, fetchImpl: jira.fetch })).toHaveProperty('error')
      expect(await proposeStart({ key, components: [] })).toHaveProperty('error')
    }
    expect(spy.argvs).toHaveLength(0)
    expect(jira.calls).toHaveLength(0)
    expect(await listWorkspaces()).toEqual([])
  })

  it('transition failure keeps the workspace', async () => {
    const spy = agentSpy(run)
    const r = await start(req, { run: spy.run, creds: CREDS, fetchImpl: fakeJira(500).fetch })
    expect(r).toHaveProperty('workspace')
    if (!('workspace' in r)) return

    expect(r.transitionError).toMatch(/500/)
    expect(JSON.stringify(r)).not.toContain(CREDS.token)
    expect(await hasSession(r.workspace.id)).toBe(true)
    expect((await listWorkspaces()).map((w) => w.id)).toEqual([r.workspace.id])
  })

  it('proposes a free branch when the slug is taken', async () => {
    git(repo, 'branch', 'PF-1')
    const b = await proposeStart(issue, { repoId: 'demo' })
    expect(b).toMatchObject({ branch: 'PF-1B' })
    expect((b as { note: string }).note).toContain('PF-1')

    // A leftover worktree folder counts as taken even when no branch has that name.
    mkdirSync(join(home, 'wt', 'demo', 'PF-1B'), { recursive: true })
    expect(await proposeStart(issue, { repoId: 'demo' })).toMatchObject({ branch: 'PF-1C' })
  })
})
