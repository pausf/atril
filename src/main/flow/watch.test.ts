import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { FlowStage } from '../../preload/api'
import { run } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { watchFlow, type FlowWatcher } from './watch'

let watcher: FlowWatcher | undefined
afterEach(() => {
  watcher?.close()
  watcher = undefined
  cleanTmp()
})

function repo(): { path: string; base: string } {
  const path = tmp()
  git(path, 'init', '-q')
  writeFileSync(join(path, 'a.txt'), 'x')
  git(path, 'add', '.')
  git(path, 'commit', '-q', '-m', 'init')
  return { path, base: git(path, 'rev-parse', 'HEAD').trim() }
}

const until = async (get: () => FlowStage | undefined, ms: number): Promise<number> => {
  const t0 = Date.now()
  while (!get() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 25))
  return Date.now() - t0
}

describe('watchFlow', () => {
  it('file change updates the stage', async () => {
    const { path, base } = repo()
    const dir = join(path, '.agents', 'changes', 'c')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'proposal.md'), '## Approach\n\n## Checklist\n- [ ] a\n')
    let got: FlowStage | undefined
    watcher = await watchFlow({ path, baseCommit: base, run, onChange: (s) => (got = s) })
    writeFileSync(join(dir, 'proposal.md'), '## Approach\n\n## Checklist\n- [x] a\n')
    const took = await until(() => got, 1500)
    expect(got?.stage).toBe('terminado')
    expect(took).toBeLessThan(1000)
  })

  it('agents dir appearing leaves sin libretto', async () => {
    const { path, base } = repo()
    let got: FlowStage | undefined
    watcher = await watchFlow({ path, baseCommit: base, run, onChange: (s) => (got = s) })
    const dir = join(path, '.agents', 'changes', 'c')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'proposal.md'), '# c\n')
    const took = await until(() => got, 1500)
    expect(got).toMatchObject({ stage: 'entrada', change: 'c' })
    expect(took).toBeLessThan(1000)
  })
})
