import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run, type Runner } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { boxRanges, forgetPlans } from './boxes'
import { clock, closeQuiet, counts, openWatchers, version } from './quiet'

const realNow = clock.now
afterEach(() => {
  clock.now = realNow
  for (const p of openWatchers()) {
    closeQuiet(p)
    forgetPlans(p)
  }
  cleanTmp()
})

/** Counts every process the panel spawns. */
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

const CHANGE = 'c'
const PROPOSAL = ['# c', '', '## Checklist', '', '- [x] one', '- [ ] two', ''].join('\n')

function seed(path: string): void {
  git(path, 'init', '-q')
  writeFileSync(join(path, 'a.txt'), 'base\n')
  git(path, 'add', '.')
  git(path, 'commit', '-q', '-m', 'base')
}

/** In-place checkout: `.git` is a folder inside the work. */
function inPlace(): { path: string; base: string } {
  const path = tmp()
  seed(path)
  const base = git(path, 'rev-parse', 'HEAD').trim()
  mkdirSync(join(path, '.agents', 'changes', CHANGE), { recursive: true })
  writeFileSync(join(path, '.agents', 'changes', CHANGE, 'proposal.md'), PROPOSAL)
  return { path, base }
}

/** Linked worktree: its git dir is `<repo>/.git/worktrees/<name>`, its refs in the common dir. */
function linked(): { path: string; base: string } {
  const repo = tmp()
  seed(repo)
  const base = git(repo, 'rev-parse', 'HEAD').trim()
  const path = join(tmp(), 'wt')
  git(repo, 'worktree', 'add', '-q', '-b', 'work', path)
  mkdirSync(join(path, '.agents', 'changes', CHANGE), { recursive: true })
  writeFileSync(join(path, '.agents', 'changes', CHANGE, 'proposal.md'), PROPOSAL)
  return { path, base }
}

const commit = (path: string, msg: string): void => {
  git(path, 'add', '-A')
  git(path, 'commit', '-q', '-m', msg)
}

// FSEvents delivers in real time, a little later: wait for the version to rise, never read at once.
async function risen(path: string, from: number): Promise<void> {
  const until = Date.now() + 2000
  while ((version(path) ?? -1) <= from) {
    if (Date.now() > until) throw new Error(`version of ${path} stayed at ${from}`)
    await new Promise((r) => setTimeout(r, 20))
  }
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 300))

describe('the path filter', () => {
  const work = '/w'
  const dirs = ['/w/.git']
  const wt = ['/r/.git/worktrees/x', '/r/.git']
  it('counts work files and the refs of a git dir, nothing else', () => {
    expect(counts('/w/src/a.ts', dirs)).toBe(true)
    expect(counts('/w/dist/out.js', dirs)).toBe(true)
    expect(counts('/w/node_modules/x/i.js', dirs)).toBe(false)
    expect(counts('/w/pkg/node_modules/x/i.js', dirs)).toBe(false)
    expect(counts(`${work}/.git/HEAD`, dirs)).toBe(true)
    expect(counts('/w/.git/index', dirs)).toBe(true)
    expect(counts('/w/.git/packed-refs', dirs)).toBe(true)
    expect(counts('/w/.git/refs/heads/main', dirs)).toBe(true)
    expect(counts('/w/.git/logs/HEAD', dirs)).toBe(true)
    expect(counts('/w/.git/objects/ab/cdef', dirs)).toBe(false)
    expect(counts('/w/.git/index.lock', dirs)).toBe(false)
    expect(counts('/w/.git/FETCH_HEAD', dirs)).toBe(false)
    expect(counts('/w/.git', dirs)).toBe(false)
    // A worktree's own HEAD and index, and the branch refs in the common dir.
    expect(counts('/r/.git/worktrees/x/HEAD', wt)).toBe(true)
    expect(counts('/r/.git/worktrees/x/index', wt)).toBe(true)
    expect(counts('/r/.git/worktrees/x/logs/HEAD', wt)).toBe(true)
    expect(counts('/r/.git/refs/heads/work', wt)).toBe(true)
    expect(counts('/r/.git/objects/ab/cd', wt)).toBe(false)
    // Another worktree's files are inside the common dir but are none of its refs.
    expect(counts('/r/.git/worktrees/y/HEAD', wt)).toBe(false)
  })
})

describe('quiet panel', () => {
  for (const [kind, make] of [['in-place checkout', inPlace], ['linked worktree', linked]] as const) {
    it(`nothing changed costs no process (${kind})`, async () => {
      const w = make()
      const s = spy()
      const first = await boxRanges(w.path, w.base, CHANGE, s.run)
      const before = s.spawns()
      expect(before).toBeGreaterThan(0)
      // A first compute may rewrite git's index once (accepted in the Decision log): one more compute at most.
      await settle()
      await boxRanges(w.path, w.base, CHANGE, s.run)
      await settle()
      s.reset()
      const again = await boxRanges(w.path, w.base, CHANGE, s.run)
      expect(s.spawns()).toBe(0)
      expect(again).toEqual(first)
    }, 30_000)
  }

  it('an answer older than thirty seconds is computed again', async () => {
    const w = inPlace()
    let t = 1_000_000
    clock.now = () => t
    const s = spy()
    await boxRanges(w.path, w.base, CHANGE, s.run)
    await settle()
    await boxRanges(w.path, w.base, CHANGE, s.run)
    await settle()
    s.reset()
    t += 29_000
    await boxRanges(w.path, w.base, CHANGE, s.run)
    expect(s.spawns()).toBe(0)
    t += 2_000
    await boxRanges(w.path, w.base, CHANGE, s.run)
    expect(s.spawns()).toBeGreaterThan(0)
  }, 30_000)

  for (const [kind, make] of [['in-place checkout', inPlace], ['linked worktree', linked]] as const) {
    it(`an edit or a commit is seen on the next read (${kind})`, async () => {
      const w = make()
      const s = spy()
      await boxRanges(w.path, w.base, CHANGE, s.run)
      await settle()
      await boxRanges(w.path, w.base, CHANGE, s.run)

      let v = version(w.path)!
      writeFileSync(join(w.path, 'new.txt'), 'nuevo\n')
      await risen(w.path, v)
      const edited = await boxRanges(w.path, w.base, CHANGE, s.run)
      expect((edited.boxes[1]!.files ?? []).map((f) => f.path)).toContain('new.txt')

      v = version(w.path)!
      writeFileSync(join(w.path, '.agents', 'changes', CHANGE, 'proposal.md'), PROPOSAL.replace('- [ ] two', '- [x] two'))
      commit(w.path, 'two')
      await risen(w.path, v)
      const committed = await boxRanges(w.path, w.base, CHANGE, s.run)
      expect(committed.boxes[1]).toMatchObject({ state: 'closed', commit: git(w.path, 'rev-parse', '--short=7', 'HEAD').trim() })
    }, 30_000)
  }

  it('watchers are bounded and close with their work', async () => {
    const ws = [inPlace(), inPlace(), inPlace(), inPlace(), inPlace()]
    for (const w of ws.slice(0, 4)) await boxRanges(w.path, w.base, CHANGE, run)
    expect(openWatchers().sort()).toEqual(ws.slice(0, 4).map((w) => w.path).sort())
    // Asking the first again makes the second the least recently asked.
    await boxRanges(ws[0]!.path, ws[0]!.base, CHANGE, run)
    await boxRanges(ws[4]!.path, ws[4]!.base, CHANGE, run)
    expect(openWatchers().sort()).toEqual([ws[0], ws[2], ws[3], ws[4]].map((w) => w!.path).sort())

    // Closing drops the watcher and its saved answer: the next read computes again.
    const w = ws[3]!
    await settle()
    await boxRanges(w.path, w.base, CHANGE, run)
    closeQuiet(w.path)
    expect(openWatchers()).not.toContain(w.path)
    expect(version(w.path)).toBeUndefined()
    const s = spy()
    await boxRanges(w.path, w.base, CHANGE, s.run)
    expect(s.spawns()).toBeGreaterThan(0)
  }, 60_000)
})
