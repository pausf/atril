import { describe, expect, it } from 'vitest'
import { scoreRun, summarize } from './score.mjs'

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
