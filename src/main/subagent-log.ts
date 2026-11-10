import type { SubagentLine } from '../preload/api'

// W69: Claude Code's transcript format is internal and undocumented; every field is checked by type and anything else is skipped.
const ARG_KEYS = ['file_path', 'command', 'pattern', 'url', 'description', 'skill', 'prompt']
const MAX_ARG = 80
const RESULT_LINES = 3
const MAX_LINES = 500

type Block = { type?: unknown; text?: unknown; name?: unknown; input?: unknown; content?: unknown }

const blocks = (content: unknown): Block[] => (Array.isArray(content) ? content.filter((b): b is Block => !!b && typeof b === 'object') : [])

function tool(b: Block): string {
  const name = String(b.name)
  const input = (b.input && typeof b.input === 'object' ? b.input : {}) as Record<string, unknown>
  const arg = ARG_KEYS.map((k) => input[k]).find((v): v is string => typeof v === 'string')
  return arg === undefined ? name : `${name}(${arg.replace(/\s+/g, ' ').trim().slice(0, MAX_ARG)})`
}

function result(content: unknown): SubagentLine {
  const all = typeof content === 'string' ? content : blocks(content).flatMap((b) => (b.type === 'text' && typeof b.text === 'string' ? [b.text] : [])).join('\n')
  const lines = all.trimEnd().split('\n')
  const more = lines.length - RESULT_LINES
  return { kind: 'result', text: lines.slice(0, RESULT_LINES).join('\n'), ...(more > 0 && { more }) }
}

export function parseSubagentLog(text: string): SubagentLine[] {
  const out: SubagentLine[] = []
  let prompted = false
  for (const raw of text.split('\n')) {
    let v: { type?: unknown; message?: { content?: unknown } }
    try {
      v = JSON.parse(raw)
    } catch {
      continue
    }
    const content = v?.message?.content
    if (v?.type === 'user') {
      const first = typeof content === 'string' ? content : blocks(content).find((b) => b.type === 'text' && typeof b.text === 'string')?.text
      if (!prompted && typeof first === 'string') {
        prompted = true
        out.push({ kind: 'prompt', text: first.split('\n').slice(0, RESULT_LINES).join('\n') })
      }
      for (const b of blocks(content)) if (b.type === 'tool_result') out.push(result(b.content))
    } else if (v?.type === 'assistant') {
      for (const b of blocks(content)) {
        if (b.type === 'text' && typeof b.text === 'string') out.push({ kind: 'text', text: b.text })
        else if (b.type === 'tool_use' && typeof b.name === 'string') out.push({ kind: 'tool', text: tool(b) })
        else if (b.type === 'thinking') out.push({ kind: 'thinking', text: '' })
      }
    }
  }
  return out.slice(-MAX_LINES)
}
