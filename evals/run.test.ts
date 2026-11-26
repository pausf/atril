import { describe, expect, it } from 'vitest'
import { confirm, plan } from './run.mjs'

const ids = ['add-coupon', 'fix-rounding', 'add-stock-check']
const ok = (argv: string[], isTTY = true) => {
  const r = plan(argv, { taskIds: ids, isTTY })
  if (!r.ok) throw new Error(r.message)
  return r.opts
}
const bad = (argv: string[], isTTY = true): string => {
  const r = plan(argv, { taskIds: ids, isTTY })
  if (r.ok) throw new Error('expected a refusal')
  return r.message
}
const io = (answer: string) => {
  const out: string[] = []
  let asked = 0
  return { out, asked: () => asked, write: (t: string) => void out.push(t), ask: async () => (asked++, answer) }
}

describe('evals runner arguments', () => {
  it('prints the run estimate and waits for a yes', async () => {
    const opts = ok(['--model', 'haiku', '--tasks', 'add-coupon,fix-rounding', '--runs', '2'])
    expect(opts).toMatchObject({ model: 'haiku', tasks: ['add-coupon', 'fix-rounding'], runs: 2, yes: false, estimate: 4 })
    expect(opts).toMatchObject({ timeoutMin: 20, budget: 3, command: '/libretto:libretto-attacca', claude: 'claude', keep: false, extra: [] })

    for (const answer of ['y', 'Y', 'yes', ' YES ']) {
      const yes = io(answer)
      expect(await confirm(yes, opts)).toBe(true)
      expect(yes.asked()).toBe(1)
      const text = yes.out.join('')
      expect(text).toMatch(/4 runs/)
      expect(text).toMatch(/2 tasks × 2 runs/)
      expect(text).toMatch(/haiku/)
      expect(text).toMatch(/quota/)
      expect(text).toMatch(/permissions are bypassed/i)
    }

    for (const answer of ['n', '', 'maybe', 'yess']) {
      const no = io(answer)
      expect(await confirm(no, opts)).toBe(false)
      expect(no.out.join('')).toMatch(/aborted/)
    }

    // --yes still prints the estimate but never asks.
    const auto = io('n')
    expect(await confirm(auto, ok(['--model', 'haiku', '--yes']))).toBe(true)
    expect(auto.asked()).toBe(0)
    expect(auto.out.join('')).toMatch(/9 runs/)
  })

  it('refuses to start without a model, with an unknown task, with bad numbers or without a terminal', () => {
    expect(bad([])).toMatch(/--model/)
    expect(bad(['--model', 'haiku', '--tasks', 'add-coupon,nope'])).toMatch(/unknown task "nope".*add-coupon/)
    for (const runs of ['0', '-1', '1.5', 'many']) expect(bad(['--model', 'haiku', '--runs', runs])).toMatch(/--runs/)
    for (const n of ['0', '-3', 'x']) {
      expect(bad(['--model', 'haiku', '--timeout', n])).toMatch(/--timeout/)
      expect(bad(['--model', 'haiku', '--max-budget-usd', n])).toMatch(/--max-budget-usd/)
    }
    expect(bad(['--model', 'haiku'], false)).toMatch(/--yes/)
    expect(bad(['--model', 'haiku', '--bogus'])).toMatch(/--bogus/)
    for (const m of [bad([]), bad(['--model', 'haiku'], false)]) expect(m).not.toMatch(/\n/)

    // Without a terminal, --yes is enough; the odd flags are not validated and what follows -- goes to claude.
    const opts = ok(['--model', 'haiku', '--yes', '--command', '/x', '--claude', '/bin/fake', '--keep', '--', '--setting-sources', 'project,local'], false)
    expect(opts).toMatchObject({ command: '/x', claude: '/bin/fake', keep: true, extra: ['--setting-sources', 'project,local'] })
  })
})
