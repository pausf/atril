import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agentSpy, cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { dropIdea, editIdea, ideaToJira, librettoCounts, librettoState, queueIdea, startQueued } from './libretto'
import { run } from './run'

let sock: string
let home: string
let repo: string

const changes = (): string => join(repo, '.agents', 'changes')
const proposal = (name: string, body: string, root = repo): void => {
  mkdirSync(join(root, '.agents', 'changes', name), { recursive: true })
  writeFileSync(join(root, '.agents', 'changes', name, 'proposal.md'), body)
}
const queuedBody = (name: string, date: string, reading = 'something'): string =>
  `# ${name}\n\nTracker: none\nQueued: ${date}\n\n## The ask, verbatim\n\n> x\n\n## Reading\n\n\n${reading}\nsecond line\n`
const commitAll = (): void => {
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'seed')
}

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

describe('libretto', () => {
  it('a repo\'s queue and work in flight are read from disk', async () => {
    expect(await librettoState(repo)).toEqual({ none: true })

    proposal('b-idea', queuedBody('b-idea', '2026-11-02'))
    proposal('a-idea', queuedBody('a-idea', '2026-11-02', 'first reading'))
    proposal('old-idea', queuedBody('old-idea', '2026-10-01'))
    // An empty «## Reading» falls back to the first line of the request, without its «> ».
    proposal('bare', '# bare\n\nTracker: none\nQueued: 2026-11-03\n\n## The ask, verbatim\n\n> Pedir descuentos\n> más\n\n## Reading\n\n')
    // «Queued:» after the first heading does not count: that folder is in flight.
    proposal('late', '# late\n\n## Reading\n\nQueued: 2026-09-01\n')
    proposal('doing', '# doing\n\nTracker: none\n\n## Checklist\n\n- [x] one\n- [ ] two\n- [ ] three\n')
    proposal('nobox', '# nobox\n')
    mkdirSync(join(changes(), 'empty'))
    commitAll()
    git(repo, 'branch', 'feat/a-idea')

    const s = await librettoState(repo)
    if (!('queued' in s)) throw new Error('expected a state')
    expect(s.queued).toEqual([
      { name: 'old-idea', date: '2026-10-01', ask: 'x', reading: 'something', started: false },
      { name: 'a-idea', date: '2026-11-02', ask: 'x', reading: 'first reading', started: true },
      { name: 'b-idea', date: '2026-11-02', ask: 'x', reading: 'something', started: false },
      { name: 'bare', date: '2026-11-03', ask: 'Pedir descuentos\nmás', reading: 'Pedir descuentos', started: false }
    ])
    const flight = Object.fromEntries(s.inFlight.map((f) => [f.name, f]))
    expect(Object.keys(flight).sort()).toEqual(['doing', 'empty', 'late', 'nobox'])
    expect(await librettoCounts(repo)).toEqual({ none: false, queued: 4, inFlight: 4 })
    expect(await librettoCounts(join(repo, 'nowhere'))).toEqual({ none: true, queued: 0, inFlight: 0 })
    expect(flight['doing']).toEqual({ name: 'doing', closed: 1, total: 3, firstOpen: 'two' })
    expect(flight['nobox']).toEqual({ name: 'nobox', closed: 0, total: 0 })
  })

  it('queueing an idea writes and commits only its proposal', async () => {
    mkdirSync(changes(), { recursive: true })
    writeFileSync(join(changes(), '.gitkeep'), '')
    commitAll()
    // Another file already staged, and another one dirty: neither may ride in the commit.
    writeFileSync(join(repo, 'staged.txt'), 's')
    git(repo, 'add', 'staged.txt')
    writeFileSync(join(repo, 'a.txt'), 'dirty')
    const head = git(repo, 'rev-parse', 'HEAD').trim()

    const r = await queueIdea(repo, '  Añadir «descuentos» relativos!!\nsegunda línea  ', run)
    expect(r).toEqual({ name: 'anadir-descuentos-relativos' })

    const file = join(changes(), 'anadir-descuentos-relativos', 'proposal.md')
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(readFileSync(file, 'utf8')).toBe(
      `# anadir-descuentos-relativos\n\nTracker: none\nQueued: ${iso}\n\n## The ask, verbatim\n\n> Añadir «descuentos» relativos!!\n> segunda línea\n\n## Reading\n\nAñadir «descuentos» relativos!!\n`
    )
    expect(git(repo, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): capture anadir-descuentos-relativos')
    expect(git(repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').trim()).toBe('.agents/changes/anadir-descuentos-relativos/proposal.md')
    expect(git(repo, 'rev-parse', 'HEAD~1').trim()).toBe(head)
    expect(git(repo, 'status', '--porcelain').split('\n').filter(Boolean).sort()).toEqual([' M a.txt', 'A  staged.txt'])

    // Taken names get a suffix that still fits in 40; a long one is cut; a symbol-only one is «idea».
    expect(await queueIdea(repo, 'Añadir descuentos relativos', run)).toEqual({ name: 'anadir-descuentos-relativos-2' })
    const long = await queueIdea(repo, 'x'.repeat(60), run)
    expect(long).toEqual({ name: 'x'.repeat(40) })
    expect(await queueIdea(repo, 'x'.repeat(60), run)).toEqual({ name: `${'x'.repeat(38)}-2` })
    expect(await queueIdea(repo, '¡¿?!', run)).toEqual({ name: 'idea' })
  })

  it('queueing refuses blank text or a repo without changes and cleans up a failed commit', async () => {
    expect('error' in (await queueIdea(repo, '   \n ', run))).toBe(true)
    expect(existsSync(join(repo, '.agents'))).toBe(false)
    // No .agents/changes/: nothing written.
    expect('error' in (await queueIdea(repo, 'idea', run))).toBe(true)
    expect(existsSync(join(repo, '.agents'))).toBe(false)

    mkdirSync(changes(), { recursive: true })
    writeFileSync(join(changes(), '.gitkeep'), '')
    commitAll()
    const failing: typeof run = (cmd, args, opts) => (args.includes('commit') ? Promise.resolve({ code: 1, stdout: '', stderr: 'boom' }) : run(cmd, args, opts))
    expect(await queueIdea(repo, 'hola mundo', failing)).toEqual({ error: 'boom' })
    expect(existsSync(join(changes(), 'hola-mundo'))).toBe(false)
    expect(git(repo, 'status', '--porcelain').trim()).toBe('')
  })

  it('starting a queued idea opens its work at write-spec', async () => {
    proposal('my-idea', queuedBody('my-idea', '2026-11-02'))
    commitAll()
    const spy = agentSpy(run)

    const r = await startQueued('demo', 'my-idea', spy.run)
    if (!('workspace' in r)) throw new Error(r.error)

    expect(r.workspace.branch).toBe('feat/my-idea')
    const text = readFileSync(join(r.workspace.path, '.agents', 'changes', 'my-idea', 'proposal.md'), 'utf8')
    expect(text).not.toMatch(/^Queued:/m)
    expect(git(r.workspace.path, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): start my-idea')
    expect(git(r.workspace.path, 'status', '--porcelain').trim()).toBe('')
    // The commit is in before the agent is given its first message, which is the write-spec step.
    expect(spy.argvs).toHaveLength(1)
    expect(spy.argvs[0]?.at(-1)).toBe('/libretto:write-spec my-idea')
    // The queued file in the repo's own checkout is untouched.
    expect(readFileSync(join(changes(), 'my-idea', 'proposal.md'), 'utf8')).toMatch(/^Queued:/m)

    const s = await librettoState(repo)
    if (!('queued' in s)) throw new Error('expected a state')
    expect(s.queued[0]?.started).toBe(true)
  })

  it('starting refuses what it cannot open and commits nothing', async () => {
    proposal('my-idea', queuedBody('my-idea', '2026-11-02'))
    commitAll()
    const head = git(repo, 'rev-parse', 'HEAD').trim()
    expect('error' in (await startQueued('nope', 'my-idea', run))).toBe(true)
    expect('error' in (await startQueued('demo', '../x', run))).toBe(true)
    // A name with no proposal: the worktree opened for it is taken away again.
    const r = await startQueued('demo', 'ghost', agentSpy(run).run)
    expect('error' in r).toBe(true)
    expect(git(repo, 'branch', '--list', 'feat/ghost').trim()).toBe('')
    expect(git(repo, 'worktree', 'list').trim().split('\n')).toHaveLength(1)
    expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(head)
  })

  describe('managing the queue', () => {
    const seed = (name = 'my-idea', body = `# ${name}\n\nTracker: none\nQueued: 2026-11-02\n\n## The ask, verbatim\n\n> old\n\n## Reading\n\nold\n`): void => {
      proposal(name, body)
      commitAll()
    }
    const dirty = (): string[] => git(repo, 'status', '--porcelain').split('\n').filter(Boolean).sort()
    const strayChanges = (): void => {
      writeFileSync(join(repo, 'staged.txt'), 's')
      git(repo, 'add', 'staged.txt')
      writeFileSync(join(repo, 'a.txt'), 'dirty')
    }
    const strays = [' M a.txt', 'A  staged.txt']
    const files = (): string => git(repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').trim()

    it('editing a queued idea commits only its proposal', async () => {
      seed()
      strayChanges()
      const r = await editIdea(repo, 'my-idea', ' new text\n\nsecond ', run)
      expect(r).toEqual({ ok: true })
      expect(readFileSync(join(changes(), 'my-idea', 'proposal.md'), 'utf8')).toBe(
        '# my-idea\n\nTracker: none\nQueued: 2026-11-02\n\n## The ask, verbatim\n\n> new text\n>\n> second\n\n## Reading\n\nold\n'
      )
      expect(git(repo, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): edit my-idea')
      expect(files()).toBe('.agents/changes/my-idea/proposal.md')
      expect(dirty()).toEqual(strays)

      // Saving the same text again is a quiet no-op, not a git error.
      const same = git(repo, 'rev-parse', 'HEAD').trim()
      expect(await editIdea(repo, 'my-idea', 'new text\n\nsecond', run)).toEqual({ ok: true })
      expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(same)

      // Nothing is written for blank text, an unsafe name, a started idea or one that is not queued.
      const head = git(repo, 'rev-parse', 'HEAD').trim()
      proposal('doing', '# doing\n\n## Checklist\n\n- [ ] a\n')
      proposal('begun', queuedBody('begun', '2026-11-02'))
      git(repo, 'add', '.agents')
      git(repo, 'commit', '-q', '-m', 'more', '--', '.agents')
      git(repo, 'branch', 'feat/begun')
      const after = git(repo, 'rev-parse', 'HEAD').trim()
      for (const [name, text] of [['my-idea', '  \n '], ['../x', 'a'], ['doing', 'a'], ['begun', 'a'], ['ghost', 'a']] as const) {
        expect('error' in (await editIdea(repo, name, text, run))).toBe(true)
      }
      expect(head).not.toBe(after)
      expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(after)
      expect(readFileSync(join(changes(), 'doing', 'proposal.md'), 'utf8')).toBe('# doing\n\n## Checklist\n\n- [ ] a\n')
      expect(readFileSync(join(changes(), 'begun', 'proposal.md'), 'utf8')).toBe(queuedBody('begun', '2026-11-02'))
      expect(dirty()).toEqual(strays)
    })

    it('deleting a queued idea commits only its removal', async () => {
      seed()
      proposal('keep', queuedBody('keep', '2026-11-03'))
      commitAll()
      // An untracked file inside the folder goes too; other dirt stays.
      writeFileSync(join(changes(), 'my-idea', 'notes.md'), 'scratch')
      strayChanges()
      expect(await dropIdea(repo, 'my-idea', run)).toEqual({ ok: true })
      expect(existsSync(join(changes(), 'my-idea'))).toBe(false)
      expect(existsSync(join(changes(), 'keep', 'proposal.md'))).toBe(true)
      expect(git(repo, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): drop my-idea')
      expect(files()).toBe('.agents/changes/my-idea/proposal.md')
      expect(dirty()).toEqual(strays)

      // Unsafe, unknown, not queued or started: nothing is removed.
      proposal('doing', '# doing\n\n## Checklist\n\n- [ ] a\n')
      proposal('begun', queuedBody('begun', '2026-11-02'))
      commitAll()
      git(repo, 'branch', 'feat/begun')
      const head = git(repo, 'rev-parse', 'HEAD').trim()
      for (const name of ['../keep', 'doing', 'begun', 'ghost']) expect('error' in (await dropIdea(repo, name, run))).toBe(true)
      expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(head)
      expect(existsSync(join(changes(), 'doing'))).toBe(true)
      expect(existsSync(join(changes(), 'begun'))).toBe(true)

      // A failed commit puts the folder back.
      const failing: typeof run = (cmd, args, opts) => (args.includes('commit') ? Promise.resolve({ code: 1, stdout: '', stderr: 'boom' }) : run(cmd, args, opts))
      expect(await dropIdea(repo, 'keep', failing)).toEqual({ error: 'boom' })
      expect(readFileSync(join(changes(), 'keep', 'proposal.md'), 'utf8')).toBe(queuedBody('keep', '2026-11-03'))
      expect(dirty()).toEqual([])
    })

    describe('to Jira', () => {
      const creds = { site: 'https://shop.atlassian.net/', email: 'a@b.c', token: 'tok' }
      const board = { id: 7, name: 'TEAM' }
      type Call = { url: string; method: string; auth: string | null; body?: unknown }
      const fake = (opts: { types?: unknown; postStatus?: number } = {}): { calls: Call[]; fetchImpl: typeof fetch } => {
        const calls: Call[] = []
        const json = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), { status })
        const fetchImpl = (async (input: URL | string, init?: RequestInit) => {
          const url = String(input)
          const method = init?.method ?? 'GET'
          calls.push({ url, method, auth: new Headers(init?.headers).get('authorization'), ...(init?.body !== undefined && { body: JSON.parse(String(init.body)) }) })
          if (url.endsWith('/rest/agile/1.0/board/7')) return json({ location: { projectKey: 'WEB' } })
          if (url.endsWith('/rest/api/3/issue/createmeta/WEB/issuetypes'))
            return json(opts.types ?? { issueTypes: [{ id: '1', name: 'Sub-task', subtask: true }, { id: '2', name: 'Bug', subtask: false }, { id: '3', name: 'Task', subtask: false }] })
          if (url.endsWith('/rest/api/3/issue') && method === 'POST')
            return opts.postStatus ? json({ errors: { x: 'secret detail' } }, opts.postStatus) : json({ key: 'WEB-9' }, 201)
          return json({}, 404)
        }) as typeof fetch
        return { calls, fetchImpl }
      }
      const seedIdea = (text = 'Primera línea\nsegunda\n\ntercera'): void => {
        const quoted = text.split('\n').map((l) => `> ${l}`.trimEnd()).join('\n')
        seed('my-idea', `# my-idea\n\nTracker: none\nQueued: 2026-11-02\n\n## The ask, verbatim\n\n${quoted}\n\n## Reading\n\n`)
      }

      it('sending an idea to Jira creates one issue and drops the idea', async () => {
        // The proposal's clauses, one case each.
        seedIdea()
        const ok = fake()
        expect(await ideaToJira(repo, 'my-idea', { creds, board, fetchImpl: ok.fetchImpl, run })).toEqual({ key: 'WEB-9' })
        expect(ok.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
          'GET https://shop.atlassian.net/rest/agile/1.0/board/7',
          'GET https://shop.atlassian.net/rest/api/3/issue/createmeta/WEB/issuetypes',
          'POST https://shop.atlassian.net/rest/api/3/issue'
        ])
        expect(ok.calls[0]?.auth).toBe(`Basic ${Buffer.from('a@b.c:tok').toString('base64')}`)
        const text = (s: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text: s }] })
        expect(ok.calls[2]?.body).toEqual({
          fields: {
            project: { key: 'WEB' },
            issuetype: { id: '3' },
            summary: 'Primera línea',
            description: { type: 'doc', version: 1, content: [text('Primera línea'), text('segunda'), { type: 'paragraph', content: [] }, text('tercera')] }
          }
        })
        expect(existsSync(join(changes(), 'my-idea'))).toBe(false)
        expect(git(repo, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): WEB-9 en Jira, my-idea')

        // No «Task»: the first type that is not a subtask, read from `values`; the summary is cut to 255.
        seedIdea('x'.repeat(300))
        const noTask = fake({ types: { values: [{ id: '1', name: 'Sub-task', subtask: true }, { id: '2', name: 'Story', subtask: false }] } })
        expect(await ideaToJira(repo, 'my-idea', { creds, board, fetchImpl: noTask.fetchImpl, run })).toEqual({ key: 'WEB-9' })
        const sent = (noTask.calls[2]?.body as { fields: { issuetype: unknown; summary: string } }).fields
        expect(sent.issuetype).toEqual({ id: '2' })
        expect(sent.summary).toBe('x'.repeat(255))

        // Jira answers an error: nothing removed, and what Jira said is not echoed.
        seedIdea()
        const head = git(repo, 'rev-parse', 'HEAD').trim()
        const bad = fake({ postStatus: 400 })
        const failed = await ideaToJira(repo, 'my-idea', { creds, board, fetchImpl: bad.fetchImpl, run })
        expect(failed).toEqual({ error: expect.stringContaining('400') })
        expect(JSON.stringify(failed)).not.toContain('secret detail')
        expect(existsSync(join(changes(), 'my-idea', 'proposal.md'))).toBe(true)
        expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(head)

        // No credentials or no board: Jira is not even asked.
        const none = fake()
        expect('error' in (await ideaToJira(repo, 'my-idea', { creds: null, board, fetchImpl: none.fetchImpl, run }))).toBe(true)
        expect('error' in (await ideaToJira(repo, 'my-idea', { creds, board: null, fetchImpl: none.fetchImpl, run }))).toBe(true)
        expect('error' in (await ideaToJira(repo, '../x', { creds, board, fetchImpl: none.fetchImpl, run }))).toBe(true)
        expect(none.calls).toEqual([])

        // The issue exists but the removal fails: both the key and the error come back, the idea stays.
        const failing: typeof run = (cmd, args, opts) => (args.includes('commit') ? Promise.resolve({ code: 1, stdout: '', stderr: 'boom' }) : run(cmd, args, opts))
        expect(await ideaToJira(repo, 'my-idea', { creds, board, fetchImpl: fake().fetchImpl, run: failing })).toEqual({ key: 'WEB-9', error: 'boom' })
        expect(existsSync(join(changes(), 'my-idea', 'proposal.md'))).toBe(true)
        expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(head)
      })
    })
  })
})
