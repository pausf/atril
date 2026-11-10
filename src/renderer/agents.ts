import { useEffect, useState } from 'react'
import type { ActivityLine, AgentState, FlowStage, NextItem, WorkspaceView } from '../preload/api'

/** Every workspace's state file, following `status.onChange`. */
export function useAgentStates(): Record<string, AgentState> {
  const [states, setStates] = useState<Record<string, AgentState>>({})
  useEffect(() => {
    void window.atril.status.list().then(setStates)
    return window.atril.status.onChange((id, state) => setStates((s) => ({ ...s, [id]: state })))
  }, [])
  return states
}

/** Without a state file, a live tmux session counts as working. */
export const stateOf = (states: Record<string, AgentState>, w: WorkspaceView): AgentState => states[w.id] ?? (w.alive ? 'working' : 'stopped')

/** The newest activity line of every workspace that has one. */
export function useLatestActivity(): Record<string, ActivityLine> {
  const [latest, setLatest] = useState<Record<string, ActivityLine>>({})
  useEffect(() => {
    void window.atril.activity.latest().then(setLatest)
    return window.atril.activity.onChange((id, lines) =>
      setLatest((l) => {
        const next = { ...l }
        if (lines[0]) next[id] = lines[0]
        else delete next[id]
        return next
      })
    )
  }, [])
  return latest
}

/** One flow.get per workspace, then following onChange; a missing key means not loaded yet. */
export function useFlows(ids: string[]): Record<string, FlowStage | null> {
  const [map, setMap] = useState<Record<string, FlowStage | null>>({})
  const key = ids.join(',')
  useEffect(() => {
    let live = true
    const pushed = new Set<string>()
    for (const id of key ? key.split(',') : [])
      void window.atril.flow.get(id).then((f) => live && !pushed.has(id) && setMap((m) => ({ ...m, [id]: f })))
    const off = window.atril.flow.onChange((id, f) => {
      pushed.add(id)
      setMap((m) => ({ ...m, [id]: f }))
    })
    return () => {
      live = false
      off()
    }
  }, [key])
  return map
}

/** W81: needs-you in N1 order, then working by latest activity, then stopped (paused included) by branch; ties by id. */
export function overviewOrder(
  workspaces: WorkspaceView[],
  states: Record<string, AgentState>,
  latest: Record<string, ActivityLine>,
  next: NextItem[]
): WorkspaceView[] {
  const RANK: Record<AgentState, number> = { 'needs-you': 0, working: 1, paused: 2, stopped: 2 }
  const waited = (id: string): number => {
    const i = next.findIndex((n) => n.kind === 'agent' && n.id === id)
    return i < 0 ? Infinity : i
  }
  return [...workspaces].sort((a, b) => {
    const sa = stateOf(states, a)
    const sb = stateOf(states, b)
    // A paused agent sits with the stopped ones (W86).
    if (RANK[sa] !== RANK[sb]) return RANK[sa] - RANK[sb]
    const by =
      sa === 'needs-you'
        ? waited(a.id) - waited(b.id)
        : sa === 'working'
          ? (latest[b.id]?.at ?? -Infinity) - (latest[a.id]?.at ?? -Infinity)
          : a.branch.localeCompare(b.branch)
    // Infinity - Infinity is NaN: both unknown counts as a tie.
    return (by || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  })
}
