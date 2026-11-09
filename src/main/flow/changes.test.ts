import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run, type Runner } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { fileDiff, listChanges } from './changes'

afterEach(cleanTmp)

function repo(): { path: string; base: string } {
  const path = tmp()
  git(path, 'init', '-q')
  writeFileSync(join(path, 'a.txt'), 'uno\ndos\n')
  writeFileSync(join(path, 'gone.txt'), 'adiós\n')
  writeFileSync(join(path, 'old name.txt'), 'viaja\n')
  writeFileSync(join(path, '.gitignore'), '*.log\n')
  git(path, 'add', '.')
  git(path, 'commit', '-q', '-m', 'base')
  return { path, base: git(path, 'rev-parse', 'HEAD').trim() }
}

describe('file changes', () => {
  it('lists committed, uncommitted and untracked changes', async () => {
    const { path, base } = repo()
    writeFileSync(join(path, 'a.txt'), 'uno\nDOS\ntres\n')
    git(path, 'commit', '-q', '-am', 'committed change')
    git(path, 'rm', '-q', 'gone.txt')
    git(path, 'mv', 'old name.txt', 'new name.txt')
    writeFileSync(join(path, 'new.md'), 'a\nb\nc\n')
    writeFileSync(join(path, 'bin.dat'), Buffer.from([1, 0, 2, 3]))
    writeFileSync(join(path, 'x.log'), 'ignored\n')
    mkdirSync(join(path, '.agents', 'changes', 'c'), { recursive: true })
    writeFileSync(join(path, '.agents', 'changes', 'c', 'proposal.md'), 'p\n')

    expect(await listChanges(path, base, run)).toEqual([
      { path: 'a.txt', status: 'M', added: 2, removed: 1 },
      { path: 'bin.dat', status: 'A', added: 0, removed: 0 },
      { path: 'gone.txt', status: 'D', added: 0, removed: 1 },
      { path: 'new name.txt', status: 'A', added: 1, removed: 0 },
      { path: 'new.md', status: 'A', added: 3, removed: 0 },
      { path: 'old name.txt', status: 'D', added: 0, removed: 1 },
      // Libretto's documents last: Construir opens the first file, which should be code.
      { path: '.agents/changes/c/proposal.md', status: 'A', added: 1, removed: 0 }
    ])
  })

  it('diff only for a listed file', async () => {
    const { path, base } = repo()
    writeFileSync(join(path, 'a.txt'), 'uno\nDOS\n')
    writeFileSync(join(path, 'new.md'), 'hola\n')
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }
    for (const bad of ['../../etc/passwd', '/etc/hosts', 'gone.txt', '.git/config']) {
      expect(await fileDiff(path, base, bad, spy)).toBe('')
      expect(calls.some((c) => c.includes(bad))).toBe(false)
    }
    expect(await fileDiff(path, base, 'a.txt', run)).toContain('+DOS')
    expect(await fileDiff(path, base, 'new.md', run)).toContain('+hola')
  })

  it('a huge diff is cut at 1 MB', async () => {
    const { path, base } = repo()
    writeFileSync(join(path, 'dump.sql'), 'insert into t values (1);\n'.repeat(60_000))
    const diff = await fileDiff(path, base, 'dump.sql', run)
    expect(Buffer.byteLength(diff)).toBeLessThanOrEqual(1024 * 1024 + 40)
    expect(diff.endsWith('\nDiff recortado a 1 MB')).toBe(true)
    expect(diff.split('\n').at(-2)).toBe('+insert into t values (1);')
  })
})
