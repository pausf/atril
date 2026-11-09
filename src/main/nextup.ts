import type { AgentState, InboxResult, NextItem } from '../preload/api'

export interface AgentSnapshot {
  id: string
  state: AgentState
  /** The state file's `at`: when the agent entered this state. */
  at: number
}

/** N1: agents waiting for the person (oldest first), then tasks with no open workspace from «por empezar». */
export function nextUp(states: AgentSnapshot[], inbox: InboxResult | null, records: Array<{ jiraKey?: string }>): NextItem[] {
  const agents = states
    .filter((s) => s.state === 'needs-you')
    .sort((a, b) => a.at - b.at)
    .map((s): NextItem => ({ kind: 'agent', id: s.id }))
  if (!inbox || 'error' in inbox) return agents

  // A board's first column keeps the id col-0 even when empty ones are dropped; without a board (or after I18) it is «Por empezar».
  const board = inbox.groups.some((g) => g.id.startsWith('col-'))
  const first = inbox.groups.find((g) => g.id === (board ? 'col-0' : 'todo'))
  const open = new Set(records.flatMap((r) => (r.jiraKey ? [r.jiraKey] : [])))
  const tasks = (first?.keys ?? []).filter((k) => !open.has(k)).map((key): NextItem => ({ kind: 'task', key }))
  return [...agents, ...tasks]
}
