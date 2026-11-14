// Pure: turns one Claude Code hook payload into one short line. Nothing here may return file
// contents, command output or a whole prompt: only names, short prefixes and the agent's own words.
import { basename } from 'node:path'

const LINE = 200
const PROMPT = 80
const COMMAND = 60

const flat = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const done = (kind, text) => ({ kind, text: clip(text, LINE) })

const file = (input) => basename(flat(input?.file_path ?? input?.notebook_path))

const TOOLS = {
  AskUserQuestion: (i) => ({ kind: 'asks', text: `Te pregunta: ${flat(i?.questions?.[0]?.question) || 'Claude te necesita'}` }),
  Read: (i) => ({ kind: 'read', text: `Leyendo ${file(i)}` }),
  Edit: (i) => ({ kind: 'edit', text: `Editando ${file(i)}` }),
  MultiEdit: (i) => ({ kind: 'edit', text: `Editando ${file(i)}` }),
  Write: (i) => ({ kind: 'edit', text: `Escribiendo ${file(i)}` }),
  Bash: (i) => ({ kind: 'run', text: `Ejecutando ${flat(i?.command).slice(0, COMMAND)}` }),
  Grep: (i) => ({ kind: 'search', text: `Buscando ${flat(i?.pattern)}` }),
  Glob: (i) => ({ kind: 'search', text: `Buscando ${flat(i?.pattern)}` }),
  Task: (i) => ({ kind: 'agent', text: `Lanzando un subagente: ${clip(flat(i?.description), 80)}` }),
  Agent: (i) => ({ kind: 'agent', text: `Lanzando un subagente: ${clip(flat(i?.description), 80)}` })
}

// Claude reports a failed command as a non-zero code, an error or an interruption, whichever it has.
function failed(response) {
  if (!response || typeof response !== 'object') return false
  const code = response.exit_code ?? response.exitCode
  return (typeof code === 'number' && code !== 0) || Boolean(response.error) || response.interrupted === true}

// The tail may start mid-line, and one assistant turn spans several entries: take the newest one that has text.
function lastSaid(tail) {
  const lines = tail.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try {
      entry = JSON.parse(lines[i])
    } catch {
      continue
    }
    const msg = entry?.message
    if ((msg?.role ?? entry?.type) !== 'assistant') continue
    const content = msg?.content
    const text = flat(
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.filter((b) => b?.type === 'text').map((b) => b.text).join(' ')
          : ''
    )
    if (text) return text
  }
  return ''
}

/** @returns {{kind: string, text: string} | null} null when the event leaves no line. */
export function summarise(event, payload, readTranscriptTail) {
  const p = payload && typeof payload === 'object' ? payload : {}
  switch (event) {
    case 'UserPromptSubmit': {
      const prompt = flat(p.prompt).slice(0, PROMPT)
      return prompt ? done('prompt', `Le has escrito: ${prompt}`) : null
    }
    case 'PreToolUse': {
      const name = flat(p.tool_name)
      if (!name) return null
      const line = TOOLS[name]?.(p.tool_input)
      return line ? done(line.kind, line.text) : done('tool', name)
    }
    case 'PostToolUse': {
      if (p.tool_name !== 'Bash' || !failed(p.tool_response)) return null
      return done('fail', `✗ ${flat(p.tool_input?.command).slice(0, COMMAND)} falló`)
    }
    case 'Notification': {
      // W203: Claude Code's own English wait messages never reach the person.
      const message = flat(p.message)
      const tool = /^Claude needs your permission to use (.+)$/i.exec(message)
      if (tool) return done('asks', `Te pregunta: ¿Puede usar ${tool[1]}?`)
      if (/^Claude needs your permission/i.test(message) || p.notification_type === 'permission_prompt') return done('asks', 'Te pregunta: ¿Puede seguir?')
      if (!message || /waiting for your input/i.test(message)) return done('asks', 'Claude te necesita')
      return done('asks', `Te pregunta: ${message}`)
    }
    case 'Stop': {
      let said = ''
      try {
        said = typeof p.transcript_path === 'string' ? lastSaid(readTranscriptTail(p.transcript_path)) : ''
      } catch {
        /* unreadable transcript: fall back */
      }
      return done('says', said ? `Claude dice: ${said}` : 'Claude ha terminado')
    }
    default:
      return null
  }
}
