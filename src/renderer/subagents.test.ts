// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SubagentEntry } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const run = (id: string): SubagentEntry => ({ id, type: 'explorer', startedAt: 10 })
const done = (id: string): SubagentEntry => ({ id, type: 'explorer', startedAt: 10, endedAt: 20 })
const subs = (branch: string): string | null =>
  Array.from(document.querySelectorAll('.ws-item'))
    .find((i) => i.querySelector('.ws-branch')?.textContent === branch)
    ?.querySelector('.ws-subs')?.textContent ?? null

describe('subagents', () => {
  it('the row counts running subagents', async () => {
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false), workspace('aaaaaaa2', 'PF-2', false), workspace('aaaaaaa3', 'PF-3', false)],
      subagents: { aaaaaaa1: [run('a'), done('b'), run('c')], aaaaaaa2: [run('d')], aaaaaaa3: [done('e')] }
    })
    render(createElement(App))
    await screen.findByText('PF-3')

    // `get` resolves after the rows render, so wait for it.
    await waitFor(() => expect([subs('PF-1'), subs('PF-2'), subs('PF-3')]).toEqual(['2 subagentes', '1 subagente', null]))

    // Live: the same ids ending (an endedAt flip) clears the count; a new run shows up.
    act(() => {
      api.pushSubagents('aaaaaaa1', [done('a'), done('b'), done('c')])
      api.pushSubagents('aaaaaaa3', [done('e'), run('f')])
    })
    expect([subs('PF-1'), subs('PF-2'), subs('PF-3')]).toEqual([null, '1 subagente', '1 subagente'])
  })
})
