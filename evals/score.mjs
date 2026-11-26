// Scoring for the harness evals: evidence in, verdicts out. Nothing here spawns a process; the only
// file access is the transcript's path normalisation and the report writer.
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'

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

// Real path of a file that may not exist (or no longer): the nearest existing ancestor is resolved.
function real(p) {
  const tail = []
  for (let cur = p; ; cur = dirname(cur)) {
    try {
      return join(realpathSync(cur), ...tail)
    } catch {
      if (dirname(cur) === cur) return p
      tail.unshift(basename(cur))
    }
  }
}

const WRITERS = new Set(['Write', 'Edit', 'MultiEdit'])

/** Reads claude's stream-json output. Paths come back relative to `dir`; anything outside it is dropped. */
export function parseTranscript(text, dir) {
  const root = real(dir)
  const out = { writes: [], skills: [], cost: null, turns: null, durationMs: null }
  for (const line of text.split('\n')) {
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event?.type === 'result') {
      out.cost = event.total_cost_usd ?? null
      out.turns = event.num_turns ?? null
      out.durationMs = event.duration_ms ?? null
    }
    if (event?.type !== 'assistant' || !Array.isArray(event.message?.content)) continue
    for (const part of event.message.content) {
      if (part?.type !== 'tool_use') continue
      if (part.name === 'Skill' && typeof part.input?.skill === 'string') out.skills.push(part.input.skill)
      const file = part.input?.file_path
      if (WRITERS.has(part.name) && typeof file === 'string') {
        const rel = relative(root, real(file))
        if (!rel.startsWith('..') && !isAbsolute(rel)) out.writes.push(rel)
      }
    }
  }
  return out
}

function markdown(meta, results, summary) {
  const rows = (pairs) => pairs.map(([a, b]) => `| ${a} | ${b} |`).join('\n')
  const seen = {}
  const runs = []
  const failures = []
  for (const r of results) {
    const n = (seen[r.task] = (seen[r.task] ?? 0) + 1)
    runs.push(`| ${r.task} #${n} | ${r.passed ? 'pass' : 'FAIL'}${r.timedOut ? ' (timed out)' : ''} | ${r.cost ?? '?'} | ${r.durationMs ?? '?'} ms | ${r.skills.join(', ') || 'none'} |`)
    for (const name of CHECKS) if (!r.checks[name].ok) failures.push(`- ${r.task} #${n}: ${name} — ${r.checks[name].why}`)
  }
  return [
    `# Harness evals — ${meta.model}`,
    '',
    `- Claude: ${meta.claude}`,
    `- Command: ${meta.command}`,
    `- Started: ${meta.startedAt}`,
    `- Passed: ${summary.total.passed} of ${summary.total.of}`,
    '',
    '## Tasks',
    '',
    '| Task | Passed |',
    '|---|---|',
    rows(Object.entries(summary.tasks).map(([id, t]) => [id, `${t.passed} of ${t.of}`])),
    '',
    '## Checks',
    '',
    '| Check | Passed |',
    '|---|---|',
    rows(CHECKS.map((name) => [name, `${summary.checks[name]} of ${summary.total.of}`])),
    '',
    '## Runs',
    '',
    '| Run | Result | Cost (USD) | Duration | Skills called |',
    '|---|---|---|---|---|',
    ...runs,
    '',
    '## Failures',
    '',
    ...(failures.length ? failures : ['None.']),
    ''
  ].join('\n')
}

/** Writes `<UTC timestamp>-<model>.json` and `.md` into `dir`, creating it when missing. */
export function writeReport(dir, meta, results) {
  const summary = summarize(results)
  const stamp = new Date(meta.startedAt).toISOString().replace(/\.\d+Z$/, 'Z').replaceAll(':', '-')
  const base = join(dir, `${stamp}-${meta.model.replace(/[^A-Za-z0-9._]+/g, '-')}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${base}.json`, JSON.stringify({ meta, runs: results, summary }, null, 2) + '\n')
  writeFileSync(`${base}.md`, markdown(meta, results, summary))
  return { jsonPath: `${base}.json`, mdPath: `${base}.md` }
}
