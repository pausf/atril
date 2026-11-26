import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { run, type Runner } from './run'
import { cleanTmp, git, tmp, workThatMergedMain } from './test-helpers'
import { clock, closeQuiet, openWatchers } from './flow/quiet'
import { createClashWatch, radar } from './radar'
import type { RadarHit } from '../preload/api'

let home: string
const realNow = clock.now
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  clock.now = realNow
  for (const p of openWatchers()) closeQuiet(p)
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

function spy(): { run: Runner; spawns: () => number; reset(): void } {
  let n = 0
  return {
    spawns: () => n,
    reset: () => void (n = 0),
    run: (cmd, args, opts) => {
      n++
      return run(cmd, args, opts)
    }
  }
}

const put = (dir: string, file: string, text: string): void => {
  mkdirSync(dirname(join(dir, file)), { recursive: true })
  writeFileSync(join(dir, file), text)
}

function repo(): { root: string; base: string } {
  const root = tmp()
  git(root, 'init', '-q')
  put(root, 'src/cart.ts', 'base\n')
  put(root, 'src/other.ts', 'base\n')
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'base')
  return { root, base: git(root, 'rev-parse', 'HEAD').trim() }
}

const worktree = (root: string, branch: string): string => {
  const path = join(tmp(), 'wt')
  git(root, 'worktree', 'add', '-q', '-b', branch, path)
  return path
}

const rec = (id: string, repoId: string, branch: string, path: string, baseCommit: string, mode = 'worktree') => ({
  id,
  repoId,
  branch,
  mode,
  path,
  baseCommit,
  agent: 'claude',
  session: `atril-${id}`,
  paneId: '%1'
})

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 300))

/** shop: a commits src/cart.ts, b edits it and src/other.ts uncommitted, c adds c.ts; a review edits src/cart.ts; ops edits src/cart.ts. */
function three(): void {
  const shop = repo()
  const a = worktree(shop.root, 'feat/a')
  put(a, 'src/cart.ts', 'a\n')
  git(a, 'add', '-A')
  git(a, 'commit', '-q', '-m', 'a')
  // listChanges puts Libretto's documents last; the radar sorts plainly.
  put(a, '.agents/notes.md', 'a\n')
  const b = worktree(shop.root, 'feat/b')
  put(b, 'src/cart.ts', 'b\n')
  put(b, 'src/other.ts', 'b\n')
  put(b, '.agents/notes.md', 'b\n')
  const c = worktree(shop.root, 'feat/c')
  put(c, 'c.ts', 'c\n')
  put(shop.root, 'src/cart.ts', 'review\n')
  const ops = repo()
  const o = worktree(ops.root, 'feat/o')
  put(o, 'src/cart.ts', 'o\n')
  writeFileSync(
    join(home, 'workspaces.json'),
    JSON.stringify({
      workspaces: [
        rec('aaaa0001', 'shop', 'feat/a', a, shop.base),
        rec('aaaa0002', 'shop', 'feat/b', b, shop.base),
        rec('aaaa0003', 'shop', 'feat/c', c, shop.base),
        rec('aaaar001', 'shop', 'main', shop.root, shop.base, 'review'),
        rec('oooo0001', 'ops', 'feat/o', o, ops.base)
      ]
    })
  )
}

describe('the radar', () => {
  it('two works on one file collide and nothing else does', async () => {
    three()
    const hits = await radar(run)
    expect(hits).toEqual({
      aaaa0001: [{ id: 'aaaa0002', branch: 'feat/b', files: ['.agents/notes.md', 'src/cart.ts'] }],
      aaaa0002: [{ id: 'aaaa0001', branch: 'feat/a', files: ['.agents/notes.md', 'src/cart.ts'] }],
      aaaa0003: [],
      oooo0001: []
    })
  }, 90_000)

  it("a work that merged origin's default branch clashes only on its own files", async () => {
    const w = workThatMergedMain(3, 2)
    // b starts from the newer main and edits main.txt, which w only has through the merge, and own.txt, which w wrote.
    const b = join(tmp(), 'wt')
    git(w.root, 'worktree', 'add', '-q', '--no-track', '-b', 'feat/b', b, 'origin/main')
    put(b, 'main.txt', 'changed\n')
    put(b, 'own.txt', 'b\n')
    writeFileSync(
      join(home, 'workspaces.json'),
      JSON.stringify({ workspaces: [{ ...rec('w1', 'shop', 'feat/w', w.path, w.base), baseRef: 'origin/main' }, { ...rec('b1', 'shop', 'feat/b', b, w.main), baseRef: 'origin/main' }] })
    )
    const hits = await radar(run)
    expect(hits['w1']?.map((h) => [h.id, h.files])).toEqual([['b1', ['own.txt']]])
    expect(hits['b1']?.map((h) => [h.id, h.files])).toEqual([['w1', ['own.txt']]])
  }, 30_000)

  it('a merged work is out of the clash check', async () => {
    three()
    const file = join(home, 'workspaces.json')
    const all = JSON.parse(readFileSync(file, 'utf8')) as { workspaces: Array<Record<string, unknown>> }
    // a and b share src/cart.ts; once a is merged neither side sees it.
    all.workspaces[0]!['merged'] = true
    writeFileSync(file, JSON.stringify(all))
    const hits = await radar(run)
    expect(hits['aaaa0001']).toBeUndefined()
    expect(hits['aaaa0002']?.map((h) => h.id)).toEqual([])
  })

  it('the radar costs nothing while nothing changes', async () => {
    three()
    let t = 1_000_000
    clock.now = () => t
    const s = spy()
    const first = await radar(s.run)
    expect(s.spawns()).toBeGreaterThan(0)
    // git's own index rewrite after a first compute may cost one compute more.
    await settle()
    await radar(s.run)
    await settle()
    s.reset()
    t += 29_000
    expect(await radar(s.run)).toEqual(first)
    expect(s.spawns()).toBe(0)
    t += 2_000
    await radar(s.run)
    expect(s.spawns()).toBeGreaterThan(0)
  }, 90_000)

  it('a new shared file is one notice per pair', () => {
    const watch = createClashWatch()
    const hit = (id: string, branch: string, files: string[]): RadarHit => ({ id, branch, files })
    // The first answer only sets the baseline.
    expect(watch({ a: [hit('b', 'feat/b', ['x.ts'])], b: [hit('a', 'feat/a', ['x.ts'])], c: [] })).toEqual([])
    // A new file between a and b; a new pair a–c with two files.
    expect(
      watch({
        a: [hit('b', 'feat/b', ['x.ts', 'y.ts']), hit('c', 'feat/c', ['m.ts', 'k.ts'])],
        b: [hit('a', 'feat/a', ['x.ts', 'y.ts'])],
        c: [hit('a', 'feat/a', ['k.ts', 'm.ts'])]
      })
    ).toEqual([
      { a: 'a', b: 'b', file: 'y.ts', more: 0 },
      { a: 'a', b: 'c', file: 'k.ts', more: 1 }
    ])
    // Still shared: never again; gone and back: new again.
    expect(watch({ a: [hit('b', 'feat/b', ['x.ts', 'y.ts'])], b: [hit('a', 'feat/a', ['x.ts', 'y.ts'])], c: [] })).toEqual([])
    expect(watch({ a: [hit('c', 'feat/c', ['k.ts'])], c: [hit('a', 'feat/a', ['k.ts'])], b: [] })).toEqual([{ a: 'a', b: 'c', file: 'k.ts', more: 0 }])
  })
})
