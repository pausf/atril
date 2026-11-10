// Claude Code hook: ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs <Event>.
// Atril's own Electron is the Node here: a Finder-launched app has no node or jq on PATH.
// The payload is read once and never written anywhere; only a short summary leaves this process.
import { execFileSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, fstatSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { summarise } from './summarise.mjs'
import { sizeNotice } from './branchsize.mjs'

// W59: pushes and request creation in an automatic workspace need the person.
// ponytail: any git … push in one command segment; a `push` word in a commit message only adds a question.
const UPLOAD = /\bgit\b[^;&|\n]*?\spush\b|\bgh\b[^;&|\n]*?\spr\s+create\b|\bglab\b[^;&|\n]*?\smr\s+create\b/
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

// W62-W64: Claude's subagents, one file per session. Only ids, types and the path of each subagent's own
// transcript are kept (main reads it on demand): never the prompt or the last message.
const SUBAGENT_EVENTS = ['SubagentStart', 'SubagentStop']
const MAX_ENTRIES = 20
const text = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

function trackSubagents(home, name, event, payload, at) {
  if (!SUBAGENT_EVENTS.includes(event) && event !== 'UserPromptSubmit') return
  const file = join(home, 'subagents', `${name}.json`)
  let entries = []
  let raw = ''
  try {
    raw = readFileSync(file, 'utf8')
    const v = JSON.parse(raw)
    if (Array.isArray(v.entries)) entries = v.entries
  } catch {
    /* first one for this session */
  }
  const type = text(payload?.agent_type)
  const id = text(payload?.agent_id)

  if (event === 'UserPromptSubmit') {
    entries = entries.filter((e) => e.endedAt === undefined)
  } else if (event === 'SubagentStart') {
    if (!type || !id) return
    // Claude Code keeps each subagent's transcript beside the session's (internal layout, verified on disk).
    const path = payload?.transcript_path
    const transcript = typeof path === 'string' && path.endsWith('.jsonl') ? `${path.slice(0, -6)}/subagents/agent-${id}.jsonl` : undefined
    entries.push({ id, type, ...(transcript && { transcript }), startedAt: at })
  } else {
    const entry = type && id ? entries.find((e) => e.id === id && e.endedAt === undefined) : undefined
    if (!entry) return
    entry.endedAt = at
  }

  // Past the ceiling the oldest finished entry goes; a running one never does.
  while (entries.length > MAX_ENTRIES) {
    const i = entries.findIndex((e) => e.endedAt !== undefined)
    if (i < 0) break
    entries.splice(i, 1)
  }
  const body = JSON.stringify({ entries }) + '\n'
  if (body === raw || (!raw && entries.length === 0)) return
  mkdirSync(join(home, 'subagents'), { recursive: true })
  replace(file, body)
}

// W74: the first question's labels, for the row's quick replies; an empty label would shift the numbers, so none then.
// A multiSelect question is only flagged: the row offers nothing for it. Both last while the state stays needs-you.
function quickReplies(event, state, payload, stateFile) {
  if (state !== 'needs-you') return {}
  if (event !== 'PreToolUse') {
    try {
      const prev = JSON.parse(readFileSync(stateFile, 'utf8'))
      if (prev.state !== 'needs-you') return {}
      return { ...(Array.isArray(prev.options) && { options: prev.options }), ...(prev.multiSelect === true && { multiSelect: true }) }
    } catch {
      return {}
    }
  }
  const q = payload?.tool_input?.questions?.[0]
  if (q?.multiSelect === true) return { multiSelect: true }
  const list = q?.options
  if (!Array.isArray(list) || list.length === 0) return {}
  const labels = list.slice(0, 4).map((o) => text(o?.label).slice(0, 40))
  return labels.every(Boolean) ? { options: labels } : {}
}

function session() {
  const sock = process.env.ATRIL_TMUX_SOCKET
  const env = { ...process.env, PATH: `${process.env.PATH ?? ''}:/opt/homebrew/bin:/usr/local/bin` }
  return execFileSync('tmux', [...(sock ? ['-L', sock] : []), 'display', '-p', '#S'], { env, encoding: 'utf8' }).trim()
}

try {
  const event = process.argv[2] ?? ''
  if (!STATES[event] && !SUBAGENT_EVENTS.includes(event)) process.exit(0)

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
  // Neither subagent event is the agent working or waiting: no state, no activity line.
  if (!STATES[event]) {
    trackSubagents(home, name, event, payload, at)
    process.exit(0)
  }
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

  // W87: Atril's pause mark goes when the person types or the agent waits; a late tool event keeps it.
  // Claude Code's idle reminder after a minute at the prompt is not a question: a pause survives it (W87).
  const idle = event === 'Notification' && (payload?.notification_type === 'idle_prompt' || /waiting for your input/i.test(text(payload?.message)))
  if (event === 'UserPromptSubmit' || (state === 'needs-you' && !idle)) rmSync(join(home, 'paused', name), { force: true })

  const dir = join(home, 'state')
  mkdirSync(dir, { recursive: true })
  const body = state === 'needs-you' && line ? { text: line.text } : {}
  const stateFile = join(dir, `${name}.json`)
  Object.assign(body, quickReplies(event, state, payload, stateFile))
  replace(stateFile, JSON.stringify({ state, at, ...body }) + '\n')

  try {
    trackSubagents(home, name, event, payload, at)
  } catch {
    /* the subagent list never costs the state its write */
  }

  // W45: past each 400-line threshold, Claude is asked once to offer a split into smaller MRs.
  const notice = sizeNotice({ home, session: name, event, tool: payload?.tool_name })
  if (notice) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: notice } }))
} catch {
  /* a hook must never disturb Claude */
}
