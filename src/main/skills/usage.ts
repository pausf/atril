import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { SkillsUsage, SkillUse } from '../../preload/api'
import { claudeDir } from '../paths'

const DAYS = 30
const DAY_MS = 86_400_000
const COMMAND = /<command-name>\/([^<\s]+)<\/command-name>/g

type Hit = { name: string; ts: string }
type Counted = { mtimeMs: number; size: number; hits: Hit[] }

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const blocks = (content: unknown): Record<string, unknown>[] => (Array.isArray(content) ? content.map(obj) : [])

/** K35: the names one line invokes, once each; a line Atril does not understand names nothing. */
function namesOf(line: string): Hit[] {
  if (!line.includes('"name":"Skill"') && !line.includes('<command-name>')) return []
  let row: Record<string, unknown>
  try {
    row = obj(JSON.parse(line))
  } catch {
    return []
  }
  const ts = row['timestamp']
  if (typeof ts !== 'string' || Number.isNaN(Date.parse(ts))) return []
  const content = obj(row['message'])['content']
  const names = new Set<string>()
  if (row['type'] === 'assistant') {
    for (const b of blocks(content)) {
      const skill = obj(b['input'])['skill']
      if (b['type'] === 'tool_use' && b['name'] === 'Skill' && typeof skill === 'string' && skill) names.add(skill)
    }
  } else if (row['type'] === 'user') {
    const text = typeof content === 'string' ? content : blocks(content).map((b) => (typeof b['text'] === 'string' ? b['text'] : '')).join('\n')
    for (const m of text.matchAll(COMMAND)) names.add(m[1]!)
  }
  return [...names].map((name) => ({ name, ts }))
}

async function countFile(file: string): Promise<Hit[]> {
  const hits: Hit[] = []
  const lines = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })
  for await (const line of lines) hits.push(...namesOf(line))
  return hits
}

const jsonl = async (dir: string): Promise<string[]> =>
  (await readdir(dir, { withFileTypes: true }).catch(() => [])).filter((e) => e.isFile() && e.name.endsWith('.jsonl')).map((e) => join(dir, e.name))

/** `projects/<dir>/*.jsonl` and `projects/<dir>/<session>/subagents/*.jsonl`. */
async function sessionFiles(projects: string): Promise<string[]> {
  const files: string[] = []
  for (const p of await readdir(projects, { withFileTypes: true })) {
    if (!p.isDirectory()) continue
    const dir = join(projects, p.name)
    files.push(...(await jsonl(dir)))
    for (const s of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (s.isDirectory()) files.push(...(await jsonl(join(dir, s.name, 'subagents'))))
    }
  }
  return files
}

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** K35–K39: uses per name and local day from Claude Code's sessions; counted files are kept by `mtime` and size. */
export function createUsage({ dir = claudeDir, now = () => new Date() }: { dir?: () => string; now?: () => Date } = {}) {
  const cache = new Map<string, Counted>()
  let running: Promise<SkillsUsage> | null = null

  async function readAll(): Promise<SkillsUsage> {
    const today = now()
    const since = today.getTime() - DAYS * DAY_MS
    let files: string[]
    try {
      files = await sessionFiles(join(dir(), 'projects'))
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        cache.clear()
        return { usage: {} }
      }
      return { error: e instanceof Error ? e.message : String(e) }
    }
    const seen = new Set<string>()
    const usage: Record<string, SkillUse> = {}
    for (const file of files) {
      const st = await stat(file).catch(() => null)
      if (!st || st.mtimeMs < since) continue
      seen.add(file)
      let counted = cache.get(file)
      if (!counted || counted.mtimeMs !== st.mtimeMs || counted.size !== st.size) {
        const hits = await countFile(file).catch(() => null)
        if (!hits) continue
        counted = { mtimeMs: st.mtimeMs, size: st.size, hits }
        cache.set(file, counted)
      }
      for (const { name, ts } of counted.hits) {
        const k = Math.round((startOfDay(today) - startOfDay(new Date(ts))) / DAY_MS)
        if (k < 0 || k >= DAYS) continue
        const use = (usage[name] ??= { last: ts, days: Array<number>(DAYS).fill(0) })
        use.days[k]! += 1
        if (Date.parse(ts) > Date.parse(use.last)) use.last = ts
      }
    }
    for (const file of cache.keys()) if (!seen.has(file)) cache.delete(file)
    return { usage }
  }

  return {
    read(): Promise<SkillsUsage> {
      running ??= readAll()
        .catch((e: unknown): SkillsUsage => ({ error: e instanceof Error ? e.message : String(e) }))
        .finally(() => {
          running = null
        })
      return running
    }
  }
}
