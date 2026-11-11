import { watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ActivityLine } from '../preload/api'
import { atrilHome } from './paths'
import { run as defaultRun, type Runner } from './run'
import { listWorkspaces } from './workspaces'

export const activityDir = (): string => join(atrilHome(), 'activity')

/** Newest first; a half-written or foreign line is skipped, never thrown. */
export async function readActivity(session: string): Promise<ActivityLine[]> {
  let raw: string
  try {
    raw = await readFile(join(activityDir(), `${session}.jsonl`), 'utf8')
  } catch {
    return []
  }
  const lines: ActivityLine[] = []
  for (const l of raw.split('\n')) {
    try {
      const v = JSON.parse(l) as Partial<ActivityLine>
      if (typeof v.at === 'number' && typeof v.kind === 'string' && typeof v.text === 'string') {
        lines.push({ at: v.at, kind: v.kind as ActivityLine['kind'], text: v.text })
      }
    } catch {
      /* skip */
    }
  }
  return lines.reverse()
}

export interface ActivityOptions {
  run?: Runner
  emit: (id: string, lines: ActivityLine[]) => void
}

export function createActivity({ run = defaultRun, emit }: ActivityOptions) {
  const known = new Map<string, ActivityLine[]>()
  let watcher: FSWatcher | undefined

  async function refresh(): Promise<void> {
    for (const ws of await listWorkspaces(run)) {
      const lines = await readActivity(ws.session)
      const prev = known.get(ws.id)
      if (prev?.[0]?.at === lines[0]?.at && prev?.[0]?.text === lines[0]?.text && prev?.length === lines.length) continue
      known.set(ws.id, lines)
      emit(ws.id, lines)
    }
  }

  return {
    refresh,
    get: async (id: string): Promise<ActivityLine[]> => {
      const ws = (await listWorkspaces(run)).find((w) => w.id === id)
      return ws ? readActivity(ws.session) : []
    },
    latest: async (): Promise<Record<string, ActivityLine>> => {
      const out: Record<string, ActivityLine> = {}
      for (const ws of await listWorkspaces(run)) {
        const first = (await readActivity(ws.session))[0]
        if (first) out[ws.id] = first
      }
      return out
    },
    async start(): Promise<void> {
      await mkdir(activityDir(), { recursive: true })
      // Like the watcher's: a damaged workspaces.json (W145) must not reject the app's start.
      await refresh().catch(() => undefined)
      watcher = watch(activityDir(), () => void refresh().catch(() => undefined))
    },
    stop(): void {
      watcher?.close()
    }
  }
}
