import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { UsageResult } from '../preload/api'
import type { Runner } from './run'
import { createQuotaWatch, createUsage, readUsage } from './usage'

// Shape of the real /api/oauth/usage answer, as the statusline reads it.
const FIXTURE = {
  five_hour: { utilization: 34.2, resets_at: '2026-11-09T14:00:00.123456+00:00' },
  seven_day: { utilization: 72, resets_at: '2026-11-12T09:00:00+00:00' },
  extra_usage: { is_enabled: false }
}
const TOKEN = 'sk-ant-oat01-FAKE-TOKEN-0123456789'

const keychain = (token = TOKEN): Runner =>
  vi.fn(async () => ({ code: 0, stdout: JSON.stringify({ claudeAiOauth: { accessToken: token } }), stderr: '' }))
const answer = (status: number, body: unknown = FIXTURE) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }))

describe('usage', () => {
  it('parses claude five hour and seven day', async () => {
    const fetch = answer(200)
    const u = await readUsage(keychain(), fetch)
    expect(u).toEqual({
      fiveHour: { pct: 34, resetsAt: '2026-11-09T14:00:00.123456+00:00' },
      sevenDay: { pct: 72, resetsAt: '2026-11-12T09:00:00+00:00' }
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]
    expect(url).toBe('https://api.anthropic.com/api/oauth/usage')
    expect(init.headers['anthropic-beta']).toBe('oauth-2025-04-20')
  })

  it('token never leaves the main process', async () => {
    const home = mkdtempSync(join(tmpdir(), 'atril-usage-'))
    process.env['ATRIL_HOME'] = home
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m))
    const run = keychain()
    const fetch = answer(200)
    const emitted: unknown[] = []
    const usage = createUsage({ run, fetch, emit: (u) => emitted.push(u) })

    const returned = [await readUsage(run, fetch), await usage.get(), usage.last()]
    // The failure paths return reasons too: none may echo the token either.
    returned.push(await readUsage(run, answer(401)), await readUsage(run, vi.fn(async () => Promise.reject(new Error(`boom ${TOKEN}`)))))

    expect((fetch.mock.calls as unknown[][])[0]?.[1]).toMatchObject({ headers: { Authorization: `Bearer ${TOKEN}` } })
    expect(run).toHaveBeenCalledWith('security', expect.any(Array), expect.objectContaining({ secret: true }))
    const everything = JSON.stringify([returned, emitted, spies.flatMap((s) => s.mock.calls)])
    expect(everything).not.toContain(TOKEN)
    expect(spies.flatMap((s) => s.mock.calls)).toEqual([])
    spies.forEach((s) => s.mockRestore())
    // W18 also forbids files: nothing under Atril's home may hold it.
    const files = readdirSync(home, { recursive: true, withFileTypes: true }).filter((f) => f.isFile())
    for (const f of files) expect(readFileSync(join(f.parentPath, f.name), 'utf8')).not.toContain(TOKEN)
    delete process.env['ATRIL_HOME']
  })

  it('each failure says what happened with its fix and detail apart', async () => {
    const none: Runner = async () => ({ code: 44, stdout: '', stderr: 'could not be found' })
    const offline = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    const cases: Array<[string, UsageResult, 'retry' | 'claude', RegExp]> = [
      ['keychain', await readUsage(none, answer(200)), 'claude', /44/],
      ['not json', await readUsage(async () => ({ code: 0, stdout: 'nope', stderr: '' }), answer(200)), 'claude', /JSON/],
      ['401', await readUsage(keychain(), answer(401, { error: 'unauthorized' })), 'claude', /401/],
      ['429', await readUsage(keychain(), answer(429)), 'retry', /429/],
      ['500', await readUsage(keychain(), answer(500)), 'retry', /500/],
      ['offline', await readUsage(keychain(), offline), 'retry', /TypeError/],
      ['shape', await readUsage(keychain(), answer(200, { nope: 1 })), 'retry', /.+/]
    ]
    const sentences = new Set<string>()
    for (const [name, r, fix, detail] of cases) {
      expect(r, name).toHaveProperty('error')
      const e = r as { error: string; detail: string; fix: string }
      expect(e.error, name).not.toMatch(/api\.anthropic\.com|\b(401|429|500)\b/)
      expect(e.fix, name).toBe(fix)
      expect(e.detail, name).toMatch(detail)
      expect(e.detail, name).not.toContain(TOKEN)
      sentences.add(e.error)
    }
    // One sentence per cause: keychain, token, rate limit, network, anything else.
    expect(sentences.size).toBeGreaterThanOrEqual(5)
  })

  it('rate limit keeps the last value and backs off', async () => {
    vi.useFakeTimers()
    const seq = [200, 429, 429, 200]
    const fetch = vi.fn(async () => {
      const st = seq.shift() ?? 200
      return new Response(JSON.stringify(FIXTURE), { status: st })
    }) as unknown as typeof globalThis.fetch
    const emitted: unknown[] = []
    const usage = createUsage({ run: keychain(), fetch, emit: (u) => emitted.push(u) })
    usage.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(emitted.at(-1)).toHaveProperty('fiveHour')

    await vi.advanceTimersByTimeAsync(60_000) // 2nd call: 429
    const stale = emitted.at(-1) as { fiveHour?: unknown; stale?: { since: number } }
    expect(stale.fiveHour).toBeDefined() // the last good value stays on screen
    expect(stale.stale?.since).toBeTypeOf('number')
    expect(fetch).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(60_000) // backed off to 2 min: no call yet
    expect(fetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60_000) // 3rd call at 2 min: 429 again → 4 min
    expect(fetch).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(3 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(60_000) // 4th at 4 min: 200 → fresh, back to 1 min
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(emitted.at(-1)).not.toHaveProperty('stale')
    usage.stop()
    vi.useRealTimers()
  })

  it('the quota crossing 80 percent is one notice', () => {
    const watch = createQuotaWatch()
    const read = (five: number, seven: number, fiveAt = 'A', sevenAt = 'S'): UsageResult => ({ fiveHour: { pct: five, resetsAt: fiveAt }, sevenDay: { pct: seven, resetsAt: sevenAt } })
    // The first reading only sets the baseline, even at 90 %.
    expect(watch(read(90, 50))).toEqual([])
    expect(watch(read(70, 79))).toEqual([])
    expect(watch(read(70, 80))).toEqual([{ window: 'sevenDay', pct: 80, resetsAt: 'S' }])
    // Staying above, dipping and coming back within the same window: no second notice.
    expect(watch(read(70, 85))).toEqual([])
    expect(watch(read(70, 75))).toEqual([])
    expect(watch(read(81, 82))).toEqual([{ window: 'fiveHour', pct: 81, resetsAt: 'A' }])
    // An error or stale numbers say nothing and leave the baseline as it was.
    expect(watch({ error: 'x', detail: 'y', fix: 'retry' })).toEqual([])
    expect(watch({ ...read(10, 10, 'B'), stale: { since: 1 } })).toEqual([])
    // A new five-hour window starts over: below then above is one more.
    expect(watch(read(20, 82, 'B'))).toEqual([])
    expect(watch(read(80, 82, 'B'))).toEqual([{ window: 'fiveHour', pct: 80, resetsAt: 'B' }])
  })
})
