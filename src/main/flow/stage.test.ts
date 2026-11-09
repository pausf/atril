import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { stageOf } from './stage'

afterEach(cleanTmp)

function repo(): { path: string; base: string } {
  const path = tmp()
  git(path, 'init', '-q')
  writeFileSync(join(path, 'a.txt'), 'x')
  git(path, 'add', '.')
  git(path, 'commit', '-q', '-m', 'init')
  return { path, base: git(path, 'rev-parse', 'HEAD').trim() }
}
function change(path: string, name: string, files: Record<string, string>, mtime?: number): void {
  const dir = join(path, '.agents', 'changes', name)
  mkdirSync(dir, { recursive: true })
  for (const [f, c] of Object.entries(files)) writeFileSync(join(dir, f), c)
  if (mtime) for (const f of Object.keys(files)) utimesSync(join(dir, f), mtime, mtime)
}

describe('stageOf', () => {
  it('proposal without criteria is entrada', async () => {
    const { path, base } = repo()
    change(path, 'c', { 'proposal.md': '# C\n\n## Vocabulary\n' })
    expect(await stageOf(path, base, run)).toMatchObject({ stage: 'entrada', change: 'c' })
  })

  it('criteria without approach is spec', async () => {
    const { path, base } = repo()
    change(path, 'c', { 'proposal.md': '# C\n\n## Verification criteria\n- X\n' })
    expect((await stageOf(path, base, run)).stage).toBe('spec')
  })

  it('approach without boxes is plan', async () => {
    const { path, base } = repo()
    change(path, 'c', { 'proposal.md': '## Verification criteria\n- X\n\n## Approach\nDo it\n\n## Checklist\n' })
    expect((await stageOf(path, base, run)).stage).toBe('plan')
  })

  it('open boxes is construir with counts', async () => {
    const { path, base } = repo()
    change(path, 'c', {
      'proposal.md': '## Verification criteria\n- X\n\n## Approach\nDo it\n\n## Checklist\n- [x] a\n- [ ] b\n- [ ] c\n'
    })
    expect(await stageOf(path, base, run)).toEqual({
      stage: 'construir',
      change: 'c',
      others: [],
      checklist: { file: 'proposal.md', total: 3, closed: 1, firstOpen: 'b' }
    })
  })

  it('all boxes closed is finished not landed', async () => {
    const { path, base } = repo()
    change(path, 'c', { 'proposal.md': '## Approach\n\n## Checklist\n- [x] a\n- [X] b\n' })
    expect(await stageOf(path, base, run)).toMatchObject({ stage: 'terminado', checklist: { total: 2, closed: 2 } })
  })

  it('no folder with commits ahead is landed', async () => {
    const { path, base } = repo()
    mkdirSync(join(path, '.agents', 'changes'), { recursive: true })
    writeFileSync(join(path, 'b.txt'), 'y')
    git(path, 'add', '.')
    git(path, 'commit', '-q', '-m', 'work')
    expect(await stageOf(path, base, run)).toEqual({ stage: 'aterrizado', others: [] })
  })

  it('no changes folder is sin libretto', async () => {
    const { path, base } = repo()
    expect(await stageOf(path, base, run)).toEqual({ stage: 'sin-libretto', others: [] })
  })

  it('fresh workspace with agents dir is entrada', async () => {
    const { path, base } = repo()
    mkdirSync(join(path, '.agents'))
    expect(await stageOf(path, base, run)).toEqual({ stage: 'entrada', others: [] })
  })

  it('several changes shows the latest and lists the rest', async () => {
    const { path, base } = repo()
    change(path, 'old', { 'proposal.md': '## Checklist\n- [ ] a\n' }, 1_700_000_000)
    change(path, 'mid', { 'proposal.md': '## Checklist\n- [ ] a\n' }, 1_700_000_100)
    change(path, 'new', { 'proposal.md': '# n\n' }, 1_700_000_200)
    expect(await stageOf(path, base, run)).toMatchObject({ stage: 'entrada', change: 'new', others: ['mid', 'old'] })
  })

  it('old layout without proposal takes its stage from the checklist', async () => {
    const { path, base } = repo()
    change(path, 'c', { 'tasks.md': '- [x] a\n- [ ] b\n' })
    expect(await stageOf(path, base, run)).toMatchObject({ stage: 'construir', checklist: { file: 'tasks.md' } })
  })
})
