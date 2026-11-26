import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { confirm, plan, runOnce } from './run.mjs'

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
  it("prints the run estimate and waits for a yes", async () => {
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

  it("refuses to start without a model, with an unknown task, with bad numbers or without a terminal", () => {
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

    // The script itself exits non-zero with the message and never reaches claude.
    const marker = join(mkdtempSync(join(tmpdir(), 'evals-m-')), 'called.json')
    for (const args of [[], ['--model', 'haiku']]) {
      const r = spawnSync(process.execPath, [RUN, ...args, '--claude', FAKE], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FAKE_ARGV_FILE: marker } })
      expect(r.status).toBe(1)
      expect(r.stderr.trim()).toMatch(/--model|--yes/)
    }
    expect(existsSync(marker)).toBe(false)
  })
})

const here = dirname(fileURLToPath(import.meta.url))
const RUN = join(here, 'run.mjs')
const FAKE = join(here, 'fake-claude.mjs')
const task = (id: string) => ({ id, ...JSON.parse(readFileSync(join(here, 'tasks', id, 'task.json'), 'utf8')) })
const base = { model: 'haiku', timeoutMin: 20, budget: 3, command: '/libretto:libretto-attacca', claude: FAKE, keep: false, extra: [] as string[] }
const env = (mode: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'evals-e-'))
  const files = { argv: join(dir, 'argv.json'), child: join(dir, 'child.pid') }
  Object.assign(process.env, { FAKE_MODE: mode, FAKE_ARGV_FILE: files.argv, FAKE_CHILD_FILE: files.child })
  return files
}
afterEach(() => {
  for (const k of ['FAKE_MODE', 'FAKE_ARGV_FILE', 'FAKE_CHILD_FILE']) delete process.env[k]
})
chmodSync(FAKE, 0o755)

describe('evals one attempt', () => {
  it("runs each attempt in a fresh git repo with the headless flags", async () => {
    const files = env('solve')
    const t = task('add-coupon')
    const kept = await runOnce(t, { ...base, keep: true, extra: ['--setting-sources', 'project,local'] })
    const seen = JSON.parse(readFileSync(files.argv, 'utf8'))
    expect(seen.argv).toEqual([
      '-p', '--output-format', 'stream-json', '--verbose', '--model', 'haiku', '--permission-mode', 'bypassPermissions',
      '--no-session-persistence', '--max-budget-usd', '3', `/libretto:libretto-attacca ${t.prompt}`, '--setting-sources', 'project,local'
    ])
    expect(realpathSync(seen.cwd).startsWith(realpathSync(tmpdir()))).toBe(true)
    expect(kept.dir).toBe(seen.cwd)
    const log = spawnSync('git', ['log', '--format=%s'], { cwd: kept.dir, encoding: 'utf8' }).stdout.trim().split('\n')
    expect(log.at(-1)).toBe('chore: baseline')
    expect(existsSync(join(kept.dir, 'CLAUDE.md'))).toBe(true)

    // Without --keep the directory goes away, and a second attempt starts from a fresh copy.
    const gone = await runOnce(t, base)
    expect(JSON.parse(readFileSync(files.argv, 'utf8')).cwd).not.toBe(seen.cwd)
    expect(existsSync(JSON.parse(readFileSync(files.argv, 'utf8')).cwd)).toBe(false)
    expect(gone.dir).toBeUndefined()
  })

  it("collects the evidence from the final tree even when the proposal was landed", async () => {
    env('solve')
    const landed = await runOnce(task('add-coupon'), base)
    expect(landed.checks).toMatchObject({ files: { ok: true }, gates: { ok: true }, acceptance: { ok: true }, spec: { ok: true }, 'tests-first': { ok: true } })
    expect(landed).toMatchObject({ passed: true, cost: 0.01, turns: 2, durationMs: 5, skills: ['libretto:libretto-attacca'], timedOut: false, exitCode: 0 })

    // Criteria that were never committed still count.
    env('untracked')
    expect((await runOnce(task('add-coupon'), base)).checks.spec.ok).toBe(true)

    // A claude that wrote nothing is judged on what the baseline holds, not on its word.
    env('fail')
    const nothing = await runOnce(task('add-coupon'), base)
    expect(nothing.passed).toBe(false)
    expect(nothing.checks.files.why).toMatch(/missing: src\/coupon\.js/)
    expect(nothing.checks.acceptance.ok).toBe(false)
    expect(nothing.checks.spec.why).toMatch(/no criterion/)
  })

  it("kills a run past the timeout and scores what is on disk", async () => {
    const files = env('hang')
    const r = await runOnce(task('add-coupon'), { ...base, timeoutMin: 0.03 })
    expect(r.timedOut).toBe(true)
    expect(r.passed).toBe(false)
    expect(r.checks.files.ok).toBe(false)
    // The child the fake claude started must be gone too.
    const pid = Number(readFileSync(files.child, 'utf8'))
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(() => process.kill(pid, 0)).toThrow(/ESRCH/)
  })

  it("a missing or failing claude is a scored failure, not a thrown stack", async () => {
    env('solve')
    const missing = await runOnce(task('add-coupon'), { ...base, claude: '/nonexistent/claude' })
    expect(missing.passed).toBe(false)
    expect(Object.values(missing.checks).every((c) => !c.ok && /ENOENT/.test(c.why))).toBe(true)

    env('fail')
    const failing = await runOnce(task('add-coupon'), base)
    expect(failing.exitCode).toBe(3)
    expect(failing.timedOut).toBe(false)
    expect(failing.checks.gates.ok).toBe(true)
    expect(failing.checks.files.ok).toBe(false)
  })

  it("importing the runner starts nothing", () => {
    const r = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(RUN)}).then(() => console.log('imported'))`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    expect(r.stdout.trim()).toBe('imported')
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
  })

  it("nothing in the repo starts the evals by itself", () => {
    const root = join(here, '..')
    const texts = [Object.values(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts).join('\n')]
    for (const dir of ['.githooks', '.github/workflows']) {
      if (existsSync(join(root, dir))) for (const name of readdirSync(join(root, dir))) texts.push(readFileSync(join(root, dir, name), 'utf8'))
    }
    expect(texts.length).toBeGreaterThan(2)
    for (const text of texts) expect(text).not.toMatch(/evals\/run/)
  })

  it("main runs the whole loop and writes the report", () => {
    env('solve')
    const out = join(mkdtempSync(join(tmpdir(), 'evals-o-')), 'reports')
    const r = spawnSync(process.execPath, [RUN, '--model', 'haiku', '--tasks', 'add-coupon', '--runs', '1', '--yes', '--claude', FAKE, '--out', out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stdout).toMatch(/1 of 1/)
    const json = readFileSync(join(out, readdirJson(out)), 'utf8')
    expect(JSON.parse(json)).toMatchObject({ meta: { model: 'haiku', claude: '9.9.9 (Fake Claude)' }, summary: { total: { passed: 1, of: 1 } } })
  })
})

const readdirJson = (dir: string): string => readdirSync(dir).find((n) => n.endsWith('.json')) ?? ''
