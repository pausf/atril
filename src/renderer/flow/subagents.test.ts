// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubagentEntry } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const NOW = 1_800_000_000
const items = (): string[] => within(screen.getByRole('list', { name: 'Subagentes' })).getAllByRole('listitem').map((li) => li.textContent ?? '')

describe('subagents', () => {
  it('subagents show in the panel', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW * 1000)
    const entries: SubagentEntry[] = [
      { id: 'a1', type: 'explorer', description: 'Leer el módulo de pagos', startedAt: NOW - 200, endedAt: NOW - 155 },
      { id: 'a2', type: 'general-purpose', description: '<img src=x onerror=alert(1)> migrar', startedAt: NOW - 80 },
      { id: 'a3', type: 'Plan', startedAt: NOW - 10 }
    ]
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, subagents: { aaaaaaa1: entries } })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await screen.findByRole('heading', { name: 'Subagentes' })

    // Newest first; the type alone when there is no description; text, never markup.
    expect(items()).toEqual([
      'Plantrabajando · 10 s',
      '<img src=x onerror=alert(1)> migrargeneral-purposetrabajando · 1 min 20 s',
      'Leer el módulo de pagosexplorerterminado · 45 s'
    ])
    expect(document.querySelector('img')).toBeNull()

    // Running ones tick every second; the finished one does not move.
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(items().map((t) => t.replace(/^.*?((trabajando|terminado) · .*)$/, '$1'))).toEqual(['trabajando · 15 s', 'trabajando · 1 min 25 s', 'terminado · 45 s'])

    // The list follows main, and the section goes away with the last entry.
    act(() => api.pushSubagents('aaaaaaa1', [{ ...entries[1]!, endedAt: NOW + 5 }]))
    expect(items()).toEqual(['<img src=x onerror=alert(1)> migrargeneral-purposeterminado · 1 min 25 s'])
    act(() => api.pushSubagents('aaaaaaa1', []))
    expect(screen.queryByRole('heading', { name: 'Subagentes' })).toBeNull()
  })
})
