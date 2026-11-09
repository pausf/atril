// Claude Code hook: ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs <Event>.
// Atril's own Electron is the Node here: a Finder-launched app has no node or jq on PATH.
// The payload is read once and never written anywhere; only a short summary leaves this process.
import { execFileSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, fstatSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { summarise } from './summarise.mjs'
import { sizeNotice } from './branchsize.mjs'

// W59: pushes and request creation in an automatic workspace need the person.
const UPLOAD = /(^|[\s;&|(])(git(\s+-[cC]\s+\S+)*\s+push|gh\s+pr\s+create|glab\s+mr\s+create)\b/
const ASK = {
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: 'Modo automático: confirma antes de subir' }
}

const MAX_LINES = 200
const TAIL_BYTES = 64 * 1024
const STATES = {
  Notification: 'needs-you',
  Stop: 'needs-you',
  UserPromptSubmit: 'working',
  PreToolUse: 'working',
  PostToolUse: 'working'
}

function readTail(path) {
  const fd = openSync(path, 'r')
  try {
    const size = fstatSync(fd).size
    const len = Math.min(size, TAIL_BYTES)
    const buf = Buffer.alloc(len)
    readSync(fd, buf, 0, len, size - len)
    return buf.toString('utf8')
  } finally {
    closeSync(fd)
  }
}

// rename is atomic on one filesystem: the watcher never reads a half-written file.
function replace(file, data) {
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, data)
  renameSync(tmp, file)
}

function session() {
  const sock = process.env.ATRIL_TMUX_SOCKET
  const env = { ...process.env, PATH: `${process.env.PATH ?? ''}:/opt/homebrew/bin:/usr/local/bin` }
  return execFileSync('tmux', [...(sock ? ['-L', sock] : []), 'display', '-p', '#S'], { env, encoding: 'utf8' }).trim()
}

try {
  const event = process.argv[2] ?? ''
  if (!STATES[event]) process.exit(0)

  let payload = {}
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    /* no stdin or not JSON: the state still counts */
  }
  // W44: Claude's question tool is a stop (Libretto's before code is one): it waits for the person.
  const state = event === 'PreToolUse' && payload?.tool_name === 'AskUserQuestion' ? 'needs-you' : STATES[event]

  const name = session()
  if (!name) process.exit(0)
  const home = process.env.ATRIL_HOME ?? join(homedir(), '.atril')
  const at = Math.floor(Date.now() / 1000)
  const command = payload?.tool_input?.command
  if (event === 'PreToolUse' && payload?.tool_name === 'Bash' && typeof command === 'string' && UPLOAD.test(command) && existsSync(join(home, 'auto', name))) {
    process.stdout.write(JSON.stringify(ASK))
  }
  const line = summarise(event, payload, readTail)

  if (line) {
    const dir = join(home, 'activity')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `${name}.jsonl`)
    let kept = []
    try {
      kept = readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-(MAX_LINES - 1))    } catch {
      /* first line of this session */
    }
    replace(file, [...kept, JSON.stringify({ at, ...line })].join('\n') + '\n')
  }

  const dir = join(home, 'state')
  mkdirSync(dir, { recursive: true })
  const body = state === 'needs-you' && line ? { text: line.text } : {}
  replace(join(dir, `${name}.json`), JSON.stringify({ state, at, ...body }) + '\n')

  // W45: past each 400-line threshold, Claude is asked once to offer a split into smaller MRs.
  const notice = sizeNotice({ home, session: name, event, tool: payload?.tool_name })
  if (notice) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: notice } }))
} catch {
  /* a hook must never disturb Claude */
}
