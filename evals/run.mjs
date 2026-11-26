// Usage: node evals/run.mjs --model <model> [--tasks a,b] [--runs N] [--yes] [-- <extra claude args>]
// Runs the Libretto flow headless on a few fixed tasks and scores each run. Spends real quota: by hand only.
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { clearTimeout, setTimeout } from 'node:timers'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { parseTranscript, scoreRun, summarize, writeReport } from './score.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
// `npm test` and the acceptance test each get this long before they count as failed.
const LIMIT_MS = 120_000

const COMMAND = '/libretto:libretto-attacca'

const positive = (text) => Number.isFinite(Number(text)) && Number(text) > 0

/**
 * Parses and validates the command line; has no side effect.
 * @param {string[]} argv
 * @param {{ taskIds: string[], isTTY: boolean }} env
 */
export function plan(argv, { taskIds, isTTY }) {
  const cut = argv.indexOf('--')
  const extra = cut < 0 ? [] : argv.slice(cut + 1)
  let values
  try {
    ;({ values } = parseArgs({
      args: cut < 0 ? argv : argv.slice(0, cut),
      options: {
        model: { type: 'string' },
        tasks: { type: 'string' },
        runs: { type: 'string', default: '3' },
        yes: { type: 'boolean', default: false },
        timeout: { type: 'string', default: '20' },
        'max-budget-usd': { type: 'string', default: '3' },
        command: { type: 'string', default: COMMAND },
        claude: { type: 'string', default: 'claude' },
        keep: { type: 'boolean', default: false },
        out: { type: 'string' }
      }
    }))
  } catch (err) {
    return { ok: false, message: err.message.split('\n')[0] }
  }
  const refuse = (message) => ({ ok: false, message })
  if (!values.model) return refuse('--model is required, e.g. --model haiku (no default, so a run never silently uses an expensive model)')
  if (!Number.isInteger(Number(values.runs)) || Number(values.runs) < 1) return refuse('--runs must be a positive integer')
  if (!positive(values.timeout)) return refuse('--timeout must be a positive number of minutes')
  if (!positive(values['max-budget-usd'])) return refuse('--max-budget-usd must be a positive number')
  const tasks = values.tasks ? values.tasks.split(',').map((t) => t.trim()) : taskIds
  const unknown = tasks.find((t) => !taskIds.includes(t))
  if (unknown) return refuse(`unknown task "${unknown}" (have: ${taskIds.join(', ')})`)
  if (!isTTY && !values.yes) return refuse('stdin is not a terminal: pass --yes to run without asking')
  const runs = Number(values.runs)
  return {
    ok: true,
    opts: {
      model: values.model,
      tasks,
      runs,
      yes: values.yes,
      timeoutMin: Number(values.timeout),
      budget: Number(values['max-budget-usd']),
      command: values.command,
      claude: values.claude,
      keep: values.keep,
      out: values.out,
      extra,
      estimate: tasks.length * runs
    }
  }
}

/**
 * Prints the estimate and, unless --yes, waits for `y`/`yes`. Returns whether to go on.
 * @param {{ write: (text: string) => void, ask: () => Promise<string> }} io
 */
export async function confirm(io, opts) {
  io.write(
    `About to make ${opts.estimate} runs: ${opts.tasks.length} tasks × ${opts.runs} runs each, on model ${opts.model}.\n` +
      'Each run is a full Libretto flow with a real Claude: minutes each, and it spends quota.\n' +
      'Permissions are bypassed inside a temp dir.\n'
  )
  if (opts.yes) return true
  io.write('Continue? [y/N] ')
  const answer = (await io.ask()).trim().toLowerCase()
  if (answer === 'y' || answer === 'yes') return true
  io.write('aborted\n')
  return false
}

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' })

function prepare() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'evals-run-')))
  cpSync(join(HERE, 'sample'), dir, { recursive: true })
  // Local config so the person's global hooks and signing never run inside the throwaway repo.
  for (const args of [
    ['init', '-q'],
    ['config', 'user.name', 'evals'],
    ['config', 'user.email', 'evals@example.invalid'],
    ['config', 'commit.gpgsign', 'false'],
    ['config', 'core.hooksPath', '/dev/null'],
    ['add', '-A'],
    ['commit', '-q', '-m', 'chore: baseline']
  ]) {
    const r = git(dir, ...args)
    if (r.status !== 0) throw new Error(`git ${args[0]} failed in ${dir}: ${r.stderr}`)
  }
  return { dir, baseline: git(dir, 'rev-parse', 'HEAD').stdout.trim() }
}

function runClaude(opts, prompt, dir) {
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', opts.model, '--permission-mode', 'bypassPermissions', '--no-session-persistence', '--max-budget-usd', String(opts.budget), prompt, ...opts.extra]
  return new Promise((resolve) => {
    let out = ''
    let timedOut = false
    // Its own process group, so a timeout can stop claude's sub-processes too.
    const child = spawn(opts.claude, args, { cwd: dir, detached: true, stdio: ['ignore', 'pipe', 'ignore'] })
    const timer = setTimeout(() => {
      timedOut = true
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        // already gone
      }
    }, opts.timeoutMin * 60_000)
    child.stdout.on('data', (chunk) => (out += chunk))
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ spawnError: err.message })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ out, code, timedOut })
    })
  })
}

const added = (diff) => diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))

// Everything added under .agents/ since the baseline: commits, uncommitted edits and untracked files,
// so a proposal the agent landed and deleted still counts.
function addedUnderAgents(dir, baseline) {
  const lines = [...added(git(dir, 'log', '-p', '--format=', `${baseline}..HEAD`, '--', '.agents').stdout), ...added(git(dir, 'diff', 'HEAD', '--', '.agents').stdout)]
  for (const file of git(dir, 'ls-files', '-z', '--others', '--exclude-standard', '--', '.agents').stdout.split('\0').filter(Boolean)) {
    lines.push(...readFileSync(join(dir, file), 'utf8').split('\n'))
  }
  return lines.join('\n')
}

const exitOf = (r) => r.status ?? 124

/**
 * One attempt: a fresh repo, claude headless in it, then the evidence measured from the final tree.
 * @param {{ id: string, prompt: string, expect: { files: string[] } }} task
 */
export async function runOnce(task, opts) {
  const { dir, baseline } = prepare()
  try {
    const res = await runClaude(opts, `${opts.command} ${task.prompt}`, dir)
    const blank = { cost: null, turns: null, durationMs: null, skills: [], timedOut: false, exitCode: null }
    if (res.spawnError) return { task: task.id, ...scoreRun(task, { spawnError: res.spawnError }), ...blank }
    const transcript = parseTranscript(res.out, dir)
    const gatesExit = exitOf(spawnSync('npm', ['test'], { cwd: dir, timeout: LIMIT_MS, killSignal: 'SIGKILL', stdio: 'ignore' }))
    cpSync(join(HERE, 'tasks', task.id, 'acceptance.test.js'), join(dir, 'acceptance.test.js'))
    const acceptanceExit = exitOf(spawnSync(process.execPath, ['--test', 'acceptance.test.js'], { cwd: dir, timeout: LIMIT_MS, killSignal: 'SIGKILL', stdio: 'ignore' }))
    const scored = scoreRun(task, {
      writes: transcript.writes,
      added: addedUnderAgents(dir, baseline),
      existing: task.expect.files.filter((f) => existsSync(join(dir, f))),
      acceptanceExit,
      gatesExit
    })
    return {
      task: task.id,
      ...scored,
      cost: transcript.cost,
      turns: transcript.turns,
      durationMs: transcript.durationMs,
      skills: transcript.skills,
      timedOut: res.timedOut,
      exitCode: res.code,
      ...(opts.keep ? { dir } : {})
    }
  } finally {
    if (!opts.keep) rmSync(dir, { recursive: true, force: true })
  }
}

async function main() {
  const tasksDir = join(HERE, 'tasks')
  const parsed = plan(process.argv.slice(2), { taskIds: readdirSync(tasksDir).sort(), isTTY: Boolean(process.stdin.isTTY) })
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n`)
    process.exit(1)
  }
  const { opts } = parsed
  const io = {
    write: (text) => process.stdout.write(text),
    ask: () =>
      new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin })
        rl.question('', (answer) => (rl.close(), resolve(answer)))
      })
  }
  if (!(await confirm(io, opts))) process.exit(1)
  const claude = spawnSync(opts.claude, ['--version'], { encoding: 'utf8' }).stdout?.trim() || 'unknown'
  const startedAt = new Date().toISOString()
  const results = []
  for (const id of opts.tasks) {
    const task = { id, ...JSON.parse(readFileSync(join(tasksDir, id, 'task.json'), 'utf8')) }
    for (let i = 1; i <= opts.runs; i++) {
      process.stderr.write(`[${results.length + 1}/${opts.estimate}] ${id} #${i} ...\n`)
      const result = await runOnce(task, opts)
      results.push(result)
      process.stderr.write(`  ${result.passed ? 'pass' : 'FAIL'}\n`)
    }
  }
  const { jsonPath, mdPath } = writeReport(opts.out ?? join(HERE, 'reports'), { model: opts.model, claude, command: opts.command, startedAt }, results)
  const { total } = summarize(results)
  process.stdout.write(`${total.passed} of ${total.of} runs passed\n${mdPath}\n${jsonPath}\n`)
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) await main()
