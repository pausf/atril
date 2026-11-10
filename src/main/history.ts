import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { HistoryEntry, WorkspaceRecord } from '../preload/api'
import { createCost } from './cost'
import { stageOf } from './flow/stage'
import { atrilHome } from './paths'
import type { Runner } from './run'

const KEEP = 200
const SHOWN = 20
const file = (): string => join(atrilHome(), 'history.jsonl')

/** W95: read before the removal starts, while the folder and the transcript list still exist. */
export async function historyEntry(rec: WorkspaceRecord, run: Runner): Promise<HistoryEntry> {
  const flow = await stageOf(rec.path, rec.baseCommit, run).catch(() => null)
  return {
    branch: rec.branch,
    repoId: rec.repoId,
    ...(rec.jiraKey && { jiraKey: rec.jiraKey }),
    mode: rec.mode,
    ...(flow && { stage: flow.stage }),
    ...(flow?.change && { change: flow.change }),
    ...(rec.createdAt !== undefined && { createdAt: rec.createdAt }),
    closedAt: 0,
    cost: await createCost({ emit: () => {} })
      .forSession(rec.session)
      .then((t) => t && { tokens: t.tokens, usd: t.usd, unpriced: t.unpriced })
      .catch(() => null)
  }
}

const readLines = async (): Promise<string[]> => (await readFile(file(), 'utf8').catch(() => '')).split('\n').filter(Boolean)

// Two removals at once must not both read the old file and lose a line.
let queue: Promise<unknown> = Promise.resolve()

export function appendHistory(entry: HistoryEntry): Promise<void> {
  const next = queue.then(async () => {
    const lines = [...(await readLines()), JSON.stringify({ ...entry, closedAt: Math.floor(Date.now() / 1000) })].slice(-KEEP)
    await mkdir(atrilHome(), { recursive: true })
    const temp = `${file()}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temp, lines.join('\n') + '\n')
    await rename(temp, file())
  })
  queue = next.catch(() => undefined)
  return next
}

/** W96: newest first; a line that does not parse is skipped. */
export async function readHistory(): Promise<HistoryEntry[]> {
  const out: HistoryEntry[] = []
  for (const line of (await readLines()).reverse()) {
    if (out.length === SHOWN) break
    try {
      const e = JSON.parse(line) as HistoryEntry
      if (e && typeof e.branch === 'string' && typeof e.closedAt === 'number') out.push(e)
    } catch {
      continue
    }
  }
  return out
}
