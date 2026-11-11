// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HistoryEntry } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const noon = (daysAgo: number): number => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return Math.floor(d.getTime() / 1000)
}
const entry = (branch: string, closedAt: number, more: Partial<HistoryEntry> = {}): HistoryEntry => ({
  branch,
  repoId: 'shop-web',
  mode: 'worktree',
  stage: 'aterrizado',
  closedAt,
  cost: null,
  ...more
})
const rows = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('.hist-row'))
const meta = (branch: string): string | undefined =>
  rows()
    .find((r) => r.querySelector('.hist-branch')?.textContent === branch)
    ?.querySelector('.hist-meta')?.textContent ?? undefined
const section = (): HTMLElement => screen.getByRole('button', { name: /^Terminados/ })

describe('history', () => {
  it('finished works show in their own section', async () => {
    // No lines, no section; the first line pushed brings it.
    const empty = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1')] })
    render(createElement(App))
    await screen.findByText('PF-1')
    expect(screen.queryByRole('button', { name: /^Terminados/ })).toBeNull()
    act(() => empty.pushHistory([entry('feat/first', noon(0))]))
    expect(section().textContent).toMatch(/1$/)
    cleanup()

    const t0 = noon(0)
    const history: HistoryEntry[] = [
      entry('feat/short', t0, { createdAt: t0 - 30, cost: { tokens: 850, usd: 0.42, unpriced: [] } }),
      entry('feat/minutes', t0, { createdAt: t0 - 45 * 60, stage: 'construir', cost: { tokens: 12_345, usd: 0.004, unpriced: [] } }),
      entry('feat/hours', noon(1), { createdAt: noon(1) - (2 * 3600 + 5 * 60), cost: { tokens: 0, usd: null, unpriced: [] } }),
      entry('feat/days', noon(3), { createdAt: noon(3) - (3 * 86400 + 4 * 3600), stage: 'sin-libretto', jiraKey: 'SHOP-9' }),
      // Before W95 there was no createdAt: no «duró».
      entry('feat/old', noon(10), { stage: 'spec' }),
      ...Array.from({ length: 20 }, (_, i) => entry(`old/${i}`, noon(20 + i)))
    ]
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1')], history })
    const user = userEvent.setup()
    render(createElement(App))
    await screen.findByText('PF-1')

    // Folded by default; its count is every line in the file, not the 20 shown.
    const fold = await screen.findByRole('button', { name: /^Terminados\s*25$/ })
    expect(fold.getAttribute('aria-expanded')).toBe('false')
    await user.click(fold)
    expect(rows()).toHaveLength(20)
    expect(rows()[0]?.querySelector('.hist-branch')?.textContent).toBe('feat/short')
    expect(meta('old/14')).toBeDefined()
    expect(meta('old/15')).toBeUndefined()

    // Repo, stage, how long it lasted, no cost even when the line has one, and the calendar age.
    expect(meta('feat/short')).toBe('shop-web · Aterrizado · duró < 1 min · hoy')
    expect(meta('feat/minutes')).toBe('shop-web · Construir · duró 45 min · hoy')
    expect(meta('feat/hours')).toBe('shop-web · Aterrizado · duró 2 h 5 min · hace 1 d')
    expect(meta('feat/days')).toBe('shop-web · sin Libretto · duró 3 d 4 h · hace 3 d')
    expect(meta('feat/old')).toBe('shop-web · Spec · hace 10 d')

    // A new line pushed by main shows at once, on top, and counts.
    act(() => api.pushHistory([entry('feat/new', t0, { createdAt: t0 - 3600 }), ...history]))
    expect(section().textContent).toMatch(/26$/)
    expect(rows()[0]?.querySelector('.hist-branch')?.textContent).toBe('feat/new')
    expect(section().textContent).not.toMatch(/[$≈]|tokens/)
    expect(meta('feat/new')).toBe('shop-web · Aterrizado · duró 1 h 0 min · hoy')
  })

  it('each finished work shows its steps and the slowest one leads', async () => {
    const t0 = noon(0)
    const steps = (branch: string): string | undefined =>
      rows()
        .find((r) => r.querySelector('.hist-branch')?.textContent === branch)
        ?.querySelector('.hist-steps')?.textContent ?? undefined
    const headline = (): string | undefined => document.querySelector('.hist-slowest')?.textContent ?? undefined

    const history: HistoryEntry[] = [
      entry('feat/all', t0, { steps: { spec: 30, plan: 600, construir: 7200, cierre: 2 * 86400 } }),
      entry('feat/some', t0, { steps: { construir: 5400, spec: 3600 } }),
      entry('feat/plain', t0, { stage: 'sin-libretto' }),
      entry('feat/close', t0, { steps: { cierre: 59 } })
    ]
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1')], history })
    const user = userEvent.setup()
    render(createElement(App))
    await screen.findByText('PF-1')

    // The headline lives inside the folded list: hidden until it is unfolded.
    const hidden = (): boolean => document.querySelector('.hist-slowest')?.closest('[hidden]') != null
    expect(hidden()).toBe(true)
    await user.click(await screen.findByRole('button', { name: /^Terminados/ }))
    expect(hidden()).toBe(false)

    // Each step in order, only those it has; a work without steps has no line.
    expect(steps('feat/all')).toBe('Spec <1 min · Plan 10 min · Construir 2 h · Cierre 2 d')
    expect(steps('feat/some')).toBe('Spec 1 h · Construir 1 h')
    expect(steps('feat/close')).toBe('Cierre <1 min')
    expect(steps('feat/plain')).toBeUndefined()

    // Medians over the works that have the step; an even count takes the mean of the two middle ones:
    // spec (30 + 3600) / 2, plan 600, construir (5400 + 7200) / 2, cierre (59 + 172800) / 2.
    expect(headline()).toBe('Donde más tiempo se va: Cierre (mediana 1 d)')
    expect(rows()[0]?.closest('.hist-list')?.previousElementSibling?.className).toBe('hist-slowest')

    // A tie goes to the earlier step.
    const tied = (b: string): HistoryEntry => entry(b, t0, { steps: { spec: 600, plan: 60, construir: 600 } })
    act(() => api.pushHistory([tied('t/1'), tied('t/2'), tied('t/3')]))
    expect(headline()).toBe('Donde más tiempo se va: Spec (mediana 10 min)')

    // Fewer than three of the 20 newest with steps: no headline, even if older ones have them.
    act(() =>
      api.pushHistory([
        tied('t/1'),
        tied('t/2'),
        ...Array.from({ length: 18 }, (_, i) => entry(`old/${i}`, noon(1 + i))),
        tied('t/old')
      ])
    )
    expect(headline()).toBeUndefined()
    expect(steps('t/1')).toBe('Spec 10 min · Plan 1 min · Construir 10 min')
  })
})
