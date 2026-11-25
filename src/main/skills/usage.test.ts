import { appendFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createUsage } from './usage'

const made: string[] = []
const saved = process.env['ATRIL_CLAUDE_DIR']
afterEach(() => {
  if (saved === undefined) delete process.env['ATRIL_CLAUDE_DIR']
  else process.env['ATRIL_CLAUDE_DIR'] = saved
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true })
})
function claude(): string {
  const d = realpathSync(mkdtempSync(join(tmpdir(), 'atril-usage-')))
  made.push(d)
  process.env['ATRIL_CLAUDE_DIR'] = d
  return d
}
const put = (file: string, lines: string[]): string => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, lines.join('\n') + '\n')
  return file
}

// Local noon today, so «k days ago» never crosses midnight.
const NOW = new Date()
NOW.setHours(12, 0, 0, 0)
const ago = (days: number, minutes = 0): string => new Date(NOW.getTime() - days * 86_400_000 - minutes * 60_000).toISOString()
const skillUse = (ts: string | undefined, ...names: string[]): string =>
  JSON.stringify({
    type: 'assistant',
    ...(ts ? { timestamp: ts } : {}),
    message: { content: [{ type: 'text', text: 'ok' }, ...names.map((n) => ({ type: 'tool_use', name: 'Skill', input: { skill: n } }))] }
  })
const typed = (ts: string, name: string, blocks = false): string => {
  const text = `<command-message>${name} is running…</command-message>\n<command-name>/${name}</command-name>`
  return JSON.stringify({ type: 'user', timestamp: ts, message: { role: 'user', content: blocks ? [{ type: 'text', text }] : text } })
}
const days = (pairs: [number, number][]): number[] => {
  const d = Array<number>(30).fill(0)
  for (const [k, n] of pairs) d[k] = n
  return d
}

describe('skills usage (K35, K36, K39)', () => {
  it("counts Skill tool uses and typed commands per day within 30 days", async () => {
    const root = claude()
    const p = join(root, 'projects', '-Users-x-shop-web')
    put(join(p, 'aaa.jsonl'), [
      skillUse(ago(0, 30), 'shop-review', 'shop-review'),
      skillUse(ago(3), 'acme:deploy'),
      skillUse(ago(0, 60), 'acme:deploy'),
      typed(ago(1), 'plan'),
      typed(ago(1, 5), 'libretto:write-spec', true),
      skillUse(ago(31), 'shop-review'),
      skillUse(undefined, 'shop-review'),
      '{"type":"assistant","name":"Skill" not json',
      JSON.stringify({ type: 'user', timestamp: ago(0), message: { content: 'plain words' } })
    ])
    put(join(p, 'aaa', 'subagents', 'agent-1.jsonl'), [skillUse(ago(2), 'shop-review')])
    const old = put(join(root, 'projects', '-Users-x-acme', 'old.jsonl'), [skillUse(ago(0), 'stale')])
    const longAgo = new Date(NOW.getTime() - 40 * 86_400_000)
    utimesSync(old, longAgo, longAgo)

    const r = await createUsage({ now: () => NOW }).read()
    expect(r).toEqual({
      usage: {
        'shop-review': { last: ago(0, 30), days: days([[0, 1], [2, 1]]) },
        'acme:deploy': { last: ago(0, 60), days: days([[0, 1], [3, 1]]) },
        plan: { last: ago(1), days: days([[1, 1]]) },
        'libretto:write-spec': { last: ago(1, 5), days: days([[1, 1]]) }
      }
    })
  })

  it("reuses an unchanged file and rereads a changed one", async () => {
    const root = claude()
    const p = join(root, 'projects', '-Users-x-shop-web')
    const fixed = new Date(Math.floor(NOW.getTime() / 1000) * 1000 - 3_600_000)
    const a = put(join(p, 'a.jsonl'), [skillUse(ago(0), 'alpha')])
    const b = put(join(p, 'b.jsonl'), [skillUse(ago(0), 'beta')])
    const c = put(join(p, 'c.jsonl'), [skillUse(ago(0), 'gamma')])
    for (const f of [a, b, c]) utimesSync(f, fixed, fixed)
    const u = createUsage({ now: () => NOW })
    const first = await u.read()
    expect(Object.keys('usage' in first ? first.usage : {}).sort()).toEqual(['alpha', 'beta', 'gamma'])

    // Same size and mtime: what was counted stays, though the text differs.
    put(a, [skillUse(ago(0), 'omega')])
    utimesSync(a, fixed, fixed)
    appendFileSync(b, skillUse(ago(1), 'beta') + '\n')
    unlinkSync(c)
    const second = await u.read()
    expect(second).toEqual({
      usage: {
        alpha: { last: ago(0), days: days([[0, 1]]) },
        beta: { last: ago(0), days: days([[0, 1], [1, 1]]) }
      }
    })
  })

  it("shares a running read and answers an error instead of rejecting", async () => {
    const root = claude()
    put(join(root, 'projects', '-x', 's.jsonl'), [skillUse(ago(0), 'alpha')])
    const u = createUsage({ now: () => NOW })
    const one = u.read()
    const two = u.read()
    expect(two).toBe(one)
    expect(await two).toEqual({ usage: { alpha: { last: ago(0), days: days([[0, 1]]) } } })

    const none = claude()
    expect(await createUsage({ now: () => NOW }).read()).toEqual({ usage: {} })
    writeFileSync(join(none, 'projects'), 'not a folder')
    const r = await createUsage({ now: () => NOW }).read()
    expect(r).toEqual({ error: expect.any(String) })
  })
})
