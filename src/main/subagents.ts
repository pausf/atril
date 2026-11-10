import { watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SubagentEntry } from '../preload/api'
import { atrilHome } from './paths'
import { readRecords } from './workspaces'

export const subagentsDir = (): string => join(atrilHome(), 'subagents')
export const subagentsFile = (session: string): string => join(subagentsDir(), `${session}.json`)

/** An entry as the hook stores it: the transcript path never leaves main. */
export type StoredSubagent = SubagentEntry & { transcript?: string }

const MAX_DESCRIPTION = 120

/** The entries only, never a leftover pending queue; null when the file is unreadable (a foreign or half-written one). */
export async function readSubagents(session: string): Promise<StoredSubagent[] | null> {
  let raw: string
  try {
    raw = await readFile(subagentsFile(session), 'utf8')
  } catch {
    return []
  }
  try {
    const { entries } = JSON.parse(raw) as { entries?: Partial<StoredSubagent>[] }
    return (Array.isArray(entries) ? entries : []).flatMap((e) =>
      typeof e.id === 'string' && typeof e.type === 'string' && typeof e.startedAt === 'number'
        ? [
            {
              id: e.id,
              type: e.type,
              startedAt: e.startedAt,
              ...(typeof e.description === 'string' && { description: e.description }),
              ...(typeof e.transcript === 'string' && { transcript: e.transcript }),
              ...(typeof e.endedAt === 'number' && { endedAt: e.endedAt })
            }
          ]
        : []
    )
  } catch {
    return null
  }
}

async function metaDescription(transcript: string): Promise<string | undefined> {
  try {
    const { description } = JSON.parse(await readFile(transcript.replace(/\.jsonl$/, '.meta.json'), 'utf8')) as { description?: unknown }
    return typeof description === 'string' ? description.replace(/\s+/g, ' ').trim().slice(0, MAX_DESCRIPTION) : undefined
  } catch {
    return undefined
  }
}

export interface SubagentsOptions {
  emit: (id: string, entries: SubagentEntry[]) => void
}

export function createSubagents({ emit }: SubagentsOptions) {
  // Compared by content: an endedAt flip changes neither the length nor the ids.
  const known = new Map<string, string>()
  // A description never changes once written; a missing meta is not cached, so it is read again.
  const descriptions = new Map<string, string>()
  let watcher: FSWatcher | undefined

  async function toWindow(entries: StoredSubagent[]): Promise<SubagentEntry[]> {
    return Promise.all(
      entries.map(async ({ transcript, description, ...e }) => {
        if (transcript === undefined) return { ...e, ...(description !== undefined && { description }) }
        let d = descriptions.get(transcript)
        if (d === undefined) {
          d = await metaDescription(transcript)
          if (d !== undefined) descriptions.set(transcript, d)
        }
        return { ...e, ...(d !== undefined && { description: d }) }
      })
    )
  }

  // ponytail: rereads every record per watch event; filter by the event's filename if bursts get heavy.
  async function refresh(): Promise<void> {
    for (const ws of await readRecords()) {
      const stored = await readSubagents(ws.session)
      if (!stored) continue
      const entries = await toWindow(stored)
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
      const stored = ws && (await readSubagents(ws.session))
      return stored ? toWindow(stored) : []
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
