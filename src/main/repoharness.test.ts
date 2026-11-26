import { lstatSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HarnessItem } from '../preload/api'
import { detectHarness } from './repoharness'

// W284: the detector spawns nothing; any attempt throws.
vi.mock('node:child_process', () => {
  const boom = (): never => {
    throw new Error('the detector spawned a process')
  }
  return { spawn: boom, spawnSync: boom, exec: boom, execSync: boom, execFile: boom, execFileSync: boom, fork: boom }
})

const made: string[] = []
const tmp = (): string => {
  const d = realpathSync(mkdtempSync(join(tmpdir(), 'atril-harness-')))
  made.push(d)
  return d
}
const put = (root: string, rel: string, text = ''): string => {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return file
}
afterEach(() => {
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true })
})

const get = (items: HarnessItem[], id: string): HarnessItem => {
  const found = items.find((i) => i.id === id)
  if (!found) throw new Error(`no item ${id}`)
  return found
}
const pkg = (scripts: unknown): string => JSON.stringify({ name: 'shop-web', scripts })
const NPM_STUB = 'echo "Error: no test specified" && exit 1'

describe('detectHarness', () => {
  // W280
  it('context items read CLAUDE.md or AGENTS.md and the skills folder', async () => {
    const both = tmp()
    put(both, 'CLAUDE.md', 'a\nb\nc\n')
    put(both, 'AGENTS.md', 'x\n')
    expect(get(await detectHarness(both), 'memory')).toMatchObject({ ok: true, detail: 'CLAUDE.md', n: 3 })

    const agents = tmp()
    put(agents, 'AGENTS.md', 'one line, no newline')
    expect(get(await detectHarness(agents), 'memory')).toMatchObject({ ok: true, detail: 'AGENTS.md', n: 1 })

    const dir = tmp() // a folder named CLAUDE.md is not a memory file
    mkdirSync(join(dir, 'CLAUDE.md'))
    expect(get(await detectHarness(dir), 'memory').ok).toBe(false)

    const big = tmp()
    put(big, 'CLAUDE.md', 'x'.repeat(1024 * 1024 + 1))
    const item = get(await detectHarness(big), 'memory')
    expect(item).toMatchObject({ ok: true, detail: 'CLAUDE.md', big: true })
    expect(item.n).toBeUndefined()

    const skills = tmp()
    put(skills, '.claude/skills/one/SKILL.md', '---\nname: one\n---\n')
    put(skills, '.claude/skills/two/SKILL.md', '---\nname: two\n---\n')
    put(skills, '.claude/skills/empty/README.md', 'not a skill')
    put(skills, '.claude/skills/loose.md', 'not a skill')
    expect(get(await detectHarness(skills), 'skills')).toMatchObject({ ok: true, n: 2 })
    expect(get(await detectHarness(tmp()), 'skills').ok).toBe(false)

    // a skill that is a link to a folder inside the repo counts (W284)
    const linked = tmp()
    put(linked, 'shared/real/SKILL.md', '---\nname: real\n---\n')
    mkdirSync(join(linked, '.claude/skills'), { recursive: true })
    symlinkSync(join(linked, 'shared/real'), join(linked, '.claude/skills/real'))
    expect(get(await detectHarness(linked), 'skills')).toMatchObject({ ok: true, n: 1 })
  })

  // W281
  it('verification scripts come from package.json and composer.json', async () => {
    const js = tmp()
    put(js, 'package.json', pkg({ lint: 'eslint .', 'type-check': 'tsc --noEmit', test: 'vitest run' }))
    const a = await detectHarness(js)
    expect(get(a, 'lint')).toMatchObject({ ok: true, detail: 'lint' })
    expect(get(a, 'typecheck')).toMatchObject({ ok: true, detail: 'type-check' })
    expect(get(a, 'test')).toMatchObject({ ok: true, detail: 'test' })

    const tsc = tmp()
    put(tsc, 'package.json', pkg({ tsc: 'tsc' }))
    expect(get(await detectHarness(tsc), 'typecheck')).toMatchObject({ ok: true, detail: 'tsc' })

    const php = tmp()
    put(php, 'composer.json', JSON.stringify({ scripts: { lint: 'phpcs', test: 'phpunit' } }))
    const b = await detectHarness(php)
    expect(get(b, 'lint')).toMatchObject({ ok: true, detail: 'lint' })
    expect(get(b, 'test').ok).toBe(true)
    expect(get(b, 'typecheck').ok).toBe(false)

    const stub = tmp() // npm's own placeholder is not a test script
    put(stub, 'package.json', pkg({ test: NPM_STUB }))
    expect(get(await detectHarness(stub), 'test').ok).toBe(false)

    for (const text of ['{ not json', JSON.stringify({ scripts: 'lint' }), JSON.stringify({ scripts: ['lint'] }), 'null', '']) {
      const bad = tmp()
      put(bad, 'package.json', text)
      const items = await detectHarness(bad)
      expect(['lint', 'typecheck', 'test'].map((id) => get(items, id).ok)).toEqual([false, false, false])
    }

    const huge = tmp() // over 1 MB reads as gaps, never an error
    put(huge, 'package.json', pkg({ lint: 'x'.repeat(1024 * 1024) }))
    expect(get(await detectHarness(huge), 'lint').ok).toBe(false)
  })

  // W284
  it('never writes, never spawns and never follows a link out of the repo', async () => {
    const outside = tmp()
    put(outside, 'secret.md', 'outside\nthe\nrepo\n')
    put(outside, 'skills/evil/SKILL.md', '---\nname: evil\n---\n')
    put(outside, 'package.json', pkg({ lint: 'x' }))

    const repo = tmp()
    put(repo, 'AGENTS.md', 'inside\n')
    symlinkSync(join(outside, 'secret.md'), join(repo, 'CLAUDE.md'))
    mkdirSync(join(repo, '.claude'))
    symlinkSync(join(outside, 'skills'), join(repo, '.claude/skills'))
    symlinkSync(join(outside, 'package.json'), join(repo, 'package.json'))

    const snapshot = (root: string): string[] => {
      const out: string[] = []
      const walk = (dir: string): void => {
        for (const name of readdirSync(dir).sort()) {
          const p = join(dir, name)
          const s = lstatSync(p)
          out.push(`${p}|${s.mode}|${s.size}|${s.mtimeMs}`)
          if (s.isDirectory()) walk(p)
        }
      }
      walk(root)
      return out
    }
    const before = snapshot(repo)
    expect(before.length).toBeGreaterThan(3) // the walk really saw the tree
    const items = await detectHarness(repo)
    expect(snapshot(repo)).toEqual(before)

    // CLAUDE.md links out of the repo: absent, so AGENTS.md answers
    expect(get(items, 'memory')).toMatchObject({ ok: true, detail: 'AGENTS.md', n: 1 })
    expect(get(items, 'skills').ok).toBe(false)
    expect(get(items, 'lint').ok).toBe(false)

    // a folder of the path linked to another folder inside the repo is the thing it points to
    const inside = tmp()
    put(inside, 'real-claude/skills/one/SKILL.md', '---\nname: one\n---\n')
    symlinkSync(join(inside, 'real-claude'), join(inside, '.claude'))
    expect(get(await detectHarness(inside), 'skills')).toMatchObject({ ok: true, n: 1 })

    // the same folder linked out of the repo is absent
    const out2 = tmp()
    symlinkSync(join(outside, 'skills'), join(out2, '.claude'))
    expect(get(await detectHarness(out2), 'skills').ok).toBe(false)
  })
})
