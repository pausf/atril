// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowBox, FlowBoxes, FlowStage } from '../../preload/api'
import { menuTemplate } from '../../main/menu'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

// jsdom cannot run xterm: a stand-in with the one thing the window relies on, xterm's own textarea.
vi.mock('../components/Terminal', async () => {
  const { createElement } = await import('react')
  return { Terminal: () => createElement('div', { className: 'xterm-host' }, createElement('textarea', { className: 'xterm-helper-textarea', 'aria-label': 'Terminal' })) }
})

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

async function boot(flow: FlowStage, data: FlowBoxes = boxes, alive = false) {
  const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', alive)], states: { aaaaaaa1: 'working' }, flow, boxes: data, boxDiff: DIFF })
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

  it('the live diff shows even when it answers slower than the 3 s poll', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { api, user } = await boot(building)
    const slow = vi.mocked(api.flowApi.boxDiff)
    slow.mockImplementation(() => new Promise((ok) => setTimeout(() => ok(DIFF), 8000)))
    await screen.findByRole('list', { name: 'Casillas del checklist' })
    const now = Array.from(timeline().children)[2] as HTMLElement
    await user.click(within(now).getByRole('button', { name: /e\.ts/ }))
    // One second at a time: each poll lands before the diff answers.
    for (let i = 0; i < 20; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(now.querySelector('.dadd')?.textContent).toBe('+DOS <script>alert(1)</script>')
  })

  it('the code can be seen large in the centre', async () => {
    const { api, user } = await boot(building, boxes, true)
    const rows = Array.from(timeline().children) as HTMLElement[]
    const host = document.querySelector('.xterm-host')!
    expect(host.closest('[hidden]')).toBeNull()

    // «⤢ Ampliar» above the live box's code puts it in the centre, in place of the terminal.
    await user.click(within(rows[2]!).getByRole('button', { name: 'Ampliar' }))
    const big = await screen.findByRole('region', { name: 'Código ampliado' })
    expect(big.closest('main')).toBe(document.querySelector('.col.center'))
    // The terminal stays mounted (the same node), only hidden.
    expect(document.querySelector('.xterm-host')).toBe(host)
    expect(host.closest('[hidden]')).not.toBeNull()
    // The box's files and the chosen file's diff, as text; the panel keeps its timeline.
    expect(within(big).getByRole('button', { name: /d\.ts/ })).toBeTruthy()
    await vi.waitFor(() => expect(big.querySelector('.dadd')?.textContent).toBe('+DOS <script>alert(1)</script>'))
    expect(big.querySelector('script')).toBeNull()
    expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 2, 'src/d.ts')
    await user.click(within(big).getByRole('button', { name: /e\.ts/ }))
    expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 2, 'src/e.ts')
    expect(timeline()).toBeTruthy()

    // «Volver al terminal ⌘⇧E» brings it back, with its focus.
    await user.click(within(big).getByRole('button', { name: 'Volver al terminal ⌘⇧E' }))
    expect(screen.queryByRole('region', { name: 'Código ampliado' })).toBeNull()
    expect(host.closest('[hidden]')).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('textarea'))

    // A closed box too, on the file that was chosen in the panel.
    await user.click(within(rows[1]!).getByRole('button', { name: /the steps/ }))
    await user.click(within(rows[1]!).getByRole('button', { name: /c\.ts/ }))
    await user.click(within(rows[1]!).getByRole('button', { name: 'Ampliar' }))
    const again = await screen.findByRole('region', { name: 'Código ampliado' })
    expect(within(again).getByRole('heading', { name: 'the steps' })).toBeTruthy()
    await vi.waitFor(() => expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 1, 'src/c.ts'))
  })

  it('the large code opens and closes from the menu and the keyboard', async () => {
    // Trabajo → Ampliar código, ⌘⇧E, enabled only where the window says so; ⌘⇧D stays «Dividir abajo».
    const sent: unknown[] = []
    const work = (bigAvailable?: boolean) =>
      menuTemplate({ selected: 'aaaaaaa1', count: 1, nextEnabled: false, focusOn: false, focusAvailable: true, overviewAvailable: true, bigAvailable, split: () => {}, send: (a) => sent.push(a) }).find((m) => m.label === 'Trabajo')!
        .submenu as Array<{ label?: string; accelerator?: string; enabled?: boolean; click?: () => void }>
    const item = (on?: boolean) => work(on).find((i) => i.label === 'Ampliar código')!
    expect(item(true).accelerator).toBe('CmdOrCtrl+Shift+E')
    expect([item(true).enabled, item(false).enabled, item().enabled]).toEqual([true, false, false])
    item(true).click!()
    expect(sent).toEqual([{ kind: 'bigCode' }])
    expect(work().find((i) => i.label === 'Dividir abajo')?.accelerator).toBe('CmdOrCtrl+Shift+D')

    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', true)], states: { aaaaaaa1: 'working' }, flow: building, boxes, boxDiff: DIFF })
    const user = userEvent.setup()
    render(createElement(App))
    // Nothing selected: unavailable, and the shortcut does nothing.
    await vi.waitFor(() => expect(api.menuApi.setBig).toHaveBeenLastCalledWith(false))
    act(() => api.menu({ kind: 'bigCode' }))
    expect(screen.queryByRole('region', { name: 'Código ampliado' })).toBeNull()
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await vi.waitFor(() => expect(api.menuApi.setBig).toHaveBeenLastCalledWith(true))
    await screen.findByRole('list', { name: 'Casillas del checklist' })
    const host = document.querySelector('.xterm-host')!
    const large = () => screen.queryByRole('region', { name: 'Código ampliado' })

    // The shortcut opens the current box's code, and pressed again closes it.
    act(() => api.menu({ kind: 'bigCode' }))
    expect(await screen.findByRole('region', { name: 'Código ampliado' })).toBeTruthy()
    await vi.waitFor(() => expect(api.flowApi.boxDiff).toHaveBeenLastCalledWith('aaaaaaa1', 2, 'src/d.ts'))
    act(() => api.menu({ kind: 'bigCode' }))
    expect(large()).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('textarea'))

    // Escape closes it and never reaches the terminal's side of the page; with it closed, Escape passes as usual.
    const seen = vi.fn()
    document.addEventListener('keydown', seen)
    act(() => api.menu({ kind: 'bigCode' }))
    await screen.findByRole('region', { name: 'Código ampliado' })
    await user.keyboard('{Escape}')
    expect(large()).toBeNull()
    expect(seen).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(host.querySelector('textarea'))
    await user.keyboard('{Escape}')
    expect(seen).toHaveBeenCalled()
    document.removeEventListener('keydown', seen)

    // «Todos» and other screens make it unavailable and close it.
    act(() => api.menu({ kind: 'bigCode' }))
    await screen.findByRole('region', { name: 'Código ampliado' })
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(large()).toBeNull()
    await vi.waitFor(() => expect(api.menuApi.setBig).toHaveBeenLastCalledWith(false))
    await user.click(screen.getByRole('button', { name: 'Uno' }))
    await vi.waitFor(() => expect(api.menuApi.setBig).toHaveBeenLastCalledWith(true))
    await user.click(within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name: /Ajustes/ }))
    await vi.waitFor(() => expect(api.menuApi.setBig).toHaveBeenLastCalledWith(false))
    cleanup()

    // No boxes, nothing to enlarge.
    const none = await boot({ stage: 'plan', change: 'add-x', others: [] }, { boxes: [], total: 0 }, true)
    act(() => none.api.menu({ kind: 'bigCode' }))
    expect(screen.queryByRole('region', { name: 'Código ampliado' })).toBeNull()
  })
})
