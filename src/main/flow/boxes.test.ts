import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run, type Runner } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { boxDiff, boxRanges, forgetPlans } from './boxes'

afterEach(cleanTmp)

/** Records every git command as its args after `-C <path>`. */
function spy(): { run: Runner; calls: string[][]; reset(): void } {
  const calls: string[][] = []
  return {
    calls,
    reset: () => void calls.splice(0),
    run: (cmd, args, opts) => {
      if (cmd === 'git') calls.push(args.slice(args.indexOf('-C') + 2))
      return run(cmd, args, opts)
    }
  }
}
const SHA = /^[0-9a-f]{40}$/
// A listing or diff over a committed range names two commits; the open range names one.
const twoRevs = (args: string[]): boolean => args.filter((a) => SHA.test(a)).length === 2

const CHANGE = 'c'
const proposal = (boxes: [boolean, string][]): string =>
  ['# c', '', '## Checklist', '', ...boxes.map(([done, text]) => `- [${done ? 'x' : ' '}] ${text}`), ''].join('\n')

function repo(): { path: string; base: string; put(file: string, text: string): void; commit(msg: string): string; plan(boxes: [boolean, string][]): void } {
  const path = tmp()
  git(path, 'init', '-q')
  writeFileSync(join(path, 'a.txt'), 'base\n')
  git(path, 'add', '.')
  git(path, 'commit', '-q', '-m', 'base')
  const put = (file: string, text: string): void => {
    mkdirSync(join(path, file, '..'), { recursive: true })
    writeFileSync(join(path, file), text)
  }
  return {
    path,
    base: git(path, 'rev-parse', 'HEAD').trim(),
    put,
    commit: (msg) => {
      git(path, 'add', '-A')
      git(path, 'commit', '-q', '-m', msg)
      return git(path, 'rev-parse', '--short=7', 'HEAD').trim()
    },
    plan: (boxes) => put(`.agents/changes/${CHANGE}/proposal.md`, proposal(boxes))
  }
}

describe('box ranges', () => {
  it('each box gets the code that closed it', async () => {
    const r = repo()
    r.put('src/plan.txt', 'planning\n')
    r.plan([[false, 'one'], [false, 'two'], [false, 'three'], [false, 'four'], [false, 'five']])
    r.commit('plan')
    r.put('src/one.txt', 'a\nb\n')
    r.plan([[true, 'one'], [false, 'two'], [false, 'three'], [false, 'four'], [false, 'five']])
    const first = r.commit('box one')
    // Two boxes in one commit share its range; the checklist is also reordered (matched by text, not position).
    r.put('src/two.txt', 'x\n')
    r.put('src/three.txt', 'y\nz\n')
    r.put('a.txt', 'base\nmore\n')
    r.plan([[true, 'one'], [true, 'three'], [true, 'two'], [false, 'four'], [false, 'five']])
    const second = r.commit('boxes two and three')
    // Not committed: code, a new untracked file, and a box ticked by hand (four) with no commit of its own.
    r.put('src/live.txt', 'l1\nl2\nl3\n')
    r.put('a.txt', 'base\nmore\nlive\n')
    r.plan([[true, 'one'], [true, 'three'], [true, 'two'], [true, 'four'], [false, 'five']])

    const { boxes, total } = await boxRanges(r.path, r.base, CHANGE, run)
    const files = (i: number): string[] => (boxes[i]!.files ?? []).map((f) => `${f.path} +${f.added} -${f.removed}`)
    expect(boxes.map((b) => [b.index, b.text, b.state])).toEqual([
      [0, 'one', 'closed'],
      [1, 'three', 'closed'],
      [2, 'two', 'closed'],
      [3, 'four', 'closed'],
      [4, 'five', 'current']
    ])
    // A closed box: from the previous closing commit (or the base) to its own, with its short id.
    // The planning commit ticks nothing, so its code rides with the first box.
    expect(files(0)).toEqual(['src/one.txt +2 -0', 'src/plan.txt +1 -0'])
    expect(boxes[0]!.commit).toBe(first)
    expect(files(1)).toEqual(['a.txt +1 -0', 'src/three.txt +2 -0', 'src/two.txt +1 -0'])
    expect(boxes[1]!.commit).toBe(second)
    expect(files(2)).toEqual(files(1))
    expect(boxes[2]!.commit).toBe(second)
    // Ticked but never committed: closed, with the current range and no commit.
    expect(boxes[3]!.commit).toBeUndefined()
    expect(files(3)).toEqual(['a.txt +1 -0', 'src/live.txt +3 -0'])
    // The current box: from the last closing commit to the working tree, uncommitted and untracked included.
    expect(files(4)).toEqual(files(3))
    expect(boxes[4]!.commit).toBeUndefined()
    // Never `.agents/`, in any range.
    for (const b of boxes) expect((b.files ?? []).some((f) => f.path.startsWith('.agents/'))).toBe(false)
    // The branch total adds every changed line, documents included.
    expect(total).toBe(20)

    // Pending boxes carry no files; a box whose text changes counts as new from that commit.
    r.plan([[true, 'one'], [true, 'three'], [true, 'two'], [true, 'four'], [false, 'five'], [false, 'six']])
    const again = (await boxRanges(r.path, r.base, CHANGE, run)).boxes
    expect(again[5]).toMatchObject({ index: 5, text: 'six', state: 'pending' })
    expect(again[5]!.files).toBeUndefined()
    r.plan([[true, 'ONE'], [true, 'three'], [true, 'two'], [true, 'four'], [false, 'five']])
    const renamed = (await boxRanges(r.path, r.base, CHANGE, run)).boxes
    expect(renamed[0]).toMatchObject({ text: 'ONE', state: 'closed' })
    expect(renamed[0]!.commit).toBeUndefined()
  }, 60_000)

  it('no change folder or no checklist gives no boxes', async () => {
    const r = repo()
    r.put('src/x.txt', 'x\n')
    expect((await boxRanges(r.path, r.base, undefined, run)).boxes).toEqual([])
    expect((await boxRanges(r.path, r.base, 'missing', run)).boxes).toEqual([])
    r.put(`.agents/changes/${CHANGE}/proposal.md`, '# c\n\n## Checklist\n\nnothing to tick\n')
    expect(await boxRanges(r.path, r.base, CHANGE, run)).toEqual({ boxes: [], total: 6 })
  })
})

describe('box diffs', () => {
  it("a box's file diff covers only its range", async () => {
    const r = repo()
    r.plan([[false, 'one'], [false, 'two']])
    r.commit('plan')
    r.put('src/one.txt', 'uno\n')
    r.put('a.txt', 'base\nfrom one\n')
    r.plan([[true, 'one'], [false, 'two']])
    r.commit('box one')
    r.put('a.txt', 'base\nfrom one\nfrom live\n')
    r.put('src/new.txt', 'nuevo\n')

    const closed = await boxDiff(r.path, r.base, CHANGE, 0, 'a.txt', run)
    expect(closed).toContain('+from one')
    expect(closed).not.toContain('from live')
    const live = await boxDiff(r.path, r.base, CHANGE, 1, 'a.txt', run)
    expect(live).toContain('+from live')
    expect(live).not.toContain('+from one')
    expect(await boxDiff(r.path, r.base, CHANGE, 1, 'src/new.txt', run)).toContain('+nuevo')
    // Outside the range, outside the list, `.agents/`, a pending index or a missing box: empty.
    expect(await boxDiff(r.path, r.base, CHANGE, 0, 'src/new.txt', run)).toBe('')
    expect(await boxDiff(r.path, r.base, CHANGE, 0, `.agents/changes/${CHANGE}/proposal.md`, run)).toBe('')
    expect(await boxDiff(r.path, r.base, CHANGE, 0, '../../etc/passwd', run)).toBe('')
    expect(await boxDiff(r.path, r.base, CHANGE, 9, 'a.txt', run)).toBe('')
    expect(await boxDiff(r.path, r.base, undefined, 0, 'a.txt', run)).toBe('')
  }, 60_000)

  it('a box diff is cut at 1 MB and names are literal', async () => {
    const r = repo()
    r.plan([[false, 'one'], [false, 'two']])
    r.commit('plan')
    r.put('dump.sql', 'insert into t values (1);\n'.repeat(60_000))
    r.put('a*.txt', 'estrella\n')
    r.put('ab.txt', 'otro\n')
    r.plan([[true, 'one'], [false, 'two']])
    r.commit('box one')
    const big = await boxDiff(r.path, r.base, CHANGE, 0, 'dump.sql', run)
    expect(Buffer.byteLength(big)).toBeLessThanOrEqual(1024 * 1024 + 40)
    expect(big.endsWith('\nDiff recortado a 1 MB')).toBe(true)
    const star = await boxDiff(r.path, r.base, CHANGE, 0, 'a*.txt', run)
    expect(star).toContain('+estrella')
    expect(star).not.toContain('otro')
  }, 60_000)
})

describe('box plan cache', () => {
  // Two committed boxes and an open one with live code.
  function built(): { r: ReturnType<typeof repo>; first: string } {
    const r = repo()
    r.plan([[false, 'one'], [false, 'two'], [false, 'three']])
    r.commit('plan')
    r.put('src/one.txt', 'uno\n')
    r.plan([[true, 'one'], [false, 'two'], [false, 'three']])
    const first = r.commit('box one')
    r.put('src/two.txt', 'dos\n')
    r.plan([[true, 'one'], [true, 'two'], [false, 'three']])
    r.commit('box two')
    r.put('src/live.txt', 'vivo\n')
    return { r, first }
  }

  it("a closed box's diff costs two git commands once planned", async () => {
    const { r } = built()
    const s = spy()
    await boxRanges(r.path, r.base, CHANGE, s.run)
    s.reset()
    const diff = await boxDiff(r.path, r.base, CHANGE, 0, 'src/one.txt', s.run)
    expect(diff).toContain('+uno')
    expect(s.calls.map((c) => c[0])).toEqual(['rev-parse', 'diff'])
    // A file outside the closed range is still empty, and costs no diff.
    s.reset()
    expect(await boxDiff(r.path, r.base, CHANGE, 0, 'src/two.txt', s.run)).toBe('')
    expect(s.calls.map((c) => c[0])).toEqual(['rev-parse'])
    forgetPlans(r.path)
  }, 60_000)

  it('a second read with nothing new reuses the closed ranges', async () => {
    const { r } = built()
    const s = spy()
    const before = await boxRanges(r.path, r.base, CHANGE, s.run)
    s.reset()
    const after = await boxRanges(r.path, r.base, CHANGE, s.run)
    expect(after).toEqual(before)
    const subs = s.calls.map((c) => c[0])
    expect(subs).not.toContain('log')
    expect(subs).not.toContain('show')
    expect(s.calls.filter(twoRevs)).toEqual([])
    // HEAD, the whole branch (numstat, name-status, untracked) and the open range (the same three).
    expect(subs.sort()).toEqual(['diff', 'diff', 'diff', 'diff', 'ls-files', 'ls-files', 'rev-parse'])
    forgetPlans(r.path)
  }, 60_000)

  it('an uncommitted edit shows on the next read', async () => {
    const { r } = built()
    await boxRanges(r.path, r.base, CHANGE, run)
    r.put('src/later.txt', 'tarde\n')
    r.put('src/one.txt', 'uno\notro\n')
    const { boxes } = await boxRanges(r.path, r.base, CHANGE, run)
    expect((boxes[2]!.files ?? []).map((f) => f.path)).toEqual(['src/later.txt', 'src/live.txt', 'src/one.txt'])
    // The closed box keeps its own commit's code.
    expect((boxes[0]!.files ?? []).map((f) => `${f.path} +${f.added}`)).toEqual(['src/one.txt +1'])
    expect(await boxDiff(r.path, r.base, CHANGE, 2, 'src/later.txt', run)).toContain('+tarde')
    forgetPlans(r.path)
  }, 60_000)

  it('a new commit or checklist edit plans again', async () => {
    const { r } = built()
    const s = spy()
    const logs = (): number => s.calls.filter((c) => c[0] === 'log').length
    await boxRanges(r.path, r.base, CHANGE, s.run)
    expect(logs()).toBe(1)

    // A commit moves HEAD: the box it ticks is closed, with its commit.
    r.plan([[true, 'one'], [true, 'two'], [true, 'three']])
    const third = r.commit('box three')
    s.reset()
    const committed = await boxRanges(r.path, r.base, CHANGE, s.run)
    expect(logs()).toBe(1)
    expect(committed.boxes[2]).toMatchObject({ state: 'closed', commit: third })

    // An edit of the checklist alone (same HEAD, a new size) plans again.
    r.plan([[true, 'one'], [true, 'two'], [true, 'three'], [false, 'four']])
    s.reset()
    const edited = await boxRanges(r.path, r.base, CHANGE, s.run)
    expect(logs()).toBe(1)
    expect(edited.boxes[3]).toMatchObject({ text: 'four', state: 'current' })

    // boxDiff plans again too after a change of key.
    r.put('src/four.txt', 'cuatro\n')
    r.plan([[true, 'one'], [true, 'two'], [true, 'three'], [true, 'four']])
    r.commit('box four')
    s.reset()
    expect(await boxDiff(r.path, r.base, CHANGE, 3, 'src/four.txt', s.run)).toContain('+cuatro')
    expect(logs()).toBe(1)

    // Same key but a different base commit plans again.
    s.reset()
    await boxRanges(r.path, git(r.path, 'rev-parse', 'HEAD~4').trim(), CHANGE, s.run)
    expect(logs()).toBe(1)

    // Forgetting the workspace drops its plans.
    await boxRanges(r.path, r.base, CHANGE, s.run)
    s.reset()
    await boxRanges(r.path, r.base, CHANGE, s.run)
    expect(logs()).toBe(0)
    forgetPlans(r.path)
    await boxRanges(r.path, r.base, CHANGE, s.run)
    expect(logs()).toBe(1)
    forgetPlans(r.path)
  }, 60_000)
})
