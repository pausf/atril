import { describe, expect, it } from 'vitest'
import type { InboxGroup, InboxResult, JiraIssue } from '../preload/api'
import { nextUp } from './nextup'

const issue = (key: string): JiraIssue => ({ key, summary: key, type: 'Story', status: '', statusId: '', project: 'WEB', components: [], group: 'todo' })
const group = (id: string, ...keys: string[]): InboxGroup => ({ id, title: id, folded: false, keys })
const inbox = (groups: InboxGroup[]): InboxResult => ({ issues: groups.flatMap((g) => g.keys.map(issue)), groups })

describe('next up', () => {
  it('orders waiting agents before tasks', () => {
    const states = [
      { id: 'late', state: 'needs-you' as const, at: 500 },
      { id: 'busy', state: 'working' as const, at: 1 },
      { id: 'early', state: 'needs-you' as const, at: 100 },
      { id: 'dead', state: 'stopped' as const, at: 2 }
    ]
    // WEB-2 already has a workspace; WEB-4 sits in the second column and WEB-5 outside the board.
    const board = inbox([group('col-0', 'WEB-1', 'WEB-2', 'WEB-3'), group('col-1', 'WEB-4'), group('outside', 'WEB-5')])
    const records = [{ jiraKey: 'WEB-2' }, {}]

    expect(nextUp(states, board, records)).toEqual([
      { kind: 'agent', id: 'early' },
      { kind: 'agent', id: 'late' },
      { kind: 'task', key: 'WEB-1' },
      { kind: 'task', key: 'WEB-3' }
    ])

    // I18 (no board, or it could not be read): the «Por empezar» category stands in for the first column.
    const categories = inbox([group('todo', 'WEB-6', 'WEB-7'), group('doing', 'WEB-8')])
    expect(nextUp(states, categories, [{ jiraKey: 'WEB-7' }])).toEqual([
      { kind: 'agent', id: 'early' },
      { kind: 'agent', id: 'late' },
      { kind: 'task', key: 'WEB-6' }
    ])

    // Jira unreachable: the agents still wait for the person.
    expect(nextUp(states, { error: 'failed', message: 'x' }, [])).toEqual([
      { kind: 'agent', id: 'early' },
      { kind: 'agent', id: 'late' }
    ])
    expect(nextUp([], null, [])).toEqual([])
  })
})
