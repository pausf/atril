import { watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ActivityLine } from '../preload/api'
import { atrilHome } from './paths'
import { run as defaultRun, type Runner } from './run'
import { listWorkspacesOrNone } from './workspaces'
import { burst } from './burst'
import { decidedLine, stateDir, waitingLine } from './status'

export const activityDir = (): string => join(atrilHome(), 'activity')

/** Newest first; a half-written or foreign line is skipped, never thrown. W199 puts «Esperando a un subagente» on top while it holds. */
export async function readActivity(session: string): Promise<ActivityLine[]> {
  const waiting = await waitingLine(session)
  const lines = await readLines(session)
  const top = waiting ?? (await decidedLine(session, lines[0]))
  return top ? [{ ...top, kind: waiting ? 'agent' : 'says' }, ...lines] : lines
}

export async function readLines(session: string): Promise<ActivityLine[]> {
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
  let states: FSWatcher | undefined

  async function refresh(): Promise<void> {
    for (const ws of await listWorkspacesOrNone(run)) {
      const lines = await readActivity(ws.session)
      const prev = known.get(ws.id)
      if (prev?.[0]?.at === lines[0]?.at && prev?.[0]?.text === lines[0]?.text && prev?.length === lines.length) continue
      known.set(ws.id, lines)
      emit(ws.id, lines)
    }
  }

  const api = {
    refresh,
    get: async (id: string): Promise<ActivityLine[]> => {
      const ws = (await listWorkspacesOrNone(run)).find((w) => w.id === id)
      return ws ? readActivity(ws.session) : []
    },
    latest: async (): Promise<Record<string, ActivityLine>> => {
      const out: Record<string, ActivityLine> = {}
      for (const ws of await listWorkspacesOrNone(run)) {
        const first = (await readActivity(ws.session))[0]
        if (first) out[ws.id] = first
      }
      return out
    },
    async start(): Promise<void> {
      await mkdir(activityDir(), { recursive: true })
      // Like the watcher's: a damaged workspaces.json (W145) must not reject the app's start.
      await refresh().catch(() => undefined)
      watcher = watch(activityDir(), poke)
      // W199: a turn end that waits on a subagent changes the line without a new activity write.
      await mkdir(stateDir(), { recursive: true })
      states = watch(stateDir(), poke)
    },
    stop(): void {
      watcher?.close()
      states?.close()
      poke.cancel()
    }
  }
  // Through `api` so a test can count what a burst of activity writes costs.
  const poke = burst(() => void api.refresh().catch(() => undefined))
  return api
}
