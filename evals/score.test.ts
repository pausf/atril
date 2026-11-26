import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { parseTranscript, scoreRun, summarize, writeReport } from './score.mjs'

const task = { id: 'add-coupon', expect: { files: ['src/coupon.js', 'test/coupon.test.js'] } }
const good = [
  '# add-coupon',
  '',
  '- **C1** When a valid code is applied, the cart shall subtract its percentage.',
  '  Proof: test/coupon.test.js "applies a valid code"',
  '- **C2** If the code is unknown, then the cart shall refuse it.',
  '',
  '  Proof: test/coupon.test.js "refuses an unknown code"'
].join('\n')
const evidence = {
  writes: ['test/coupon.test.js', 'src/coupon.js'],
  added: good,
  existing: ['src/coupon.js', 'test/coupon.test.js'],
  acceptanceExit: 0,
  gatesExit: 0
}
const why = (e: object, check: string): string => (scoreRun(task, { ...evidence, ...e }).checks as Record<string, { ok: boolean; why: string }>)[check]!.why

describe('evals scoring', () => {
  it('the spec check wants shall criteria each followed by a Proof', () => {
    expect(scoreRun(task, evidence).checks.spec).toEqual({ ok: true, why: '' })
    expect(why({ added: '- nothing to see here\n# title' }, 'spec')).toMatch(/no criterion/)
    const noProof = good.replace('  Proof: test/coupon.test.js "refuses an unknown code"', '- **C3** The cart shall exist.')
    expect(scoreRun(task, { ...evidence, added: noProof }).checks.spec.ok).toBe(false)
    expect(why({ added: noProof }, 'spec')).toMatch(/without its Proof.*refuse it/)
    // A path with no quoted test name is not a Proof.
    const bare = good.replaceAll('"applies a valid code"', 'applies')
    expect(scoreRun(task, { ...evidence, added: bare }).checks.spec.ok).toBe(false)
  })

  it('tests come before source in the write order', () => {
    expect(scoreRun(task, evidence).checks['tests-first']).toEqual({ ok: true, why: '' })
    expect(why({ writes: ['src/coupon.js', 'test/coupon.test.js'] }, 'tests-first')).toMatch(/src\/coupon\.js.*before/)
    expect(why({ writes: ['src/coupon.js'] }, 'tests-first')).toMatch(/no test/)
    expect(why({ writes: ['test/coupon.test.js'] }, 'tests-first')).toMatch(/no source/)
    expect(why({ writes: [] }, 'tests-first')).toMatch(/no test/)
    // Docs, the flow's own files and package.json are neither tests nor source.
    const noise = ['.agents/changes/x/proposal.md', 'README.md', 'package.json', 'lib/a.test.mjs', 'src/coupon.js']
    expect(scoreRun(task, { ...evidence, writes: noise }).checks['tests-first'].ok).toBe(true)
    expect(scoreRun(task, { ...evidence, writes: ['__tests__/a.js', 'src/a.js'] }).checks['tests-first'].ok).toBe(true)
  })

  it('scores files, acceptance and gates from the evidence', () => {
    const bad = scoreRun(task, { ...evidence, existing: ['src/coupon.js'], acceptanceExit: 1, gatesExit: 124 }).checks
    expect(bad.files.why).toBe('missing: test/coupon.test.js')
    expect(bad.acceptance).toEqual({ ok: false, why: 'the hidden acceptance test exited 1' })
    expect(bad.gates).toEqual({ ok: false, why: 'npm test exited 124' })
    expect(scoreRun(task, { ...evidence, existing: [] }).checks.files.why).toBe('missing: src/coupon.js, test/coupon.test.js')
    const ok = scoreRun(task, evidence).checks
    expect([ok.files.ok, ok.acceptance.ok, ok.gates.ok]).toEqual([true, true, true])
  })

  it('a run passes only when every check passes and totals read x of N', () => {
    const pass = scoreRun(task, evidence)
    const noTests = scoreRun(task, { ...evidence, writes: ['src/coupon.js'] })
    const noAccept = scoreRun(task, { ...evidence, acceptanceExit: 1 })
    expect(pass.passed).toBe(true)
    expect(noTests.passed).toBe(false)

    // A claude that could not start fails all five checks with the spawn error.
    const dead = scoreRun(task, { ...evidence, spawnError: 'spawn claude ENOENT' })
    expect(dead.passed).toBe(false)
    expect(Object.values(dead.checks).map((c) => c.why)).toEqual(Array(5).fill('spawn claude ENOENT'))

    const totals = summarize([
      { task: 'add-coupon', ...pass },
      { task: 'add-coupon', ...noTests },
      { task: 'add-coupon', ...noAccept },
      { task: 'fix-rounding', ...pass }
    ])
    expect(totals.total).toEqual({ passed: 2, of: 4 })
    expect(totals.tasks).toEqual({ 'add-coupon': { passed: 1, of: 3 }, 'fix-rounding': { passed: 1, of: 1 } })
    expect(totals.checks).toEqual({ acceptance: 3, files: 4, spec: 4, 'tests-first': 3, gates: 4 })
  })
})

describe('evals transcript and report', () => {
  it('reads the write order and the cost from a stream', () => {
    const root = mkdtempSync(join(tmpdir(), 'evals-t-'))
    const real = join(root, 'real')
    mkdirSync(real)
    symlinkSync(real, join(root, 'alias'))
    const use = (name: string, input: object): string => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'hi' }, { type: 'tool_use', name, input }] } })
    const stream = [
      'not json at all',
      JSON.stringify({ type: 'system', subtype: 'init' }),
      use('Skill', { skill: 'libretto:libretto-attacca' }),
      use('Write', { file_path: join(root, 'alias', 'test', 'a.test.js') }),
      use('Edit', { file_path: join(real, 'src', 'a.js') }),
      use('MultiEdit', { file_path: join(real, 'src', 'b.js') }),
      use('Write', { file_path: '/etc/outside.txt' }),
      use('Read', { file_path: join(real, 'src', 'read.js') }),
      '{"broken":',
      JSON.stringify({ type: 'result', total_cost_usd: 0.42, num_turns: 7, duration_ms: 1234 })
    ].join('\n')
    expect(parseTranscript(stream, real)).toEqual({
      writes: ['test/a.test.js', 'src/a.js', 'src/b.js'],
      skills: ['libretto:libretto-attacca'],
      cost: 0.42,
      turns: 7,
      durationMs: 1234
    })
    // A killed run has no result event.
    expect(parseTranscript(use('Write', { file_path: join(real, 'x.js') }), real)).toEqual({ writes: ['x.js'], skills: [], cost: null, turns: null, durationMs: null })
  })

  it('writes JSON and Markdown that show x of N per task', () => {
    const run = (task: string, ok: boolean) => ({
      task,
      passed: ok,
      checks: {
        acceptance: { ok, why: ok ? '' : 'the hidden acceptance test exited 1' },
        files: { ok: true, why: '' },
        spec: { ok: true, why: '' },
        'tests-first': { ok: true, why: '' },
        gates: { ok: true, why: '' }
      },
      cost: 0.5,
      turns: 3,
      durationMs: 900,
      skills: ['libretto:libretto-attacca'],
      timedOut: false,
      exitCode: 0
    })
    const meta = { model: 'haiku', claude: '2.1.332 (Claude Code)', command: '/libretto:libretto-attacca', startedAt: '2026-11-26T16:40:00.123Z' }
    const out = join(mkdtempSync(join(tmpdir(), 'evals-r-')), 'reports')
    const { jsonPath, mdPath } = writeReport(out, meta, [run('add-coupon', true), run('add-coupon', false), run('fix-rounding', true)])
    expect(basename(jsonPath)).toBe('2026-11-26T16-40-00Z-haiku.json')
    expect(basename(mdPath)).toBe('2026-11-26T16-40-00Z-haiku.md')
    const json = JSON.parse(readFileSync(jsonPath, 'utf8'))
    expect(json.meta).toEqual(meta)
    expect(json.runs).toHaveLength(3)
    expect(json.runs[1]).toMatchObject({ cost: 0.5, durationMs: 900, skills: ['libretto:libretto-attacca'], timedOut: false })
    expect(json.summary.total).toEqual({ passed: 2, of: 3 })
    const md = readFileSync(mdPath, 'utf8')
    expect(md).toMatch(/add-coupon \| 1 of 2/)
    expect(md).toMatch(/fix-rounding \| 1 of 1/)
    expect(md).toMatch(/acceptance \| 2 of 3/)
    expect(md).toMatch(/add-coupon #2.*acceptance.*the hidden acceptance test exited 1/)
    expect(md).toMatch(/haiku/)
    // A model name with odd characters stays a safe file name.
    expect(basename(writeReport(out, { ...meta, model: 'a/b c' }, [run('t', true)]).jsonPath)).toBe('2026-11-26T16-40-00Z-a-b-c.json')
  })
})
