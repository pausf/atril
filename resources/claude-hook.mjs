// Claude Code hook: ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs <Event>.
// Atril's own Electron is the Node here: a Finder-launched app has no node or jq on PATH.
// The payload is read once and never written anywhere; only a short summary and the transcript's path leave this process.
import { execFileSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, fstatSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { lastText, summarise } from './summarise.mjs'
import { claimSize } from './branchsize.mjs'
import { boxOf, decideStop, lastSentence, openBoxes, proseQuestion, reason, shellsRunning } from './keepgoing.mjs'

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

// W92: every transcript this session has used, one path per line, for main's cost totals; never their content.
function keepTranscript(home, name, path) {
  if (typeof path !== 'string' || !path.endsWith('.jsonl') || path.includes('\n')) return
  const file = join(home, 'transcripts', name)
  let raw = ''
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    /* first event of this session */
  }
  if (raw.split('\n').includes(path)) return
  mkdirSync(join(home, 'transcripts'), { recursive: true })
  replace(file, `${raw}${path}\n`)
}

// W74: every question of the call, whole, for the card; W198: the tool a permission waits on.
const QUESTION = (q) => ({
  question: text(q?.question),
  header: text(q?.header),
  options: Array.isArray(q?.options) ? q.options.map((o) => ({ label: text(o?.label), description: text(o?.description) })) : [],
  multiSelect: q?.multiSelect === true
})
const PATHS = ['Edit', 'Write', 'MultiEdit']

function toolOf(payload) {
  const tool = text(payload?.tool_name)
  if (!tool) return undefined
  const input = payload?.tool_input
  const summary = tool === 'Bash' ? text(input?.command) : PATHS.includes(tool) ? text(input?.file_path) : ''
  return summary ? { tool, summary } : { tool }
}

const isPermission = (payload) => payload?.notification_type === 'permission_prompt' || /^Claude needs your permission/i.test(text(payload?.message))

function readState(file) {
  try {
    const v = JSON.parse(readFileSync(file, 'utf8'))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/** W197, W74, W198: the kind of wait, the call's questions while it waits, and the tool a permission is for. */
function details(event, state, payload, prev, lastTool) {
  if (state !== 'needs-you') return {}
  const asked = event === 'PreToolUse'
  const waited = prev.state === 'needs-you'
  const list = asked ? payload?.tool_input?.questions : waited ? prev.questions : undefined
  const out = Array.isArray(list) && list.length > 0 ? { questions: asked ? list.map(QUESTION) : list } : {}
  if (asked) return { ...out, kind: 'question' }
  if (event === 'Stop') return { ...out, kind: 'turn-end' }
  // A Notification while a question waits is about that question, a permission prompt included.
  if (waited && prev.kind === 'question') return { ...out, kind: 'question' }
  if (!isPermission(payload)) return out
  const tool = lastTool ?? (waited ? prev.permission : undefined)
  return { ...out, kind: 'permission', ...(tool && { permission: tool }) }
}

/**
 * The session's name and the latest tool it asked for (W198), in the one tmux call the hook already makes.
 * The tool lives in a tmux session option, never on disk: a command reaches a file only when a permission waits on it (A1).
 */
function session(remember) {
  const sock = process.env.ATRIL_TMUX_SOCKET
  const env = { ...process.env, PATH: `${process.env.PATH ?? ''}:/opt/homebrew/bin:/usr/local/bin` }
  const target = process.env.TMUX_PANE ? ['-t', process.env.TMUX_PANE] : []
  const args = ['display', '-p', ...target, '#S\n#{@atril-tool}']
  if (remember) args.push(';', 'set-option', '-q', ...target, '@atril-tool', JSON.stringify(remember))
  const [name = '', tool = ''] = execFileSync('tmux', [...(sock ? ['-L', sock] : []), ...args], { env, encoding: 'utf8' }).split('\n')
  let lastTool
  try {
    lastTool = tool.trim() ? JSON.parse(tool) : undefined
  } catch {
    /* not ours */
  }
  return { name: name.trim(), lastTool }
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

  const { name, lastTool } = session(event === 'PreToolUse' ? toolOf(payload) : undefined)
  if (!name) process.exit(0)
  const home = process.env.ATRIL_HOME ?? join(homedir(), '.atril')
  const at = Math.floor(Date.now() / 1000)
  try {
    keepTranscript(home, name, payload?.transcript_path)
  } catch {
    /* the cost pointer never costs the state its write */
  }
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

  const dir = join(home, 'state')
  mkdirSync(dir, { recursive: true })
  const stateFile = join(dir, `${name}.json`)
  const prev = readState(stateFile)

  // W217, W218, W225: a stop with open boxes is answered here and the agent keeps going.
  let blocks = event === 'UserPromptSubmit' ? 0 : Number.isInteger(prev.blocks) ? prev.blocks : 0
  // W221: the turn a state belongs to, so main can tell one turn end notified twice.
  const turn = event === 'UserPromptSubmit' ? at : Number.isInteger(prev.turn) ? prev.turn : undefined
  // W44: Claude's question tool is a stop (Libretto's before code is one): it waits for the person.
  let state = event === 'PreToolUse' && payload?.tool_name === 'AskUserQuestion' ? 'needs-you' : STATES[event]
  // W219: a question to the person in prose is a wait, whatever is left to do.
  // W228: a stop while a question or permission still waits stays that wait's turn end, as before.
  const pending = prev.state === 'needs-you' && (prev.kind === 'question' || prev.kind === 'permission')
  let tail = ''
  if (event === 'Stop' && typeof payload?.transcript_path === 'string') {
    try {
      tail = readTail(payload.transcript_path)
    } catch {
      /* unreadable transcript: no shell, no question */
    }
  }
  // W229: Claude Code resumes by itself when its background shell ends; that stop is no wait.
  const shell = event === 'Stop' && !pending && shellsRunning(tail)
  if (shell) state = 'working'
  const asked = shell ? '' : proseQuestion(lastText(tail))
  // W291: the cap's fallback says which box the agent is on.
  let cap
  if (event === 'Stop' && !asked && !pending && !shell) {
    const open = openBoxes(payload?.cwd)
    const stop = decideStop({ open, active: payload?.stop_hook_active, blocks, paused: existsSync(join(home, 'paused', name)) })
    blocks = stop.blocks
    if (stop.cap) cap = { why: 'cap', ...(boxOf(open) && { box: boxOf(open) }) }
    if (stop.outcome === 'block') {
      state = 'working'
      process.stdout.write(JSON.stringify({ decision: 'block', reason: reason(open) }))
    } else if (stop.outcome === undefined) state = 'done' // W220: nothing open, nothing asked

  }

  // W292: what it said on this stop, and how many stops in a row said it (or failed the same way).
  let fail = typeof prev.fail === 'string' ? prev.fail : undefined
  if (line?.kind === 'fail') fail = line.text
  let lastStop = prev.lastStop && typeof prev.lastStop === 'object' ? prev.lastStop : undefined
  let repeat = Number.isInteger(prev.repeat) ? prev.repeat : 0
  let said = ''
  if (event === 'Stop') {
    said = lastSentence(lastText(tail))
    repeat = (said && said === lastStop?.said) || (fail && fail === lastStop?.fail) ? repeat + 1 : 0
    lastStop = { said, ...(fail && { fail }) }
    fail = undefined
  }
  const memory = { ...(fail && { fail }), ...(lastStop && { lastStop }), repeat, ...(said && { said }), ...cap }

  // W87: Atril's pause mark goes when the person types or the agent waits; a late tool event keeps it.
  // Claude Code's idle reminder after a minute at the prompt is not a question: a pause survives it (W87).
  const idle = event === 'Notification' && (payload?.notification_type === 'idle_prompt' || /waiting for your input/i.test(text(payload?.message)))
  if (event === 'UserPromptSubmit' || ((state === 'needs-you' || state === 'done') && !idle)) rmSync(join(home, 'paused', name), { force: true })

  // W195: the idle reminder is no new question; a waiting state keeps everything and only says it has been a while.
  if (idle && (prev.state === 'needs-you' || prev.state === 'done')) replace(stateFile, JSON.stringify({ ...prev, idle: true }) + '\n')
  else {
    const body = asked ? { text: `Te pregunta: ${asked}` } : (state === 'needs-you' || state === 'done') && line ? { text: line.text } : {}
    const kind = asked ? { kind: 'question', questions: [{ question: asked, header: '', options: [], multiSelect: false }] } : details(event, state, payload, prev, lastTool)
    replace(stateFile, JSON.stringify({ state, at, ...body, ...kind, ...(idle && { idle: true }), ...(shell && { waiting: 'shell' }), ...memory, blocks, ...(turn !== undefined && { turn }) }) + '\n')
  }

  try {
    trackSubagents(home, name, event, payload, at)
  } catch {
    /* the subagent list never costs the state its write */
  }

  // W45: past each 400-line threshold the hook only claims it; F25 offers the split to the person.
  claimSize({ home, session: name, event, tool: payload?.tool_name })
} catch {
  /* a hook must never disturb Claude */
}
