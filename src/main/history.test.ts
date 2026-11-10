import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
})
