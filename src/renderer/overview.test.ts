// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowStage, SubagentEntry, UiState } from '../preload/api'
import { menuTemplate } from '../main/menu'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const overview = () => screen.queryByRole('region', { name: 'Todos los agentes' })
const cards = (): HTMLElement[] => Array.from(overview()?.querySelectorAll<HTMLElement>('.ov-card') ?? [])
const branches = (): string[] => cards().map((c) => c.querySelector('.ov-branch')?.textContent ?? '')
const card = (branch: string): HTMLElement => cards().find((c) => c.querySelector('.ov-branch')?.textContent === branch)!
const text = (branch: string): string => card(branch).textContent ?? ''
const run = (id: string): SubagentEntry => ({ id, type: 'explorer', startedAt: 10 })
const flow = (stage: FlowStage['stage'], closed?: number, total?: number): FlowStage => ({
  stage,
  others: [],
  ...(total !== undefined && { change: 'add-x', checklist: { file: 'proposal.md', closed: closed!, total } })
})
const workMenu = (overviewAvailable: boolean) =>
  menuTemplate({ selected: null, count: 1, nextEnabled: false, focusOn: false, focusAvailable: false, overviewAvailable, split: () => {}, send: () => {} }).find((m) => m.label === 'Trabajo')
    ?.submenu as Array<{ label?: string; accelerator?: string; enabled?: boolean }>

// Stopped in tmux terms: a live one would mount xterm, which jsdom cannot run. The state files say otherwise.
const data = () => {
  const now = Math.floor(Date.now() / 1000)
  const branch: Record<string, string> = { a1: 'PF-1', a2: 'PF-2', a3: 'PF-3', a4: 'PF-4', a5: 'PF-5', a6: 'PF-0', a7: 'PF-8', a8: 'PF-7' }
  return {
    workspaces: Object.entries(branch).map(([id, b]) => workspace(`aaaaaa${id}`, b, false)),
    states: {
      aaaaaaa1: 'stopped',
      aaaaaaa2: 'working',
      aaaaaaa3: 'needs-you',
      aaaaaaa4: 'needs-you',
      aaaaaaa5: 'working',
      aaaaaaa6: 'stopped',
      aaaaaaa7: 'working',
      aaaaaaa8: 'working'
    } as const,
    // N1 order from main: PF-4 has waited longest.
    nextup: [{ kind: 'agent' as const, id: 'aaaaaaa4' }, { kind: 'agent' as const, id: 'aaaaaaa3' }],
    flows: { aaaaaaa1: flow('sin-libretto'), aaaaaaa2: flow('construir', 3, 7), aaaaaaa3: flow('spec') },
    activity: {
      aaaaaaa1: [{ at: now - 7200, kind: 'run' as const, text: 'pnpm test' }],
      aaaaaaa2: [{ at: now - 300, kind: 'edit' as const, text: 'src/a.ts' }],
      aaaaaaa5: [{ at: now - 30, kind: 'read' as const, text: 'src/b.ts' }],
      aaaaaaa6: [{ at: now - 3 * 86400, kind: 'read' as const, text: 'src/c.ts' }]
    },
    subagents: { aaaaaaa2: [run('a'), run('b')] }
  }
}

describe('agents overview', () => {
  it('all agents show as ordered cards', async () => {
    // Trabajo → Todos los agentes, ⌘⇧A, enabled only where the window says (Trabajo with a workspace).
    const item = (on: boolean) => workMenu(on).find((i) => i.label === 'Todos los agentes')
    expect(item(true)?.accelerator).toBe('CmdOrCtrl+Shift+A')
    expect(item(true)?.enabled).toBe(true)
    expect(item(false)?.enabled).toBe(false)

    // Date and the 30 s refresh are faked; the rest of the clock runs.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: Date.now() })
    const user = userEvent.setup()
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const api = mockApi(data(), stored)
    render(createElement(App))
    await screen.findByText('PF-5')
    expect(overview()).toBeNull()
    expect(screen.getByRole('button', { name: 'Uno' }).getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(api.menuApi.setOverview).toHaveBeenLastCalledWith(true))

    // «Todos»: one card per workspace in place of the terminal; needs-you by N1, working by latest
    // activity (none last, ties by id), stopped by branch.
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(overview()).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Elige un trabajo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(branches()).toEqual(['PF-4', 'PF-3', 'PF-5', 'PF-2', 'PF-8', 'PF-7', 'PF-0', 'PF-1']))

    // Each card: repo, written state, stage with its checklist, last activity with its age, running subagents.
    await waitFor(() => expect(text('PF-2')).toContain('3/7'))
    for (const part of ['web', 'trabajando', 'Construir', 'src/a.ts', 'hace 5 min']) expect(text('PF-2')).toContain(part)
    await waitFor(() => expect(text('PF-2')).toContain('2 subagentes'))
    expect(text('PF-3')).toContain('te necesita')
    expect(text('PF-3')).toContain('Spec')
    expect(text('PF-3')).not.toMatch(/\d+\/\d+/)
    expect(text('PF-1')).toContain('parado')
    // Ages; missing data: «sin actividad», «sin Libretto»; a flow not there yet and no subagents say nothing.
    expect(text('PF-5')).toContain('ahora')
    expect(text('PF-1')).toContain('hace 2 h')
    expect(text('PF-0')).toContain('hace 3 d')
    expect(text('PF-8')).toContain('sin actividad')
    expect(text('PF-1')).toContain('sin Libretto')
    expect(text('PF-4')).not.toContain('sin Libretto')
    expect(text('PF-4')).not.toContain('subagente')
    for (const s of ['Entrada', 'Spec', 'Plan', 'Construir', 'Terminado', 'Aterrizado']) expect(text('PF-4')).not.toContain(s)
    // The age refreshes every 30 s.
    act(() => vi.advanceTimersByTime(30_000))
    expect(text('PF-5')).toContain('hace 1 min')

    // The cards are buttons; the arrows move between them.
    const main = (b: string) => within(card(b)).getAllByRole('button')[0]!
    main('PF-4').focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(main('PF-3'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(main('PF-5'))
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(main('PF-3'))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(main('PF-4'))

    // Live: a state change reorders, a flow change updates the stage and checklist.
    act(() => api.pushState('aaaaaaa1', 'working'))
    expect(branches()).toEqual(['PF-4', 'PF-3', 'PF-5', 'PF-2', 'PF-1', 'PF-8', 'PF-7', 'PF-0'])
    act(() => api.pushFlow('aaaaaaa3', flow('plan', 1, 4)))
    expect(text('PF-3')).toContain('1/4')
    expect(text('PF-3')).toContain('Plan')

    // ⌘⇧A goes back to the terminal and comes again; «Uno» goes back too.
    act(() => api.menu({ kind: 'overview' }))
    expect(overview()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Elige un trabajo' })).toBeTruthy()
    act(() => api.menu({ kind: 'overview' }))
    expect(overview()).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Uno' }))
    expect(overview()).toBeNull()

    // Entering «Todos» takes focus mode off: focus belongs to one workspace.
    act(() => api.menu({ kind: 'select', index: 0 }))
    await screen.findByRole('heading', { name: 'PF-1' })
    act(() => api.menu({ kind: 'focusMode' }))
    await screen.findByRole('button', { name: 'Salir del foco' })
    act(() => api.menu({ kind: 'overview' }))
    expect(overview()).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salir del foco' })).toBeNull()

    // ⌘⇧A is unavailable away from Trabajo.
    await user.click(within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name: /Ajustes/ }))
    await waitFor(() => expect(api.menuApi.setOverview).toHaveBeenLastCalledWith(false))

    // Not stored: a restart comes back to «Uno».
    expect(vi.mocked(api.ui.set).mock.calls.some(([p]) => 'overview' in p)).toBe(false)
    cleanup()
    const again = mockApi(data(), stored)
    render(createElement(App))
    await screen.findByText('PF-5')
    expect(overview()).toBeNull()

    // Without workspaces it is unavailable on Trabajo too.
    cleanup()
    const none = mockApi({}, stored)
    render(createElement(App))
    await waitFor(() => expect(none.menuApi.setOverview).toHaveBeenLastCalledWith(false))
    expect(again.menuApi.setOverview).toHaveBeenLastCalledWith(true)
  })
  it('a card opens its workspace or answers in place', async () => {
    const user = userEvent.setup()
    const base = data()
    const asked = [{ at: Math.floor(Date.now() / 1000), kind: 'asks' as const, text: '¿Aplico el plan completo?' }]
    const api = mockApi({
      ...base,
      activity: { ...base.activity, aaaaaaa4: asked, aaaaaaa3: asked },
      quickReplies: { aaaaaaa4: { options: ['Sí', 'Rehaz el plan'], multiSelect: false }, aaaaaaa3: { options: ['a', 'b'], multiSelect: true } }
    })
    render(createElement(App))
    await screen.findByText('PF-5')
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(branches()[0]).toBe('PF-4'))

    // A needs-you card carries W76's replies outside its button; multiSelect and other states carry none.
    const replies = (b: string) => within(card(b)).queryByRole('group', { name: 'Respuestas rápidas' })
    await waitFor(() => expect(replies('PF-4')).toBeTruthy())
    expect(card('PF-4').querySelector('.ov-main')?.contains(replies('PF-4'))).toBe(false)
    expect(card('PF-4').querySelector('.ov-main button')).toBeNull()
    // The card is joined under the button and says the whole question; the button no longer repeats the cut line.
    expect(card('PF-4').querySelector('.ask-q')?.textContent).toContain('¿Aplico el plan completo?')
    expect(card('PF-4').querySelector('.ov-main')?.contains(card('PF-4').querySelector('.ask'))).toBe(false)
    expect(card('PF-4').querySelector('.ov-main .ov-act-text')).toBeNull()
    expect(card('PF-3').querySelector('.ov-main .ov-act-text')?.textContent).toContain('¿Aplico el plan completo?')
    expect(replies('PF-3')).toBeNull()
    expect(replies('PF-2')).toBeNull()

    // Answering there sends it and leaves «Todos» on screen, nothing opened.
    await user.click(within(replies('PF-4')!).getByRole('button', { name: 'Rehaz el plan' }))
    expect(api.statusApi.answer).toHaveBeenLastCalledWith('aaaaaaa4', { option: 1 })
    expect(await within(card('PF-4')).findByText('Enviado')).toBeTruthy()
    expect(overview()).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'PF-4' })).toBeNull()

    // Pressing a card opens its workspace in «Uno», without focus mode.
    await user.click(within(card('PF-2')).getAllByRole('button')[0]!)
    expect(overview()).toBeNull()
    expect(await screen.findByRole('heading', { name: 'PF-2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salir del foco' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Uno' }).getAttribute('aria-pressed')).toBe('true')

    // By keyboard too.
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    within(card('PF-5')).getAllByRole('button')[0]!.focus()
    await user.keyboard('{Enter}')
    expect(overview()).toBeNull()
    expect(await screen.findByRole('heading', { name: 'PF-5' })).toBeTruthy()

    // ⌘↩ (N2) opening a workspace from «Todos» shows it in «Uno».
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    act(() => api.menu({ kind: 'next' }))
    expect(await screen.findByRole('heading', { name: 'PF-4' })).toBeTruthy()
    expect(overview()).toBeNull()
  })
})
