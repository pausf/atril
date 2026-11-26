// Pure scoring for the harness evals: evidence in, verdicts out. Nothing here spawns or reads a file.

export const CHECKS = ['acceptance', 'files', 'spec', 'tests-first', 'gates']

const PASS = { ok: true, why: '' }
const fail = (why) => ({ ok: false, why })

const TEST_PATH = /(^|\/)(tests?|__tests__)\/|\.test\.[cm]?[jt]sx?$/
const NEITHER = (p) => p.startsWith('.agents/') || p.endsWith('.md') || p === 'package.json'
const CRITERION = /^\s*[-*]\s+.*\bshall\b/
const PROOF = /^\s*Proof:\s+\S+\s+"[^"]+"\s*$/

// ponytail: any bullet containing "shall" counts as a criterion, so a Constraint written with "shall"
// fails the run; the reason quotes the line. Tighten only if that false failure shows up in real reports.
function checkSpec(added) {
  const lines = added.split('\n')
  const criteria = lines.flatMap((line, i) => (CRITERION.test(line) ? [i] : []))
  if (!criteria.length) return fail('no criterion (a bullet with "shall") was added under .agents/')
  for (const i of criteria) {
    const next = lines.slice(i + 1).find((l) => l.trim() !== '')
    if (next === undefined || !PROOF.test(next)) return fail(`criterion without its Proof: ${lines[i].trim().slice(0, 80)}`)
  }
  return PASS
}

function checkTestsFirst(writes) {
  const code = writes.filter((p) => !NEITHER(p))
  const test = code.findIndex((p) => TEST_PATH.test(p))
  const source = code.findIndex((p) => !TEST_PATH.test(p))
  if (test < 0) return fail('no test was written')
  if (source < 0) return fail('no source was written')
  return test < source ? PASS : fail(`${code[source]} was written before any test`)
}

/**
 * @param {{ expect: { files: string[] } }} task
 * @param {{ writes: string[], added: string, existing: string[], acceptanceExit: number, gatesExit: number, spawnError?: string }} evidence
 */
export function scoreRun(task, evidence) {
  if (evidence.spawnError) {
    const checks = Object.fromEntries(CHECKS.map((name) => [name, fail(evidence.spawnError)]))
    return { passed: false, checks }
  }
  const missing = task.expect.files.filter((f) => !evidence.existing.includes(f))
  const checks = {
    acceptance: evidence.acceptanceExit === 0 ? PASS : fail(`the hidden acceptance test exited ${evidence.acceptanceExit}`),
    files: missing.length ? fail(`missing: ${missing.join(', ')}`) : PASS,
    spec: checkSpec(evidence.added),
    'tests-first': checkTestsFirst(evidence.writes),
    gates: evidence.gatesExit === 0 ? PASS : fail(`npm test exited ${evidence.gatesExit}`)
  }
  return { passed: CHECKS.every((name) => checks[name].ok), checks }
}

/** @param {{ task: string, passed: boolean, checks: Record<string, { ok: boolean }> }[]} results */
export function summarize(results) {
  const tasks = {}
  const checks = Object.fromEntries(CHECKS.map((name) => [name, 0]))
  for (const r of results) {
    const t = (tasks[r.task] ??= { passed: 0, of: 0 })
    t.of++
    if (r.passed) t.passed++
    for (const name of CHECKS) if (r.checks[name].ok) checks[name]++
  }
  return { total: { passed: results.filter((r) => r.passed).length, of: results.length }, tasks, checks }
}
