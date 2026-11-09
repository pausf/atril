import { watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentState, WorkspaceView } from '../preload/api'
import { atrilHome } from './paths'
import { run as defaultRun, type Runner } from './run'
import { tmuxArgs } from './tmux'
import { listWorkspaces } from './workspaces'

export const stateDir = (): string => join(atrilHome(), 'state')

/** One notification per entry into needs-you (W15, W27). */
export const shouldNotify = (prev: AgentState | undefined, next: AgentState): boolean =>
  next === 'needs-you' && prev !== 'needs-you'

async function hookFile(session: string): Promise<{ state?: string; text?: string }> {
  try {
    return JSON.parse(await readFile(join(stateDir(), `${session}.json`), 'utf8'))
  } catch {
    /* no hook has fired yet, or the file is mid-replace */
    return {}
  }
}

async function hookState(session: string): Promise<AgentState> {
  const { state } = await hookFile(session)
  return state === 'needs-you' || state === 'working' ? state : 'working'
}

/** The agent's own words written with the state change (A4), else today's body. */
export async function notificationBody(ws: WorkspaceView): Promise<string> {
  const { text } = await hookFile(ws.session)
  return typeof text === 'string' && text ? text : `${ws.branch} te necesita`
}

// Only the agent's own pane counts (W16); a failing display means the pane or the server is gone.
async function paneDead(paneId: string, run: Runner): Promise<boolean> {
  const r = await run('tmux', [...tmuxArgs(), 'display', '-p', '-t', paneId, '#{pane_dead}'])
  return r.code !== 0 || r.stdout.trim() === '1'
}

export async function agentState(ws: WorkspaceView, run: Runner = defaultRun): Promise<AgentState> {
  if (!ws.alive || (await paneDead(ws.paneId, run))) return 'stopped'
  return hookState(ws.session)
}

export interface StatusOptions {
  run?: Runner
  onChange: (id: string, state: AgentState) => void
  notify: (ws: WorkspaceView, body: string) => void
}

export function createStatus({ run = defaultRun, onChange, notify }: StatusOptions) {
  const known = new Map<string, AgentState>()
  let busy = false
  let seeded = false
  let timer: NodeJS.Timeout | undefined
  let watcher: FSWatcher | undefined

  async function refresh(): Promise<void> {
    if (busy) return
    busy = true
    try {
      const list = await listWorkspaces(run)
      for (const ws of list) {
        const next = await agentState(ws, run)
        const prev = known.get(ws.id)
        if (prev === next) continue
        known.set(ws.id, next)
        onChange(ws.id, next)
        // The first pass only records: reopening Atril must not announce what was already waiting.
        if (seeded && shouldNotify(prev, next)) notify(ws, await notificationBody(ws))
      }
      for (const id of known.keys()) if (!list.some((w) => w.id === id)) known.delete(id)
      seeded = true
    } finally {
      busy = false
    }
  }

  return {
    refresh,
    states: (): Record<string, AgentState> => Object.fromEntries(known),
    async start(): Promise<void> {
      await mkdir(stateDir(), { recursive: true })
      watcher = watch(stateDir(), () => void refresh())
      timer = setInterval(() => void refresh(), 2000)
      await refresh()
    },
    stop(): void {
      watcher?.close()
      clearInterval(timer)
    }
  }
}
