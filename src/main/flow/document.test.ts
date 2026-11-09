import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { FlowStage } from '../../preload/api'
import { run } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { readDocs, saveDoc } from './document'
import { watchFlow, type FlowWatcher } from './watch'

let watcher: FlowWatcher | undefined
afterEach(() => {
  watcher?.close()
  watcher = undefined
  cleanTmp()
})

function workspace(): { path: string; dir: string; base: string } {
  const path = tmp()
  git(path, 'init', '-q')
  writeFileSync(join(path, 'a.txt'), 'x')
  git(path, 'add', '.')
  git(path, 'commit', '-q', '-m', 'init')
  const dir = join(path, '.agents', 'changes', 'add-x')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'proposal.md'), '# add-x\n\n## Verification criteria\n- a\n\n## Approach\nplan v1\n')
  writeFileSync(join(dir, 'spec-other.md'), '# other\n')
  return { path, dir, base: git(path, 'rev-parse', 'HEAD').trim() }
}

describe('flow documents', () => {
  it('an edit inside a stage still notifies', async () => {
    const { path, dir, base } = workspace()
    const seen: FlowStage[] = []
    watcher = await watchFlow({ path, baseCommit: base, run, onChange: (s) => seen.push(s) })
    // Same stage (plan) before and after: only the text moves.
    writeFileSync(join(dir, 'proposal.md'), '# add-x\n\n## Verification criteria\n- a\n\n## Approach\nplan v2\n')
    const t0 = Date.now()
    while (seen.length === 0 && Date.now() - t0 < 1000) await new Promise((r) => setTimeout(r, 25))
    expect(seen.at(-1)?.stage).toBe('plan')
  })

  it('save refuses unless it is safe', async () => {
    const { path, dir } = workspace()
    const docs = await readDocs(path)
    expect(docs?.change).toBe('add-x')
    expect(docs?.files.map((f) => f.name)).toEqual(['proposal.md', 'spec-other.md'])
    const proposal = docs!.files[0]!
    const before = readFileSync(join(dir, 'proposal.md'), 'utf8')

    // The agent is working: nothing is written.
    expect(await saveDoc(path, 'working', 'add-x', 'proposal.md', 'mine', proposal.mtimeMs)).toEqual({ error: 'Claude está escribiendo: no se ha guardado' })
    // Names outside the change folder, or not a Libretto document.
    const bad = { error: 'Ese archivo no se puede editar desde Atril' }
    for (const [change, name] of [
      ['add-x', '../proposal.md'],
      ['add-x', 'README.md'],
      ['add-x', '/etc/hosts.md'],
      ['add-x', 'spec-a/b.md'],
      ['../..', 'proposal.md'],
      ['nope', 'proposal.md']
    ] as const) {
      expect(await saveDoc(path, 'needs-you', change, name, 'mine', proposal.mtimeMs)).toEqual(bad)
    }
    // The agent wrote after the person read it.
    expect(await saveDoc(path, 'needs-you', 'add-x', 'proposal.md', 'mine', proposal.mtimeMs - 1000)).toEqual({
      error: 'Claude ha cambiado el archivo mientras editabas: copia tu texto y vuelve a abrirlo'
    })
    expect(readFileSync(join(dir, 'proposal.md'), 'utf8')).toBe(before)

    // Safe: replaced whole, no temp file left behind.
    const ok = await saveDoc(path, 'needs-you', 'add-x', 'proposal.md', 'mine', proposal.mtimeMs)
    expect(ok).toEqual({ mtimeMs: statSync(join(dir, 'proposal.md')).mtimeMs })
    expect(readFileSync(join(dir, 'proposal.md'), 'utf8')).toBe('mine')
    expect(readdirSync(dir).sort()).toEqual(['proposal.md', 'spec-other.md'])
    expect(await saveDoc(path, 'stopped', 'add-x', 'spec-other.md', 'other', docs!.files[1]!.mtimeMs)).toHaveProperty('mtimeMs')
    expect(existsSync(join(path, 'proposal.md'))).toBe(false)
  })
})
