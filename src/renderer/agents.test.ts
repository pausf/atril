import { describe, expect, it } from 'vitest'
import type { ActivityLine, AgentState } from '../preload/api'
import { overviewOrder, stateOf } from './agents'
import { workspace } from './mockApi'

describe('overviewOrder', () => {
  it('done sorts with working', () => {
    const ws = [workspace('a', 'A', true), workspace('b', 'B', true), workspace('c', 'C', true), workspace('d', 'D', true)]
    const states: Record<string, AgentState> = { a: 'stopped', b: 'done', c: 'working', d: 'needs-you' }
    const line = (at: number): ActivityLine => ({ at, text: 'x', kind: 'says' }) as ActivityLine
    // Ties between done and working go by latest activity: c (newer) before b.
    expect(overviewOrder(ws, states, { b: line(1), c: line(2) }, []).map((w) => w.id)).toEqual(['d', 'c', 'b', 'a'])
    expect(overviewOrder(ws, states, { b: line(3), c: line(2) }, []).map((w) => w.id)).toEqual(['d', 'b', 'c', 'a'])
  })
  it('a merged work counts as done', () => {
    const w = { ...workspace('a', 'A', true), merged: true as const }
    expect(stateOf({ a: 'needs-you' }, w)).toBe('done')
    expect(stateOf({}, { ...w, alive: false })).toBe('done')
    expect(stateOf({ a: 'needs-you' }, workspace('a', 'A', true))).toBe('needs-you')
  })
})
