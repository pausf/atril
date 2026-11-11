// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowBox, FlowBoxes, FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const file = (path: string, added: number, removed: number) => ({ path, status: 'M' as const, added, removed })
const pending = (index: number, text: string): FlowBox => ({ index, text, state: 'pending' })
const boxes: FlowBoxes = {
  total: 40,
  boxes: [
    { index: 0, text: 'ranges in main', state: 'closed', commit: 'a1b2c3d', files: [file('src/a.ts', 3, 1)] },
    { index: 1, text: 'the steps', state: 'closed', commit: 'e4f5a6b', files: [file('src/b.ts', 2, 0), file('src/c.ts', 1, 1)] },
    { index: 2, text: 'the timeline', state: 'current', files: [file('src/d.ts', 5, 0), file('src/e.ts', 7, 2)] },
    pending(3, 'ampliar'),
    pending(4, 'menu'),
    pending(5, 'photo'),
    pending(6, 'novedades'),
    pending(7, 'tidy')
  ]
}
const building: FlowStage = { stage: 'construir', change: 'add-x', others: [], checklist: { file: 'proposal.md', closed: 2, total: 8, firstOpen: 'the timeline' } }
const DIFF = 'diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1,2 +1,2 @@\n uno\n-dos\n+DOS <script>alert(1)</script>\n'

async function boot(flow: FlowStage, data: FlowBoxes = boxes) {
  const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow, boxes: data, boxDiff: DIFF })
  const user = vi.isFakeTimers() ? userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) }) : userEvent.setup()
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
  return { api, user }
}
const timeline = (): HTMLElement => screen.getByRole('list', { name: 'Casillas del checklist' })

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('boxes timeline', () => {
  it('the checklist shows each box with its code', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { api, user } = await boot(building)
    await screen.findByRole('list', { name: 'Casillas del checklist' })

    // Closed boxes folded (buttons), the current one open, the first 3 pending greyed and «+2 más» for the rest.
    const rows = Array.from(timeline().children)
    expect(rows.map((r) => r.className.split(' ').filter((c) => ['d', 'c', 'p'].includes(c)).join(''))).toEqual(['d', 'd', 'c', 'p', 'p', 'p', ''])
    expect(rows.at(-1)!.textContent).toBe('+2 más')
    expect(within(timeline()).queryByText('photo')).not.toBeNull()
    expect(within(timeline()).queryByText('novedades')).toBeNull()
    const closed = within(timeline()).getByRole('button', { name: /ranges in main/ })
    expect(closed.getAttribute('aria-expanded')).toBe('false')
    expect(within(timeline()).queryByRole('button', { name: /src\/a\.ts/ })).toBeNull()

    // The current box shows its files and the diff of its first file, as text.
    const now = rows[2] as HTMLElement
    await vi.waitFor(() => expect(now.querySelector('.dadd')?.textContent).toBe('+DOS <script>alert(1)</script>'))
    expect(now.querySelector('script')).toBeNull()
    expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 2, 'src/d.ts')
    expect(within(now).getByRole('button', { name: /e\.ts.*\+7.*−2/ })).toBeTruthy()
    await user.click(within(now).getByRole('button', { name: /e\.ts/ }))
    expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 2, 'src/e.ts')

    // A closed box opens on press with its files and diff, and folds again.
    await user.click(closed)
    expect(closed.getAttribute('aria-expanded')).toBe('true')
    expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 0, 'src/a.ts')
    expect(within(rows[0] as HTMLElement).getByRole('button', { name: /a\.ts.*\+3.*−1/ })).toBeTruthy()
    await user.click(closed)
    expect(closed.getAttribute('aria-expanded')).toBe('false')

    // Asked again every 3 s while it shows, and the live box's diff follows; a request that does not answer holds the ticks back.
    const asked = vi.mocked(api.flowApi.boxes)
    const before = asked.mock.calls.length
    const diffs = vi.mocked(api.flowApi.boxDiff).mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(asked.mock.calls.length).toBe(before + 1)
    await vi.waitFor(() => expect(vi.mocked(api.flowApi.boxDiff).mock.calls.length).toBeGreaterThan(diffs))
    asked.mockReturnValue(new Promise(() => undefined))
    await act(() => vi.advanceTimersByTimeAsync(3000))
    const stuck = asked.mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(9000))
    expect(asked.mock.calls.length).toBe(stuck)
    cleanup()

    // Before Construir, or with no checklist, there is no timeline and nothing is asked.
    vi.useRealTimers()
    const early = await boot({ stage: 'plan', change: 'add-x', others: [] }, { boxes: [], total: 0 })
    await screen.findByRole('group', { name: 'Pasos de Libretto' })
    expect(screen.queryByRole('list', { name: 'Casillas del checklist' })).toBeNull()
    expect(early.api.flowApi.boxes).not.toHaveBeenCalled()
  })
})
