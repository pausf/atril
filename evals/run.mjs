// Usage: node evals/run.mjs --model <model> [--tasks a,b] [--runs N] [--yes] [-- <extra claude args>]
// Runs the Libretto flow headless on a few fixed tasks and scores each run. Spends real quota: by hand only.
import { parseArgs } from 'node:util'

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
        keep: { type: 'boolean', default: false }
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
