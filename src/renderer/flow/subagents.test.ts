// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubagentEntry, SubagentLine } from '../../preload/api'
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
    await screen.findByRole('heading', { name: /^Subagentes/ })

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
    expect(screen.queryByRole('heading', { name: /^Subagentes/ })).toBeNull()
  })

  it('a subagent opens as a terminal', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW * 1000)
    const entries: SubagentEntry[] = [
      { id: 'a1', type: 'explorer', description: 'Leer el módulo de pagos', startedAt: NOW - 80 },
      { id: 'a2', type: 'Plan', startedAt: NOW - 200, endedAt: NOW - 155 }
    ]
    const log: SubagentLine[] = [
      { kind: 'prompt', text: 'Lee shop-web\nsegunda' },
      { kind: 'thinking', text: '' },
      { kind: 'text', text: 'Voy.\nSigo' },
      { kind: 'tool', text: 'Read(/a.ts)' },
      { kind: 'result', text: '1\n2\n3', more: 2 },
      { kind: 'text', text: '<b>texto</b>' }
    ]
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, subagents: { aaaaaaa1: entries }, subagentLogs: { a1: log } })
    const calls = vi.spyOn(window.atril.subagents, 'log')
    const settle = async (ms = 0): Promise<void> => void (await act(() => vi.advanceTimersByTimeAsync(ms)))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))

    const row = await screen.findByRole('button', { name: /Leer el módulo de pagos/ })
    await user.click(row)
    const dialog = await screen.findByRole('dialog', { name: 'Leer el módulo de pagos' })
    await screen.findByText('Sigo')
    expect(dialog.textContent).toContain('explorer')
    expect(dialog.textContent).toContain('trabajando · 1 min 20 s')
    const rows = (): string[] => Array.from(within(dialog).getByRole('log').children).map((r) => r.textContent ?? '')
    // Prefixes on the first line only; continuation lines carry none; text, never markup.
    expect(rows()).toEqual(['> Lee shop-web', 'segunda', '✻ Pensando…', '⏺ Voy.', 'Sigo', '⏺ Read(/a.ts)', '⎿ 1', '2', '3', '… +2 líneas', '⏺ <b>texto</b>'])
    expect(dialog.querySelector('b')).toBeNull()
    expect(document.activeElement).toBe(dialog)

    // Live while it runs: once a second, once more when endedAt arrives, then never again.
    expect(calls).toHaveBeenCalledTimes(1)
    expect(calls).toHaveBeenLastCalledWith('aaaaaaa1', 'a1')
    await settle(500)
    expect(calls).toHaveBeenCalledTimes(1)
    await settle(500)
    expect(calls).toHaveBeenCalledTimes(2)
    await settle(1000)
    expect(calls).toHaveBeenCalledTimes(3)
    act(() => api.pushSubagents('aaaaaaa1', [{ ...entries[0]!, endedAt: NOW + 2 }, entries[1]!]))
    await settle()
    expect(calls).toHaveBeenCalledTimes(4)
    expect(dialog.textContent).toContain('terminado · 1 min 22 s')
    await settle(5000)
    expect(calls).toHaveBeenCalledTimes(4)

    // Escape closes and gives the row its focus back.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Leer el módulo de pagos/ }))

    // No log: says so; «Cerrar» closes and gives focus back.
    const plan = screen.getByRole('button', { name: /^Plan/ })
    await user.click(plan)
    const empty = await screen.findByRole('dialog', { name: 'Plan' })
    await within(empty).findByText('Sin registro de este subagente')
    expect(empty.textContent).toContain('terminado · 45 s')
    await user.click(within(empty).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(plan)

    // The entry leaving the list closes the modal.
    await user.click(screen.getByRole('button', { name: /Leer el módulo de pagos/ }))
    await screen.findByRole('dialog')
    act(() => api.pushSubagents('aaaaaaa1', [entries[1]!]))
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
