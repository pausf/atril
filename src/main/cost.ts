import { open, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { WorkCost } from '../preload/api'
import { atrilHome } from './paths'
import { LONG_PROMPT, priceOf } from './prices'
import { readRecordsOrNone } from './workspaces'

export interface Usage {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

export interface Totals extends WorkCost {
  models: Record<string, Usage>
}

/** W92: the hook lists here every transcript the session has used, one path per line. */
export const transcriptsFile = (session: string): string => join(atrilHome(), 'transcripts', session)

interface Work {
  /** Bytes already read per file, always at a line's end. */
  offsets: Map<string, number>
  /** One entry per message id: Claude Code repeats a message's usage on each of its lines. */
  messages: Map<string, { model: string; usage: Usage }>
  anonymous: number
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/** The complete lines after `from`, or null when the file shrank (rewritten: start over). */
async function readNew(file: string, from: number): Promise<{ text: string; next: number } | null> {
  const fh = await open(file, 'r')
  try {
    const { size } = await fh.stat()
    if (size < from) return null
    const buf = Buffer.alloc(size - from)
    await fh.read(buf, 0, buf.length, from)
    const end = buf.lastIndexOf(10) + 1
    return { text: buf.subarray(0, end).toString('utf8'), next: from + end }
  } finally {
    await fh.close()
  }
}

function take(work: Work, text: string): void {
  for (const line of text.split('\n')) {
    let message: { id?: unknown; model?: unknown; usage?: Record<string, unknown> } | undefined
    try {
      message = (JSON.parse(line) as { message?: typeof message })?.message
    } catch {
      continue
    }
    const u = message?.usage
    if (!message || !u || typeof u !== 'object') continue
    // Without an id there is nothing to deduplicate by: each such line counts once.
    const id = typeof message.id === 'string' ? message.id : `#${work.anonymous++}`
    work.messages.set(id, {
      model: typeof message.model === 'string' ? message.model : '',
      usage: { input: n(u['input_tokens']), output: n(u['output_tokens']), cacheWrite: n(u['cache_creation_input_tokens']), cacheRead: n(u['cache_read_input_tokens']) }
    })
  }
}

// Priced message by message: a long-prompt tier depends on each request, not on the model's total.
function total(work: Work): Totals {
  const models: Record<string, Usage> = {}
  let tokens = 0
  let usd: number | null = null
  const unpriced = new Set<string>()
  for (const { model, usage: u } of work.messages.values()) {
    const m = (models[model] ??= { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 })
    m.input += u.input
    m.output += u.output
    m.cacheWrite += u.cacheWrite
    m.cacheRead += u.cacheRead
    tokens += u.input + u.output + u.cacheWrite + u.cacheRead
    const base = priceOf(model)
    if (!base) {
      unpriced.add(model)
      continue
    }
    const p = base.long && u.input + u.cacheWrite + u.cacheRead > LONG_PROMPT ? base.long : base
    usd = (usd ?? 0) + (u.input * p.input + u.output * p.output + u.cacheWrite * p.input * 1.25 + u.cacheRead * (p.cacheRead ?? p.input * 0.1)) / 1e6
  }
  return { tokens, usd, unpriced: [...unpriced], models }
}

const POLL_MS = 30_000

export interface CostOptions {
  emit: (id: string, cost: WorkCost | null) => void
}

/** W93: each workspace's usage over its transcripts and their subagents', reading only what was appended since. */
export function createCost({ emit }: CostOptions) {
  const works = new Map<string, Work>()
  const known = new Map<string, string>()
  let timer: NodeJS.Timeout | undefined
  // One read at a time: the poll and a window's `get` must not both read from the same offset.
  let queue: Promise<unknown> = Promise.resolve()
  const forSession = (session: string): Promise<Totals | null> => {
    const next = queue.then(() => readSession(session))
    queue = next.catch(() => undefined)
    return next
  }

  async function readSession(session: string): Promise<Totals | null> {
    const raw = await readFile(transcriptsFile(session), 'utf8').catch(() => '')
    const transcripts = raw.split('\n').filter((p) => p.endsWith('.jsonl'))
    if (transcripts.length === 0) return null
    let work = works.get(session)
    if (!work) works.set(session, (work = { offsets: new Map(), messages: new Map(), anonymous: 0 }))
    for (const transcript of transcripts) {
      const dir = join(transcript.slice(0, -'.jsonl'.length), 'subagents')
      const subs = await readdir(dir).catch(() => [] as string[])
      for (const file of [transcript, ...subs.filter((f) => f.endsWith('.jsonl')).map((f) => join(dir, f))]) {
        const got = await readNew(file, work.offsets.get(file) ?? 0).catch(() => undefined)
        if (got === null) {
          works.delete(session)
          return readSession(session)
        }
        if (!got) continue
        take(work, got.text)
        work.offsets.set(file, got.next)
      }
    }
    return total(work)
  }

  const view = (t: Totals | null): WorkCost | null => t && { tokens: t.tokens, usd: t.usd, unpriced: t.unpriced }

  async function refresh(): Promise<void> {
    for (const ws of await readRecordsOrNone()) {
      const cost = view(await forSession(ws.session))
      const body = JSON.stringify(cost)
      if (body === (known.get(ws.id) ?? 'null')) continue
      known.set(ws.id, body)
      emit(ws.id, cost)
    }
  }

  return {
    forSession,
    refresh,
    get: async (id: string): Promise<WorkCost | null> => {
      const ws = (await readRecordsOrNone()).find((w) => w.id === id)
      return ws ? view(await forSession(ws.session)) : null
    },
    start(): void {
      void refresh().catch(() => undefined)
      timer = setInterval(() => void refresh().catch(() => undefined), POLL_MS)
    },
    stop(): void {
      clearInterval(timer)
    }
  }
}
