import { describe, expect, it } from 'vitest'
import type { RunResult, Runner } from '../run'
import { JQL, QUERY, readInbox } from './inbox'

const ok = (stdout: string): RunResult => ({ code: 0, stdout, stderr: '' })
const PROJECTS = 'KEY\tNAME\tTYPE\tLEAD\nPF\tProject F\tclassic\tNobody\nZZ\tProject Z\tclassic\tNobody\n'
const EMPTY: RunResult = { code: 1, stdout: '', stderr: '✗ No result found for given query in project "ZZ"' }

// Shape of `jira issue list --raw` (key + flattened fields), with invented content.
const RAW = JSON.stringify([
  {
    key: 'PF-2',
    fields: {
      summary: 'Fix the cart total',
      issueType: { id: '10', name: 'Bug', subtask: false },
      status: { name: 'In Progress' },
      components: [{ name: 'checkout' }],
      assignee: { displayName: 'Ada' },
      labels: []
    }
  },
  {
    key: 'PF-1',
    fields: {
      summary: 'Add a filter',
      issueType: { id: '11', name: 'Story', subtask: false },
      status: { name: 'To Do' },
      components: [],
      labels: ['x']
    }
  }
])

describe('inbox', () => {
  it('queries my open sprint issues', async () => {
    const calls: string[][] = []
    const fake: Runner = async (_cmd, args) => {
      calls.push(args)
      return args[0] === 'project' ? ok(PROJECTS) : EMPTY
    }

    await readInbox(fake)

    // One call for every project: the scope the CLI prepends is escaped with OR.
    expect(calls).toEqual([['issue', 'list', '--raw', '--jql', QUERY]])
    expect(JQL).toBe('assignee = currentUser() AND sprint in openSprints() AND statusCategory != Done')
    expect(QUERY).toBe(`statusCategory = Done AND statusCategory != Done OR (${JQL})`)
    expect(calls.flat()).not.toContain('--plain')
  })

  it('parses issues from raw json', async () => {
    const fake: Runner = async (_cmd, args) => {
      if (args[0] === 'project') return ok(PROJECTS)
      return ok(RAW)
    }

    const r = await readInbox(fake)

    expect(r).toEqual({
      issues: [
        { key: 'PF-1', summary: 'Add a filter', type: 'Story', status: 'To Do', project: 'PF', components: [] },
        { key: 'PF-2', summary: 'Fix the cart total', type: 'Bug', status: 'In Progress', project: 'PF', components: ['checkout'] }
      ]
    })
  })

  it('unconfigured jira asks the person to run jira init', async () => {
    const calls: string[][] = []
    const fake: Runner = async (_cmd, args) => {
      calls.push(args)
      return { code: 1, stdout: '', stderr: 'Error: missing credentials' }
    }

    const r = await readInbox(fake)

    expect(r).toEqual({ error: 'unconfigured', message: 'Ejecuta `jira init` en tu terminal' })
    expect(calls.flat().some((a) => /token|JIRA_API_TOKEN|^Basic |^Bearer /i.test(a))).toBe(false)
  })

  it('tells the person how to install a missing jira', async () => {
    const fake: Runner = async () => ({ code: 127, stdout: '', stderr: 'spawn jira ENOENT' })
    expect(await readInbox(fake)).toEqual({ error: 'missing', install: 'brew install ankitpokhrel/jira-cli/jira-cli' })
  })
})
