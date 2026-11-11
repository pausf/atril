import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCost } from './cost'
import { PRICES_AT } from './prices'
import { cleanTmp, tmp } from './test-helpers'

interface U { input?: number; output?: number; write?: number; read?: number }
const line = (id: string, model: string, u: U): string =>
  JSON.stringify({
    type: 'assistant',
    message: {
      id,
      model,
      role: 'assistant',
      content: [{ type: 'text', text: 'SECRET' }],
      usage: { input_tokens: u.input ?? 0, output_tokens: u.output ?? 0, cache_creation_input_tokens: u.write ?? 0, cache_read_input_tokens: u.read ?? 0 }
    }
  }) + '\n'

describe('cost', () => {
  let home: string
  beforeEach(() => {
    home = tmp()
    process.env['ATRIL_HOME'] = home
  })
  afterEach(() => {
    delete process.env['ATRIL_HOME']
    cleanTmp()
  })

  it('usage is totalled once per message and priced by model', async () => {
    expect(PRICES_AT).toBe('2026-11-11')
    const dir = join(home, 'claude')
    const transcript = join(dir, 'sess.jsonl')
    mkdirSync(join(dir, 'sess', 'subagents'), { recursive: true })
    const m1 = line('m1', 'claude-opus-5-5', { input: 1000, output: 2000, write: 4000, read: 1_000_000 })
    writeFileSync(
      transcript,
      [
        m1,
        // The same message written again (one line per content block): counted once.
        m1,
        'not json {\n',
        JSON.stringify({ type: 'user', message: { role: 'user', content: 'SECRET' } }) + '\n',
        JSON.stringify({ type: 'assistant', message: { id: 'm0', model: 'claude-opus-5-5', content: [] } }) + '\n',
        // A dated id is priced as its model; an unknown model counts tokens, not cost.
        line('m2', 'claude-sonnet-5-20261001', { input: 10_000, output: 1000, read: 100_000 }),
        line('m3', 'claude-mystery-9', { input: 500 }),
        // Two lines without an id: each counts once.
        JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5', usage: { input_tokens: 100_000 } } }) + '\n',
        JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5', usage: { input_tokens: 100_000 } } }) + '\n'
      ].join('')
    )
    // Subagents beside it: every *.jsonl, nothing else; a message id seen in the main transcript is not counted again.
    writeFileSync(join(dir, 'sess', 'subagents', 'agent-x.jsonl'), line('m4', 'claude-haiku-5-5', { input: 100_000, output: 20_000, write: 8000 }) + m1)
    writeFileSync(join(dir, 'sess', 'subagents', 'agent-x.meta.json'), line('m8', 'claude-opus-5-5', { input: 1_000_000 }))

    // No pointer: nothing.
    const costs = createCost({ emit: () => {} })
    expect(await costs.forSession('s1')).toBeNull()
    // Every transcript the hook listed counts (a resumed session has an earlier one), with its own subagents.
    const earlier = join(dir, 'earlier.jsonl')
    writeFileSync(earlier, line('e1', 'claude-sonnet-5-5', { input: 1_000_000, read: 1_000_000 }))
    mkdirSync(join(home, 'transcripts'), { recursive: true })
    writeFileSync(join(home, 'transcripts', 's1'), `${earlier}\n${transcript}\n`)

    const first = await costs.forSession('s1')
    expect(first?.models).toEqual({
      'claude-opus-5-5': { input: 1000, output: 2000, cacheWrite: 4000, cacheRead: 1_000_000 },
      'claude-sonnet-5-20261001': { input: 10_000, output: 1000, cacheWrite: 0, cacheRead: 100_000 },
      'claude-mystery-9': { input: 500, output: 0, cacheWrite: 0, cacheRead: 0 },
      'claude-opus-5': { input: 200_000, output: 0, cacheWrite: 0, cacheRead: 0 },
      'claude-haiku-5-5': { input: 100_000, output: 20_000, cacheWrite: 8000, cacheRead: 0 },
      'claude-sonnet-5-5': { input: 1_000_000, output: 0, cacheWrite: 0, cacheRead: 1_000_000 }
    })
    expect(first?.tokens).toBe(1_007_000 + 111_000 + 500 + 200_000 + 128_000 + 2_000_000)
    expect(first?.unpriced).toEqual(['claude-mystery-9'])
    // Opus 5.5 4/20, write 1.25× input, its published cache read 0.20: 0.004 + 0.04 + 0.02 + 0.2.
    // Sonnet 5 2/10, cache read 0.1× input: 0.02 + 0.01 + 0.02. Opus 5 5/25: 1.
    // Haiku 5.5 with 108 000 tokens in is a long prompt, 0.50/2.50: 0.05 + 0.05 + 0.005.
    // Sonnet 5.5 2/10, its published cache read 0.10: 2 + 0.1.
    expect(first?.usd).toBeCloseTo(0.264 + 0.05 + 1 + 0.105 + 2.1, 9)

    // Only the bytes appended since the last read: rewriting m1's id in place would count a new message if reread.
    writeFileSync(transcript, readFileSync(transcript, 'utf8').replace(/"m1"/g, '"m9"'))
    appendFileSync(transcript, line('m5', 'claude-opus-5', { input: 200_000 }) + line('m6', 'claude-fable-5-2', { output: 1000 }).slice(0, 40))
    const second = await costs.forSession('s1')
    expect(second?.tokens).toBe(first!.tokens + 200_000)
    expect(second?.usd).toBeCloseTo(first!.usd! + 1, 9)
    // A half-written last line waits for its end.
    appendFileSync(transcript, line('m6', 'claude-fable-5-2', { output: 1000 }).slice(40))
    expect((await costs.forSession('s1'))?.usd).toBeCloseTo(first!.usd! + 1 + 0.04, 9)

    // Only unknown models: tokens, no cost.
    const lone = join(dir, 'lone.jsonl')
    writeFileSync(lone, line('u1', 'claude-opus-5-6', { input: 10 }))
    writeFileSync(join(home, 'transcripts', 's2'), lone)
    expect(await costs.forSession('s2')).toMatchObject({ tokens: 10, usd: null, unpriced: ['claude-opus-5-6'] })
  })

  it('haiku long prompts and fable cache use their prices', async () => {
    const transcript = join(home, 'h.jsonl')
    writeFileSync(
      transcript,
      [
        // Exactly 100 000 in (input + cache write + cache read) is the short price: 0.10/0.50, cache read 0.01.
        line('h1', 'claude-haiku-5-5', { input: 60_000, output: 1000, write: 20_000, read: 20_000 }),
        // One more token, under a dated id, is the long price: 0.50/2.50.
        line('h2', 'claude-haiku-5-5-20261001', { input: 100_001, output: 1000 }),
        // Long by its cache read alone, which then costs 0.05.
        line('h3', 'claude-haiku-5-5', { input: 1000, read: 200_000 }),
        // Fable 5.2 reads its cache at the published 0.20, not 0.1× its 8.
        line('f1', 'claude-fable-5-2', { input: 1000, read: 1_000_000 })
      ].join('')
    )
    mkdirSync(join(home, 'transcripts'), { recursive: true })
    writeFileSync(join(home, 'transcripts', 's3'), transcript)

    const got = await createCost({ emit: () => {} }).forSession('s3')
    expect(got?.models['claude-haiku-5-5']).toEqual({ input: 61_000, output: 1000, cacheWrite: 20_000, cacheRead: 220_000 })
    expect(got?.unpriced).toEqual([])
    const short = 0.006 + 0.0005 + 0.0025 + 0.0002
    const long = 0.0500005 + 0.0025
    const longRead = 0.0005 + 0.01
    const fable = 0.008 + 0.2
    expect(got?.usd).toBeCloseTo(short + long + longRead + fable, 9)
  })
})
