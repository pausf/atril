// The branch-size claim (W45): plain Node, so the hook can run it without the TypeScript build.
// Counts like src/main/flow/changes.ts (F18); W46 pins the two together.
import { execFileSync } from 'node:child_process'
import { lstatSync, mkdirSync, openSync, closeSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export const THRESHOLD = 400
const TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'Bash'])

function git(path, args) {
  const env = { ...process.env, PATH: `${process.env.PATH ?? ''}:/opt/homebrew/bin:/usr/local/bin` }
  // A hook must never hold Claude up: a git that takes longer than this means no note.
  return execFileSync('git', ['--literal-pathspecs', '-C', path, ...args], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 5000 })
}

function untrackedLines(file) {
  const st = lstatSync(file, { throwIfNoEntry: false })
  if (!st?.isFile()) return st?.isSymbolicLink() ? 1 : 0
  const bytes = readFileSync(file)
  if (bytes.subarray(0, 8000).includes(0)) return 0
  const text = bytes.toString('utf8')
  return (text.match(/\n/g)?.length ?? 0) + (text !== '' && !text.endsWith('\n') ? 1 : 0)
}

/** Added + removed lines against base: committed, uncommitted and untracked-but-not-ignored. */
export function branchSize(path, base) {
  let total = 0
  for (const rec of git(path, ['diff', '--no-renames', '-z', '--numstat', base]).split('\0')) {
    const [a, r] = rec.split('\t')
    if (r === undefined) continue
    total += (a === '-' ? 0 : Number(a)) + (r === '-' ? 0 : Number(r))
  }
  for (const file of git(path, ['ls-files', '-z', '--others', '--exclude-standard']).split('\0')) {
    if (file) total += untrackedLines(join(path, file))
  }
  return total
}

/** The threshold k this call claims, or null; each k is claimed once per session. Claude is told nothing: F25 asks the person. */
export function claimSize({ home, session, event, tool }) {
  if (event !== 'PostToolUse' || !TOOLS.has(tool)) return null
  let ws
  try {
    ws = JSON.parse(readFileSync(join(home, 'workspaces.json'), 'utf8')).workspaces?.find((w) => w.session === session)
  } catch {
    return null
  }
  if (!ws?.path || !ws.baseCommit) return null
  const total = branchSize(ws.path, ws.baseCommit)
  const k = Math.floor((total - 1) / THRESHOLD)
  if (k < 1) return null
  const dir = join(home, 'size', session)
  mkdirSync(dir, { recursive: true })
  const claimed = readdirSync(dir).map((n) => Number(n.slice(1))).filter(Number.isFinite)
  if (claimed.some((c) => c >= k)) return null
  try {
    // wx: of two hooks racing for the same k, only one creates the claim.
    closeSync(openSync(join(dir, `k${k}`), 'wx'))
  } catch {
    return null
  }
  return k
}
