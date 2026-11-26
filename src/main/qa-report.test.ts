import { mkdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QaTarget, WorkspaceView } from '../preload/api'
import { readCriteria } from './qa-criteria'
import { launchQa, qaPrompt } from './qa'
import { createQaDone, qaBug, qaReport, qaRetest } from './qa-report'
import type { Runner } from './run'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'

const PROPOSAL = [
  '# add-x',
  '',
  '## Verification criteria',
  '',
  '- **W1** Atril shall do one thing.',
  '  Proof: src/a.test.ts one thing',
  '- **W2** (amended) Atril shall do the second thing,',
  '  across two lines. Proof: src/b.test.ts second',
  '- a bullet with no id',
  '- **W3** Third, with its proof inline Proof: src/c.test.ts third',
  '',
  '## Approach',
  '- **W9** not a criterion, it is under another heading',
  ''
].join('\n')

function project(files: Record<string, string>): string {
  const root = tmp()
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true })
    writeFileSync(join(root, name), body)
  }
  return root
}
const web = (proposal = PROPOSAL): string =>
  project({ 'package.json': JSON.stringify({ scripts: { dev: 'x' } }), '.agents/changes/add-x/proposal.md': proposal })
const rec = (id: string, path: string) => ({ id, repoId: 'demo', branch: `feat/${id}`, mode: 'worktree', path, baseCommit: 'abc123', agent: 'claude', session: `atril-${id}`, paneId: '%1' })

let home: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})
const seed = (...records: ReturnType<typeof rec>[]): void => writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: records }))
const none: Runner = async () => ({ code: 1, stdout: '', stderr: '' })

describe('criteria', () => {
  it('criteria are the id lines of the current change', async () => {
    expect(await readCriteria(web())).toEqual({
      change: 'add-x',
      criteria: [
        { id: 'W1', text: 'Atril shall do one thing.' },
        { id: 'W2', text: '(amended) Atril shall do the second thing, across two lines.' },
        { id: 'W3', text: 'Third, with its proof inline' }
      ]
    })
    expect(await readCriteria(project({ '.agents/changes/c/proposal.md': '# c\n\n## Verification criteria\n- no ids\n' }))).toEqual({ change: 'c', criteria: [] })
    expect(await readCriteria(project({ '.agents/changes/c/proposal.md': '# c\n- **W1** outside the section\n' }))).toEqual({ change: 'c', criteria: [] })
    expect(await readCriteria(project({ 'a.txt': 'x' }))).toEqual({ change: null, criteria: [] })
  })
})

describe('the report', () => {
  const shots = (): string => join(home, 'qa', 'qrep0001')
  const write = (body: unknown): void => {
    mkdirSync(shots(), { recursive: true })
    writeFileSync(join(shots(), 'report.json'), typeof body === 'string' ? body : JSON.stringify(body))
  }

  it('the qa report is read as untrusted data', async () => {
    const path = web()
    seed(rec('qrep0001', path))
    const entries = async () => (await qaReport('qrep0001', none))?.entries

    // No file, an unreadable one and malformed ones answer no entries; the criteria still come.
    expect(await entries()).toEqual([])
    expect((await qaReport('qrep0001', none))?.criteria.map((c) => c.id)).toEqual(['W1', 'W2', 'W3'])
    write('{ not json')
    expect(await entries()).toEqual([])
    write({ criteria: 'x' })
    expect(await entries()).toEqual([])
    write([1, 2])
    expect(await entries()).toEqual([])
    rmSync(join(shots(), 'report.json'))
    mkdirSync(join(shots(), 'report.json'))
    expect(await entries()).toEqual([])
    rmSync(join(shots(), 'report.json'), { recursive: true })
    expect(await qaReport('nobody00', none)).toBeNull()

    // Only criteria of the change with a status from the list; the rest is ignored.
    write({
      criteria: [
        { id: 'W1', status: 'pass', note: 'ok', steps: [{ text: 'open' }] },
        { id: 'W7', status: 'pass', note: 'not a criterion' },
        { id: 'W2', status: 'maybe', note: 'bad status' },
        { id: 'W3', status: 'untested', note: 'n/a' },
        null,
        'x'
      ]
    })
    expect(await entries()).toEqual([
      { id: 'W1', status: 'pass', note: 'ok', steps: [{ text: 'open' }] },
      { id: 'W3', status: 'untested', note: 'n/a', steps: [] }
    ])

    // The last entry per id wins.
    write({ criteria: [{ id: 'W1', status: 'fail', note: 'first' }, { id: 'W1', status: 'pass', note: 'second' }] })
    expect(await entries()).toEqual([{ id: 'W1', status: 'pass', note: 'second', steps: [] }])

    // Note and step texts are cut to 400, at most 30 steps; markup stays text.
    const steps = Array.from({ length: 40 }, (_, i) => ({ text: `${i}`.padEnd(500, 'x'), ms: i * 100 }))
    write({ criteria: [{ id: 'W1', status: 'fail', note: '<b>' + 'n'.repeat(500), steps }] })
    const [long] = (await entries())!
    expect(long!.note).toBe(('<b>' + 'n'.repeat(500)).slice(0, 400))
    expect(long!.steps).toHaveLength(30)
    expect(long!.steps[0]!.text).toHaveLength(400)
    expect(long!.steps[29]).toEqual({ text: '29'.padEnd(400, 'x'), ms: 2900 })

    // A step's shot stays only as a bare name of a file in the QA folder, with its modification time.
    writeFileSync(join(shots(), 'good.png'), 'png')
    utimesSync(join(shots(), 'good.png'), 1500, 1500)
    symlinkSync(join(path, 'package.json'), join(shots(), 'link.png'))
    writeFileSync(join(home, 'outside.png'), 'x')
    const names = ['good.png', '../outside.png', 'sub/good.png', '..', 'missing.png', 'link.png', '', 7, 'a\\b.png']
    write({ criteria: [{ id: 'W2', status: 'fail', note: 'n', steps: names.map((shot, i) => ({ text: `s${i}`, shot })) }] })
    const [shot] = (await entries())!
    expect(shot!.steps.map((s) => s.shot ?? null)).toEqual(['good.png', null, null, null, null, null, null, null, null])
    expect(shot!.steps[0]).toEqual({ text: 's0', shot: 'good.png', shotAt: 1500000 })
    expect(shot!.steps.filter((s) => s.shotAt !== undefined)).toHaveLength(1)

    // Alongside the entries: the report file's own time and the workspace's branch.
    const r = await qaReport('qrep0001', none)
    expect(r!.at).toBeGreaterThan(0)
    expect(r!.branch).toBe('feat/qrep0001')
  })

  it('a step keeps only a slug view', async () => {
    const path = web()
    seed(rec('qrep0001', path))
    const views = ['login', 'cart-2', 'Login', '-x', 'a b', 'x'.repeat(41), 'x'.repeat(40), 7, '../a']
    write({ criteria: [{ id: 'W1', status: 'pass', note: '', steps: views.map((view, i) => ({ text: `s${i}`, view })) }] })
    const [entry] = (await qaReport('qrep0001', none))!.entries
    expect(entry!.steps.map((s) => s.view ?? null)).toEqual(['login', 'cart-2', null, null, null, null, 'x'.repeat(40), null, null])
    expect(entry!.steps[2]).toEqual({ text: 's2' })

    const prompt = await qaPrompt({ key: 'web', platform: 'chrome', dir: '', command: 'pnpm dev' } as QaTarget, null, path, 'feat/x', 'abc', '/shots', 'qrep0001')
    expect(prompt).toContain('"view"')
    expect(prompt).toContain('«view»')
  })

  it('a finished QA run is one notice', async () => {
    const path = web()
    seed(rec('qrep0001', path))
    const done = vi.fn()
    const watch = createQaDone(done)
    const report = (statuses: Record<string, string>, mtime: number): void => {
      write({ criteria: Object.entries(statuses).map(([id, status]) => ({ id, status, note: '', steps: [] })) })
      utimesSync(join(shots(), 'report.json'), mtime / 1000, mtime / 1000)
    }
    const launched = Date.now()
    // A report left from before the launch, even complete, does not count.
    report({ W1: 'pass', W2: 'pass', W3: 'fail' }, launched - 60_000)
    watch.arm('qrep0001', launched)
    await watch.check()
    // One criterion untested or missing: not yet.
    report({ W1: 'pass', W2: 'untested', W3: 'fail' }, launched + 1000)
    await watch.check()
    report({ W1: 'pass', W3: 'fail' }, launched + 2000)
    await watch.check()
    expect(done).not.toHaveBeenCalled()
    report({ W1: 'pass', W2: 'pass', W3: 'fail' }, launched + 3000)
    await watch.check()
    expect(done.mock.calls).toEqual([['qrep0001', 2, 1]])
    // A later change in the same run adds none; the next launch arms it again.
    report({ W1: 'fail', W2: 'pass', W3: 'fail' }, launched + 4000)
    await watch.check()
    expect(done).toHaveBeenCalledTimes(1)
    watch.arm('qrep0001', launched + 5000)
    report({ W1: 'pass', W2: 'pass', W3: 'pass' }, launched + 6000)
    await watch.check()
    expect(done.mock.calls.at(-1)).toEqual(['qrep0001', 3, 0])

    // A change with no criteria adds none.
    const bare = web('# add-x\n\n## Verification criteria\n- nothing with an id\n')
    seed(rec('qrep0001', bare))
    watch.arm('qrep0001', launched + 7000)
    report({ W1: 'pass' }, launched + 8000)
    await watch.check()
    expect(done).toHaveBeenCalledTimes(2)
  })
})

describe('the prompt and the requests', () => {
  /** A fake tmux with one workspace pane (%1) and any panes the test adds. */
  function fake(): { run: Runner; splits: string[][]; typed: string[][]; panes: string[]; missing: Set<string> } {
    const f = { splits: [] as string[][], typed: [] as string[][], panes: ['%1'], missing: new Set<string>(), run: undefined as unknown as Runner }
    f.run = async (cmd, args) => {
      if (f.missing.has(cmd)) return { code: 127, stdout: '', stderr: 'ENOENT' }
      if (cmd === 'tmux' && args.includes('split-window')) {
        f.splits.push(args)
        f.panes.push(`%${40 + f.splits.length}`)
        return { code: 0, stdout: `%${40 + f.splits.length}\n`, stderr: '' }
      }
      if (cmd === 'tmux' && args.includes('list-panes')) return { code: 0, stdout: f.panes.join('\n') + '\n', stderr: '' }
      if (cmd === 'tmux' && args.includes('send-keys')) {
        f.typed.push(args)
        return { code: 0, stdout: '', stderr: '' }
      }
      return { code: 0, stdout: 'v1\n', stderr: '' }
    }
    return f
  }

  it('the qa prompt asks for a report per criterion', async () => {
    const path = web()
    const expo = project({ 'app.json': '{}', 'package.json': JSON.stringify({ dependencies: { expo: '1' } }), '.agents/changes/add-x/proposal.md': PROPOSAL })
    seed(rec('qprm0001', path), rec('qprm0002', expo))
    const f = fake()
    for (const id of ['qprm0001', 'qprm0002']) {
      expect(await launchQa(id, f.run)).toEqual({ ok: true })
      const prompt = f.splits.at(-1)!.at(-1)!
      const report = join(home, 'qa', id, 'report.json')
      // The path, the shape, the criteria with their ids and texts, and a whole-file rewrite after each.
      for (const part of [report, '"criteria"', '"id"', '"status"', 'pass', 'fail', 'untested', '"note"', '"steps"', '"text"', '"ms"', '"shot"', 'W1', 'Atril shall do one thing.', 'W2', 'W3', 'reescríbelo entero']) {
        expect(prompt).toContain(part)
      }
      expect(prompt).not.toContain('W9')
    }
  })

  it('testing one criterion asks the qa agent for just that', async () => {
    seed(rec('qret0001', web()), rec('qret0002', project({ 'README.md': 'x' })))
    const f = fake()
    mkdirSync(join(home, 'qa'), { recursive: true })
    const typedText = (): string[] => f.typed.filter((a) => a.includes('-l')).map((a) => a.at(-1)!)

    // No QA pane: QA launches with the request at the end of its prompt.
    expect(await qaRetest('qret0001', 'W2', f.run)).toEqual({ ok: true })
    expect(f.splits).toHaveLength(1)
    expect(f.splits[0]!.at(-1)!.endsWith('Prueba solo el criterio W2: (amended) Atril shall do the second thing, across two lines. Actualiza report.json.')).toBe(true)
    expect(f.typed).toEqual([])

    // A live QA pane (the one just launched): the request is typed there, then Enter. Nothing launches.
    expect(await qaRetest('qret0001', 'W3', f.run)).toEqual({ ok: true })
    expect(f.splits).toHaveLength(1)
    expect(f.typed).toEqual([
      ['send-keys', '-t', '%41', '-l', '--', 'Prueba solo el criterio W3: Third, with its proof inline. Actualiza report.json.'],
      ['send-keys', '-t', '%41', 'Enter']
    ])

    // «Reprobar todo».
    f.typed.length = 0
    expect(await qaRetest('qret0001', null, f.run)).toEqual({ ok: true })
    expect(typedText()).toEqual(['Prueba otra vez todos los criterios y actualiza report.json.'])

    // A criterion the change does not have types nothing.
    f.typed.length = 0
    expect('error' in (await qaRetest('qret0001', 'W9', f.run))).toBe(true)
    expect('error' in (await qaRetest('nobody00', null, f.run))).toBe(true)
    expect('error' in (await qaRetest('qret0002', null, f.run))).toBe(true)
    expect(f.typed).toEqual([])

    // W84 refuses (a tool is missing): its error comes back and nothing was started.
    f.panes = ['%1']
    f.missing.add('node')
    const refused = await qaRetest('qret0001', 'W1', f.run)
    expect('error' in refused && refused.error).toMatch(/node/i)
    expect(f.splits).toHaveLength(1)
  })
})

describe('a bug', () => {
  const creds = { site: 'https://shop.atlassian.net/', email: 'a@b.c', token: 'tok' }
  const board = { id: 7, name: 'TEAM' }
  function jira(postStatus?: number): { calls: Array<{ url: string; method: string; body?: { fields: { summary: string; description: { content: Array<{ content: Array<{ text: string }> }> } } } }>; fetchImpl: typeof fetch } {
    const calls: ReturnType<typeof jira>['calls'] = []
    const json = (d: unknown, status = 200): Response => new Response(JSON.stringify(d), { status })
    const fetchImpl = (async (input: URL | string, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, ...(init?.body !== undefined && { body: JSON.parse(String(init.body)) }) })
      if (url.endsWith('/board/7')) return json({ location: { projectKey: 'WEB' } })
      if (url.endsWith('/issuetypes')) return json({ issueTypes: [{ id: '3', name: 'Task', subtask: false }] })
      if (url.endsWith('/rest/api/3/issue') && method === 'POST') return postStatus ? json({ errors: { x: 'secret detail' } }, postStatus) : json({ key: 'WEB-9' }, 201)
      return json({}, 404)
    }) as typeof fetch
    return { calls, fetchImpl }
  }
  const req = { title: 'QA feat/x: sale viernes', body: 'Pasos\n1. abrir\n2. pagar\n\nEntorno: web' }

  it('a bug goes to jira or to the agent once', async () => {
    const path = web()
    seed(rec('qbug0001', path))
    const spy = typedSpy()

    // Jira: one issue with the title as summary and the rest as description; the key comes back.
    const ok = jira()
    expect(await qaBug('qbug0001', { to: 'jira', ...req }, { run: spy.run, creds, board, fetchImpl: ok.fetchImpl })).toEqual({ key: 'WEB-9' })
    const posts = ok.calls.filter((c) => c.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0]!.body!.fields.summary).toBe(req.title)
    expect(posts[0]!.body!.fields.description.content.map((p) => p.content[0]?.text)).toEqual(['Pasos', '1. abrir', '2. pagar', undefined, 'Entorno: web'])
    expect(spy.typed).toEqual([])

    // No Jira saved or no board: Jira is not even asked. Jira's own error comes back without what it said.
    const idle = jira()
    expect('error' in (await qaBug('qbug0001', { to: 'jira', ...req }, { run: spy.run, creds: null, board, fetchImpl: idle.fetchImpl }))).toBe(true)
    expect('error' in (await qaBug('qbug0001', { to: 'jira', ...req }, { run: spy.run, creds, board: null, fetchImpl: idle.fetchImpl }))).toBe(true)
    expect('error' in (await qaBug('nobody00', { to: 'jira', ...req }, { run: spy.run, creds, board, fetchImpl: idle.fetchImpl }))).toBe(true)
    expect('error' in (await qaBug('qbug0001', { to: 'jira', title: '  ', body: 'x' }, { run: spy.run, creds, board, fetchImpl: idle.fetchImpl }))).toBe(true)
    expect(idle.calls).toEqual([])
    const bad = jira(400)
    const failed = await qaBug('qbug0001', { to: 'jira', ...req }, { run: spy.run, creds, board, fetchImpl: bad.fetchImpl })
    expect(failed).toEqual({ error: 'Jira ha contestado algo que no esperaba.' })
    expect(JSON.stringify(failed)).not.toContain('secret detail')

    // Any other shape is refused.
    expect('error' in (await qaBug('qbug0001', { to: 'slack', ...req } as never, { run: spy.run, creds, board, fetchImpl: idle.fetchImpl }))).toBe(true)
    expect(spy.typed).toEqual([])
  })

  describe('to the agent', () => {
    let sock: string
    beforeEach(() => {
      sock = tmuxSock()
      process.env['ATRIL_TMUX_SOCKET'] = sock
      vi.resetModules()
    })
    afterEach(() => {
      killTmux(sock)
      delete process.env['ATRIL_TMUX_SOCKET']
    })
    const until = async (read: () => string, done: (s: string) => boolean, ms = 4000): Promise<string> => {
      const end = Date.now() + ms
      let v = read()
      while (!done(v) && Date.now() < end) {
        await new Promise((r) => setTimeout(r, 50))
        v = read()
      }
      return v
    }

    it('a bug reaches the agent pane as one bracketed paste', async () => {
      makeRegisteredRepo(home)
      const { openWorktree } = await import('./workspaces')
      const { run } = await import('./run')
      const { qaBug: bug } = await import('./qa-report')
      // The pane asks for bracketed paste, then shows what it gets with escapes made visible (no echo: one copy).
      const opened = await openWorktree({ repoId: 'demo', branch: 'feat/bug', agent: 'claude', argv: ['sh', '-c', 'stty -echo; printf "\\033[?2004h"; echo ready; cat -v'] })
      if (!('workspace' in opened)) throw new Error(opened.error)
      const ws: WorkspaceView = opened.workspace
      const capture = (): string => tmuxOut(sock, 'capture-pane', '-p', '-J', '-t', ws.paneId)
      await until(capture, (s) => s.includes('ready'))

      // A hostile body that tries to close the paste early: its escape is dropped, the paste is still one.
      const hostile = { title: 'QA feat/bug: falla', body: 'uno\ndos \x1b[201~ tres\x03 cuatro\x04\r' }
      expect(await bug(ws.id, { to: 'agent', ...hostile }, { run, creds: null, board: null })).toEqual({ ok: true })
      const out = await until(capture, (s) => s.includes('^[[201~'))
      expect(out).toContain('^[[200~QA feat/bug: falla')
      expect(out).toContain('uno')
      expect(out.match(/\^\[\[200~/g)).toHaveLength(1)
      expect(out.match(/\^\[\[201~/g)).toHaveLength(1)
      expect(out).toContain('dos [201~ tres cuatro')
      expect(out).not.toMatch(/\^C|\^D/)

      // A stopped workspace: nothing to paste into.
      tmuxOut(sock, 'kill-session', '-t', `=${ws.session}`)
      const gone = await bug(ws.id, { to: 'agent', ...hostile }, { run, creds: null, board: null })
      expect('error' in gone).toBe(true)
    })
  })
})

// A tmux that records what is typed, for the cases that never reach a real server.
function typedSpy(): { typed: string[][]; run: Runner } {
  const typed: string[][] = []
  return { typed, run: async (_cmd, args) => (args.includes('send-keys') && typed.push(args), { code: 0, stdout: '', stderr: '' }) }
}
