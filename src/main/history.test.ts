import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { WorkspaceRecord } from '../preload/api'
import { historyEntry, stepTimes } from './history'
import { run } from './run'
import { cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { openWorktree, readRecords, removeWorkspace, writeRecords } from './workspaces'

const SLEEP = ['sh', '-c', 'sleep 300']
let sock: string
let home: string

beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
  makeRegisteredRepo(home)
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const lines = (): Record<string, unknown>[] =>
  readFileSync(join(home, 'history.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>)

async function open(branch: string, review = false): Promise<{ id: string; path: string; session: string }> {
  const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', jiraKey: 'SHOP-7', argv: SLEEP, ...(review && { review }) })
  if (!('workspace' in r)) throw new Error(r.error)
  return r.workspace
}

describe('history', () => {
  it('a removed workspace leaves one history line', async () => {
    const before = Math.floor(Date.now() / 1000)
    const ws = await open('feat/done')
    const rec = (await readRecords()).find((r) => r.id === ws.id)
    expect(rec?.createdAt).toBeGreaterThanOrEqual(before)
    expect(rec?.createdAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))

    // A Libretto change mid-build, committed so the removal's status check passes.
    const change = join(ws.path, '.agents', 'changes', 'add-thing')
    mkdirSync(change, { recursive: true })
    writeFileSync(join(change, 'proposal.md'), '# add-thing\n\n## Verification criteria\n\n## Checklist\n\n- [x] one\n- [ ] two\n')
    git(ws.path, 'add', '.')
    git(ws.path, 'commit', '-q', '-m', 'wip')

    // W93: its transcript's usage is the total recorded; its content never is.
    const transcript = join(home, 'claude', 's.jsonl')
    mkdirSync(join(home, 'claude'), { recursive: true })
    writeFileSync(
      transcript,
      JSON.stringify({ message: { id: 'm1', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: 'SECRET' }], usage: { input_tokens: 1000, output_tokens: 500 } } }) + '\n'
    )
    mkdirSync(join(home, 'transcripts'), { recursive: true })
    writeFileSync(join(home, 'transcripts', ws.session), `${transcript}\n`)

    // A failed removal (uncommitted changes) appends nothing.
    writeFileSync(join(ws.path, 'dirty.txt'), 'x')
    expect(await removeWorkspace(ws.id)).toHaveProperty('error')
    expect(() => readFileSync(join(home, 'history.jsonl'))).toThrow()
    rmSync(join(ws.path, 'dirty.txt'))

    expect(await removeWorkspace(ws.id)).toEqual({ ok: true })
    const after = Math.floor(Date.now() / 1000)
    const [line, ...rest] = lines()
    expect(rest).toEqual([])
    expect(line).toMatchObject({ branch: 'feat/done', repoId: 'demo', jiraKey: 'SHOP-7', mode: 'worktree', change: 'add-thing', stage: 'construir', createdAt: rec?.createdAt })
    expect(line?.['closedAt']).toBeGreaterThanOrEqual(rec?.createdAt ?? 0)
    expect(line?.['closedAt']).toBeLessThanOrEqual(after)
    expect(line?.['cost']).toMatchObject({ tokens: 1500 })
    expect(readFileSync(join(home, 'history.jsonl'), 'utf8')).not.toContain('SECRET')
    expect(readFileSync(join(home, 'history.jsonl'), 'utf8')).not.toContain(ws.path)

    // An old record without createdAt, and the 200 cap: the oldest line goes, trimmed after appending.
    const seed = Array.from({ length: 199 }, (_, i) => JSON.stringify({ branch: `old/${i}`, repoId: 'demo', mode: 'worktree', stage: 'aterrizado', closedAt: i, cost: null }))
    writeFileSync(join(home, 'history.jsonl'), [JSON.stringify(line), ...seed].join('\n') + '\n')
    const old = await open('feat/old')
    await writeRecords((await readRecords()).map((r) => (r.id === old.id ? { ...r, createdAt: undefined } : r)))
    expect(await removeWorkspace(old.id)).toEqual({ ok: true })
    let all = lines()
    expect(all).toHaveLength(200)
    expect(all[0]).toMatchObject({ branch: 'old/0' })
    expect(all[199]).toMatchObject({ branch: 'feat/old', stage: 'sin-libretto', cost: null })
    expect(all[199]).not.toHaveProperty('createdAt')

    // One write at a time: two removals at once both keep their line.
    const [a, b] = [await open('feat/a'), await open('feat/b')]
    expect(await Promise.all([removeWorkspace(a.id), removeWorkspace(b.id)])).toEqual([{ ok: true }, { ok: true }])
    all = lines()
    expect(all).toHaveLength(200)
    expect(all.slice(-2).map((l) => l['branch']).sort()).toEqual(['feat/a', 'feat/b'])

    // A review session appends nothing.
    const review = await open('main', true)
    expect(await removeWorkspace(review.id)).toEqual({ ok: true })
    expect(lines()).toEqual(all)

    // A history that cannot be written does not stop the removal.
    rmSync(join(home, 'history.jsonl'))
    mkdirSync(join(home, 'history.jsonl'))
    const c = await open('feat/c')
    expect(await removeWorkspace(c.id)).toEqual({ ok: true })
    expect((await readRecords()).map((r) => r.id)).not.toContain(c.id)
  }, 30_000)

  const T = 1_700_000_000
  // Commits with a fixed date, so each step's length is known.
  const commitAt = (cwd: string, at: number, msg: string): void => {
    const date = `@${at} +0000`
    execFileSync('git', ['add', '-A'], { cwd })
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', msg], {
      cwd,
      env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
    })
  }
  const repo = (): { path: string; base: string } => {
    const path = tmp()
    git(path, 'init', '-q')
    writeFileSync(join(path, 'a.txt'), 'x')
    commitAt(path, T - 1000, 'base')
    return { path, base: git(path, 'rev-parse', 'HEAD').trim() }
  }
  const writeProposal = (path: string, change: string, body: string): void => {
    mkdirSync(join(path, '.agents', 'changes', change), { recursive: true })
    writeFileSync(join(path, '.agents', 'changes', change, 'proposal.md'), `# ${change}\n\n## The ask\n\nx\n${body}`)
  }
  const CRIT = '\n## Verification criteria\n\n- **W1** x\n'
  const boxes = (...closed: boolean[]): string => `\n## Checklist\n\n${closed.map((c, i) => `- [${c ? 'x' : ' '}] box ${i}\n`).join('')}`
  const record = (path: string, base: string, more: Partial<WorkspaceRecord> = {}): WorkspaceRecord => ({
    id: 'w1',
    repoId: 'demo',
    branch: 'feat/x',
    mode: 'worktree',
    path,
    baseCommit: base,
    agent: 'claude',
    session: 'atril-none',
    paneId: '%0',
    createdAt: T,
    ...more
  })

  it('a closed work records the time of each step', async () => {
    const { path, base } = repo()
    // Spec written at +400 (an earlier draft had no criteria yet).
    writeProposal(path, 'add-thing', '')
    commitAt(path, T + 100, 'draft')
    writeProposal(path, 'add-thing', CRIT)
    commitAt(path, T + 400, 'spec')
    writeProposal(path, 'add-thing', CRIT + boxes(false, false))
    commitAt(path, T + 1000, 'checklist')
    // A commit that does not touch the document does not count.
    writeFileSync(join(path, 'b.txt'), 'y')
    commitAt(path, T + 1500, 'code')
    writeProposal(path, 'add-thing', CRIT + boxes(true, false))
    commitAt(path, T + 2000, 'box 0')
    writeProposal(path, 'add-thing', CRIT + boxes(true, true))
    commitAt(path, T + 3000, 'box 1')
    // Editing the document afterwards without closing a box moves nothing.
    writeProposal(path, 'add-thing', CRIT + boxes(true, true) + '\nnote\n')
    commitAt(path, T + 3500, 'note')

    const before = Math.floor(Date.now() / 1000)
    const entry = await historyEntry(record(path, base), run)
    const after = Math.floor(Date.now() / 1000)
    expect(entry.change).toBe('add-thing')
    expect(entry.steps).toMatchObject({ spec: 400, plan: 600, construir: 2000 })
    expect(entry.steps?.cierre).toBeGreaterThanOrEqual(before - (T + 3000))
    expect(entry.steps?.cierre).toBeLessThanOrEqual(after - (T + 3000))

    // Closing is the moment given; a box re-opened and closed again moves the last mark.
    writeProposal(path, 'add-thing', CRIT + boxes(true, false))
    commitAt(path, T + 3600, 'reopen')
    writeProposal(path, 'add-thing', CRIT + boxes(true, true))
    commitAt(path, T + 3700, 'close again')
    expect(await stepTimes(record(path, base), 'add-thing', T + 5000, run)).toEqual({ spec: 400, plan: 600, construir: 2700, cierre: 1300 })

    // A work without a Libretto change has no steps.
    const plain = repo()
    expect(await historyEntry(record(plain.path, plain.base), run)).not.toHaveProperty('steps')
  }, 30_000)

  it('missing marks leave their steps out', async () => {
    // No createdAt and no checklist yet: only the time from the spec to closing.
    const a = repo()
    writeProposal(a.path, 'c', CRIT)
    commitAt(a.path, T + 400, 'spec')
    expect(await stepTimes(record(a.path, a.base, { createdAt: undefined }), 'c', T + 1000, run)).toEqual({ cierre: 600 })

    // Spec and checklist in one commit: a plan of 0 is kept; no box closed, no «construir».
    const b = repo()
    writeProposal(b.path, 'c', CRIT + boxes(false))
    commitAt(b.path, T + 400, 'all at once')
    expect(await stepTimes(record(b.path, b.base), 'c', T + 1000, run)).toEqual({ spec: 400, plan: 0, cierre: 600 })

    // A commit dated before the work was opened (a rebase): that step is left out, never negative.
    const c = repo()
    writeProposal(c.path, 'c', CRIT)
    commitAt(c.path, T - 50, 'spec')
    writeProposal(c.path, 'c', CRIT + boxes(true))
    commitAt(c.path, T + 100, 'built')
    expect(await stepTimes(record(c.path, c.base), 'c', T + 1000, run)).toEqual({ plan: 150, construir: 0, cierre: 900 })

    // A landed change (the document removed) skips that commit; commits before the base never count.
    const d = repo()
    writeProposal(d.path, 'c', CRIT + boxes(false))
    commitAt(d.path, T + 100, 'before the work')
    const base = git(d.path, 'rev-parse', 'HEAD').trim()
    writeProposal(d.path, 'c', CRIT + boxes(true))
    commitAt(d.path, T + 300, 'built')
    rmSync(join(d.path, '.agents'), { recursive: true })
    commitAt(d.path, T + 800, 'land')
    expect(await stepTimes(record(d.path, base), 'c', T + 1000, run)).toEqual({ spec: 300, plan: 0, construir: 0, cierre: 700 })

    // No commit to the document at all: no steps, and the line has none.
    const e = repo()
    writeProposal(e.path, 'c', CRIT)
    expect(await stepTimes(record(e.path, e.base), 'c', T + 1000, run)).toEqual({})
    expect(await historyEntry(record(e.path, e.base), run)).not.toHaveProperty('steps')
  }, 30_000)
})
