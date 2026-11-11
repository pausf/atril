// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowBoxes, FlowStage, QaStatus, SubagentEntry, SubagentLine } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const NOW = 1_800_000_000

describe('subagents', () => {
  it('subagents hang from the current box', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW * 1000)
    const entries: SubagentEntry[] = [
      { id: 'a1', type: 'explorer', description: 'Leer el módulo de pagos', startedAt: NOW - 200, endedAt: NOW - 155 },
      { id: 'a2', type: 'general-purpose', description: '<img src=x onerror=alert(1)> migrar', startedAt: NOW - 80 },
      { id: 'a3', type: 'Plan', startedAt: NOW - 10 }
    ]
    const boot = async (flow: FlowStage, data?: FlowBoxes) => {
      const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow, boxes: data, subagents: { aaaaaaa1: entries } })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
      render(createElement(App))
      await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
      return api
    }
    const list = (): HTMLElement => screen.getByRole('list', { name: 'Subagentes' })
    const rows = (): string[] => within(list()).getAllByRole('listitem').map((li) => li.textContent ?? '')
    const names = (): string[] => within(list()).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? '')
    const building: FlowStage = { stage: 'construir', change: 'add-x', others: [], checklist: { file: 'proposal.md', closed: 1, total: 2, firstOpen: 'now' } }
    const withCurrent: FlowBoxes = { total: 0, boxes: [{ index: 0, text: 'done', state: 'closed', commit: 'a1b2c3d' }, { index: 1, text: 'now', state: 'current', files: [{ path: 'src/d.ts', status: 'M', added: 1, removed: 0 }] }] }
    const noCurrent: FlowBoxes = { total: 0, boxes: [{ index: 0, text: 'done', state: 'closed', commit: 'a1b2c3d' }] }

    // Under the current box, before its code; newest first; the type alone when there is no description; text, never markup.
    const api = await boot(building, withCurrent)
    const now = (await screen.findByRole('list', { name: 'Casillas del checklist' })).querySelector('.fx-bx.c') as HTMLElement
    await within(now).findByRole('list', { name: 'Subagentes' })
    expect(now.contains(list())).toBe(true)
    expect(list().compareDocumentPosition(now.querySelector('.fchanges')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(rows()).toEqual(['Plan10 s', 'general-purpose<img src=x onerror=alert(1)> migrar1 min 20 s', '✓explorerLeer el módulo de pagos45 s'])
    expect(names()).toEqual(['Plan, trabajando · 10 s', '<img src=x onerror=alert(1)> migrar, general-purpose, trabajando · 1 min 20 s', 'Leer el módulo de pagos, explorer, terminado · 45 s'])
    expect(list().querySelectorAll('i').length).toBe(2)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Subagentes/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /^Subagentes/ })).toBeNull()

    // Running ones tick every second; the finished one does not move.
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(names().map((n) => n.replace(/^.*?((trabajando|terminado) · .*)$/, '$1'))).toEqual(['trabajando · 15 s', 'trabajando · 1 min 25 s', 'terminado · 45 s'])

    // The list follows main, and the branches go away with the last entry.
    act(() => api.pushSubagents('aaaaaaa1', [{ ...entries[1]!, endedAt: NOW + 5 }]))
    expect(names()).toEqual(['<img src=x onerror=alert(1)> migrar, general-purpose, terminado · 1 min 25 s'])
    act(() => api.pushSubagents('aaaaaaa1', []))
    expect(screen.queryByRole('list', { name: 'Subagentes' })).toBeNull()
    cleanup()

    // No current box: under the «Cambio» line.
    await boot(building, noCurrent)
    await screen.findByRole('list', { name: 'Subagentes' })
    expect(list().previousElementSibling?.textContent).toContain('Cambio:')
    expect(screen.getByRole('list', { name: 'Casillas del checklist' }).contains(list())).toBe(false)
    cleanup()

    // No change: under a «Subagentes» line at the top, still no section.
    await boot({ stage: 'entrada', others: [] })
    await screen.findByRole('list', { name: 'Subagentes' })
    expect(list().previousElementSibling?.textContent).toBe('Subagentes')
    expect(screen.queryByRole('button', { name: /^Subagentes/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /^Subagentes/ })).toBeNull()
  })

  it('a branch shows what its subagent did last', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW * 1000)
    const entries: SubagentEntry[] = [
      { id: 'a1', type: 'explorer', description: 'Leer pagos', startedAt: NOW - 20 },
      { id: 'a2', type: 'Plan', description: 'Planear', startedAt: NOW - 30 },
      { id: 'a3', type: 'general-purpose', description: 'Migrar', startedAt: NOW - 40 },
      { id: 'a4', type: 'Verify', description: 'Verificar', startedAt: NOW - 50 }
    ]
    const logs: Record<string, SubagentLine[]> = {
      a1: [{ kind: 'prompt', text: 'Lee' }, { kind: 'tool', text: 'Read(/a.ts)' }, { kind: 'result', text: '1\n\n2\n', more: 3 }, { kind: 'text', text: '' }],
      a2: [{ kind: 'text', text: 'Voy' }, { kind: 'thinking', text: '' }],
      a3: [{ kind: 'text', text: 'Algo' }]
    }
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow: { stage: 'entrada', others: [] }, subagents: { aaaaaaa1: entries }, subagentLogs: logs })
    const calls = vi.spyOn(window.atril.subagents, 'log')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    const branch = (n: string): HTMLElement => screen.getByRole('button', { name: new RegExp(`^${n}`) })

    // Hover asks once and shows the last non-empty line, no prefix, in place of the description.
    expect(branch('Leer pagos').textContent).toContain('Leer pagos')
    await user.hover(branch('Leer pagos'))
    await waitFor(() => expect(branch('Leer pagos').textContent).toContain('2'))
    expect(calls).toHaveBeenCalledTimes(1)
    expect(calls).toHaveBeenLastCalledWith('aaaaaaa1', 'a1')
    expect(branch('Leer pagos').textContent).not.toContain('Leer pagos')
    expect(branch('Leer pagos').textContent).not.toContain('⎿')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(calls).toHaveBeenCalledTimes(1)

    // Leaving brings the description back; entering again asks again.
    await user.unhover(branch('Leer pagos'))
    expect(branch('Leer pagos').textContent).toContain('Leer pagos')
    await user.hover(branch('Leer pagos'))
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(2))
    // A click while hovered also focuses the branch: still one ask for this entry.
    act(() => branch('Leer pagos').focus())
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(calls).toHaveBeenCalledTimes(2)
    await user.unhover(branch('Leer pagos'))
    act(() => branch('Leer pagos').blur())

    // Focus does the same; a thinking line reads «Pensando…».
    act(() => branch('Leer pagos').focus())
    await user.tab()
    expect(document.activeElement).toBe(branch('Planear'))
    await waitFor(() => expect(branch('Planear').textContent).toContain('Pensando…'))
    expect(calls).toHaveBeenLastCalledWith('aaaaaaa1', 'a2')
    await user.tab()
    await waitFor(() => expect(branch('Migrar').textContent).toContain('Algo'))
    expect(branch('Planear').textContent).toContain('Planear')

    // An empty log keeps the description.
    await user.tab()
    await waitFor(() => expect(calls).toHaveBeenLastCalledWith('aaaaaaa1', 'a4'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(branch('Verificar').textContent).toContain('Verificar')

    // An answer that arrives after the pointer left is ignored.
    let late: (l: SubagentLine[]) => void = () => {}
    calls.mockImplementationOnce(() => new Promise((r) => (late = r)))
    await user.hover(branch('Migrar'))
    await user.unhover(branch('Migrar'))
    await act(async () => late([{ kind: 'text', text: 'tarde' }]))
    expect(branch('Migrar').textContent).toContain('Migrar')
    expect(branch('Migrar').textContent).not.toContain('tarde')
  })

  it('the panel has no foldable sections', async () => {
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow: { stage: 'construir', change: 'add-x', others: [] } as FlowStage, qa: { aaaaaaa1: { target: null, live: false, shots: [] } as QaStatus } })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await screen.findByText('add-x')
    const panel = document.querySelector<HTMLElement>('aside.right')!

    // No title in the panel is a button that folds: nothing carries aria-expanded, and QA is not there.
    expect(panel.querySelector('[aria-expanded]')).toBeNull()
    expect(within(panel).queryByRole('button', { name: /^QA/ })).toBeNull()
    expect(within(panel).queryByRole('button', { name: /^Subagentes/ })).toBeNull()
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
    // (the pointer entering and the focus on the row each asked once for F41, before the modal's own first call)
    const base = calls.mock.calls.length
    expect(calls).toHaveBeenLastCalledWith('aaaaaaa1', 'a1')
    await settle(500)
    expect(calls).toHaveBeenCalledTimes(base)
    await settle(500)
    expect(calls).toHaveBeenCalledTimes(base + 1)
    await settle(1000)
    expect(calls).toHaveBeenCalledTimes(base + 2)
    act(() => api.pushSubagents('aaaaaaa1', [{ ...entries[0]!, endedAt: NOW + 2 }, entries[1]!]))
    await settle()
    expect(calls).toHaveBeenCalledTimes(base + 3)
    expect(dialog.textContent).toContain('terminado · 1 min 22 s')
    await settle(5000)
    expect(calls).toHaveBeenCalledTimes(base + 3)

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
