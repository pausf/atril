import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { boxDiff, boxRanges } from './boxes'

afterEach(cleanTmp)

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
