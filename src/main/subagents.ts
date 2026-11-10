import { watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SubagentEntry } from '../preload/api'
import { atrilHome } from './paths'
import { readRecords } from './workspaces'

export const subagentsDir = (): string => join(atrilHome(), 'subagents')
export const subagentsFile = (session: string): string => join(subagentsDir(), `${session}.json`)

/** The entries only, never the pending queue; null when the file is unreadable (a foreign or half-written one). */
export async function readSubagents(session: string): Promise<SubagentEntry[] | null> {
  let raw: string
  try {
    raw = await readFile(subagentsFile(session), 'utf8')
  } catch {
    return []
  }
  try {
    const { entries } = JSON.parse(raw) as { entries?: Partial<SubagentEntry>[] }
    return (Array.isArray(entries) ? entries : []).flatMap((e) =>
      typeof e.id === 'string' && typeof e.type === 'string' && typeof e.startedAt === 'number'
        ? [{ id: e.id, type: e.type, startedAt: e.startedAt, ...(typeof e.description === 'string' && { description: e.description }), ...(typeof e.endedAt === 'number' && { endedAt: e.endedAt }) }]
        : []
    )
  } catch {
    return null
  }
}

export interface SubagentsOptions {
  emit: (id: string, entries: SubagentEntry[]) => void
}

export function createSubagents({ emit }: SubagentsOptions) {
  // Compared by content: an endedAt flip changes neither the length nor the ids.
  const known = new Map<string, string>()
  let watcher: FSWatcher | undefined

  // ponytail: rereads every record per watch event; filter by the event's filename if bursts get heavy.
  async function refresh(): Promise<void> {
    for (const ws of await readRecords()) {
      const entries = await readSubagents(ws.session)
      if (!entries) continue
      const body = JSON.stringify(entries)
      if (body === (known.get(ws.id) ?? '[]')) continue
      known.set(ws.id, body)
      emit(ws.id, entries)
    }
  }

  return {
    refresh,
    get: async (id: string): Promise<SubagentEntry[]> => {
      const ws = (await readRecords()).find((w) => w.id === id)
      return (ws && (await readSubagents(ws.session))) || []
    },
    async start(): Promise<void> {
      await mkdir(subagentsDir(), { recursive: true })
      await refresh()
      watcher = watch(subagentsDir(), () => void refresh().catch(() => undefined))
    },
    stop(): void {
      watcher?.close()
    }
  }
}
