// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiState } from '../preload/api'
import { menuTemplate } from '../main/menu'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

// Stopped workspaces: a live one would mount xterm, which jsdom cannot run.
const data = () => ({
  workspaces: [workspace('aaaaaaa1', 'WEB-1', false), workspace('aaaaaaa2', 'WEB-2', false)],
  nextup: [{ kind: 'agent' as const, id: 'aaaaaaa2' }]
})
const sidebar = () => document.querySelector('.col.left')
const strip = () => screen.queryByRole('navigation', { name: 'Qué me toca' })
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })
const flow = () => document.querySelector('.col.right')
const workItems = (focusOn: boolean, focusAvailable: boolean) => {
  const work = menuTemplate({ selected: 'aaaaaaa1', count: 2, nextEnabled: false, focusOn, focusAvailable, split: () => {}, send: () => {} }).find((m) => m.label === 'Trabajo')
  return work?.submenu as Array<{ label?: string; accelerator?: string; enabled?: boolean; checked?: boolean }>
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('focus mode', () => {
  it('focus keeps only the chosen workspace', async () => {
    // Trabajo → Modo foco, ⌘⇧F, enabled only where the window says it can be turned on, or to turn it off.
    const item = (on: boolean, available: boolean) => workItems(on, available).find((i) => i.label === 'Modo foco')
    expect(item(false, false)?.accelerator).toBe('CmdOrCtrl+Shift+F')
    expect(item(false, false)?.enabled).toBe(false)
    expect(item(false, true)?.enabled).toBe(true)
    expect(item(true, true)?.checked).toBe(true)

    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const api = mockApi(data(), stored)
    render(createElement(App))
    await screen.findByRole('button', { name: 'WEB-2 te necesita' })

    // Nothing selected: main is told focus is off and unavailable (also on load), and the shortcut does nothing.
    await vi.waitFor(() => expect(api.menuApi.setFocus).toHaveBeenLastCalledWith(false, false))
    act(() => api.menu({ kind: 'focusMode' }))
    expect(screen.queryByRole('button', { name: 'Salir del foco' })).toBeNull()
    expect(sidebar()).toBeTruthy()

    act(() => api.menu({ kind: 'select', index: 0 }))
    await screen.findByRole('heading', { name: 'WEB-1' })
    await vi.waitFor(() => expect(api.menuApi.setFocus).toHaveBeenLastCalledWith(false, true))

    // Away from Trabajo it is unavailable too.
    const user = userEvent.setup()
    await user.click(rail(/Ajustes/))
    await vi.waitFor(() => expect(api.menuApi.setFocus).toHaveBeenLastCalledWith(false, false))
    act(() => api.menu({ kind: 'focusMode' }))
    await user.click(rail(/Trabajo/))
    expect(sidebar()).toBeTruthy()
    act(() => api.menu({ kind: 'focusMode' }))
    expect(await screen.findByRole('button', { name: 'Salir del foco' })).toBeTruthy()
    expect(sidebar()).toBeNull()
    expect(strip()).toBeNull()
    expect(screen.getByRole('heading', { name: 'WEB-1' })).toBeTruthy()
    expect(flow()).toBeTruthy()
    expect(document.querySelector('[data-tour="terminal"]')).toBeTruthy()
    await vi.waitFor(() => expect(api.menuApi.setFocus).toHaveBeenLastCalledWith(true, true))

    // Switching workspace keeps focus, now on the new one.
    act(() => api.menu({ kind: 'select', index: 1 }))
    expect(await screen.findByRole('heading', { name: 'WEB-2' })).toBeTruthy()
    expect(sidebar()).toBeNull()
    expect(screen.getByRole('button', { name: 'Salir del foco' })).toBeTruthy()

    // The shortcut again restores everything.
    act(() => api.menu({ kind: 'focusMode' }))
    expect(screen.queryByRole('button', { name: 'Salir del foco' })).toBeNull()
    expect(sidebar()).toBeTruthy()
    expect(strip()).toBeTruthy()
    await vi.waitFor(() => expect(api.menuApi.setFocus).toHaveBeenLastCalledWith(false, true))

    // So does the button.
    act(() => api.menu({ kind: 'focusMode' }))
    await user.click(await screen.findByRole('button', { name: 'Salir del foco' }))
    expect(sidebar()).toBeTruthy()
    expect(strip()).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'WEB-2' })).toBeTruthy()

    // Not stored: a restart comes back without focus.
    act(() => api.menu({ kind: 'focusMode' }))
    await screen.findByRole('button', { name: 'Salir del foco' })
    expect(vi.mocked(api.ui.set).mock.calls.some(([p]) => 'focus' in p)).toBe(false)
    cleanup()
    mockApi(data(), stored)
    render(createElement(App))
    await screen.findByRole('button', { name: 'WEB-2 te necesita' })
    expect(sidebar()).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Salir del foco' })).toBeNull()
  })

  it('jump to the waiting agent and back', async () => {
    // Trabajo → Volver, ⌘⌥←, only while focus is on.
    const back = (on: boolean) => workItems(on, true).find((i) => i.label === 'Volver')
    expect(back(true)?.accelerator).toBe('CmdOrCtrl+Alt+Left')
    expect(back(true)?.enabled).toBe(true)
    expect(back(false)?.enabled).toBe(false)

    // N1 order from main: WEB-1 (the one open) waits longest, then WEB-3, then WEB-2; a task after them.
    const workspaces = ['WEB-1', 'WEB-2', 'WEB-3', 'WEB-4'].map((b, n) => workspace(`aaaaaaa${n + 1}`, b, false))
    const api = mockApi({
      workspaces,
      nextup: [{ kind: 'agent', id: 'aaaaaaa1' }, { kind: 'agent', id: 'aaaaaaa3' }, { kind: 'agent', id: 'aaaaaaa2' }, { kind: 'task', key: 'WEB-10' }]
    })
    const setNext = vi.mocked(api.menuApi.setNext)
    render(createElement(App))
    await screen.findByRole('button', { name: 'WEB-1 te necesita' })
    act(() => api.menu({ kind: 'select', index: 0 }))
    await screen.findByRole('heading', { name: 'WEB-1' })
    act(() => api.menu({ kind: 'focusMode' }))
    await screen.findByRole('button', { name: 'Salir del foco' })

    // The pill names the oldest waiting one other than the open one, «+1» for the rest; selection unchanged.
    const pill = await screen.findByRole('button', { name: 'WEB-3 te necesita' })
    expect(pill.parentElement?.textContent).toContain('+1')
    expect(screen.queryByRole('button', { name: 'WEB-1 te necesita' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'WEB-1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Volver a/ })).toBeNull()
    await vi.waitFor(() => expect(setNext).toHaveBeenLastCalledWith(true))

    // ⌘↩ jumps to it and keeps focus on.
    act(() => api.menu({ kind: 'next' }))
    expect(await screen.findByRole('heading', { name: 'WEB-3' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Salir del foco' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    // A later jump (pressing the pill) and a manual switch do not change where «Volver» goes.
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'WEB-1 te necesita' }))
    expect(await screen.findByRole('heading', { name: 'WEB-1' })).toBeTruthy()
    act(() => api.menu({ kind: 'select', index: 3 }))
    expect(await screen.findByRole('heading', { name: 'WEB-4' })).toBeTruthy()
    // «Volver a» returns to the workspace of the first jump, then is forgotten.
    await user.click(await screen.findByRole('button', { name: 'Volver a WEB-1' }))
    expect(await screen.findByRole('heading', { name: 'WEB-1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Volver a/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Salir del foco' })).toBeTruthy()

    // ⌘⌥← does the same.
    act(() => api.menu({ kind: 'next' }))
    await screen.findByRole('heading', { name: 'WEB-3' })
    act(() => api.menu({ kind: 'back' }))
    expect(await screen.findByRole('heading', { name: 'WEB-1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Volver a/ })).toBeNull()

    // Leaving focus forgets it.
    act(() => api.menu({ kind: 'next' }))
    await screen.findByRole('button', { name: 'Volver a WEB-1' })
    await user.click(screen.getByRole('button', { name: 'Salir del foco' }))
    act(() => api.menu({ kind: 'focusMode' }))
    await screen.findByRole('button', { name: 'Salir del foco' })
    expect(screen.queryByRole('button', { name: /^Volver a/ })).toBeNull()

    // So does removing that workspace: ⌘⌥← then stays where it is.
    act(() => api.menu({ kind: 'select', index: 1 }))
    await screen.findByRole('heading', { name: 'WEB-2' })
    act(() => api.menu({ kind: 'next' }))
    await screen.findByRole('heading', { name: 'WEB-1' })
    await screen.findByRole('button', { name: 'Volver a WEB-2' })
    workspaces.splice(1, 1)
    act(() => api.menu({ kind: 'back' }))
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: /^Volver a/ })).toBeNull())
    expect(screen.getByRole('heading', { name: 'WEB-1' })).toBeTruthy()

    // Nobody waiting but the open one: no pill, ⌘↩ disabled and never opens the task.
    cleanup()
    const alone = mockApi({ workspaces: workspaces.slice(0, 1), nextup: [{ kind: 'agent', id: 'aaaaaaa1' }, { kind: 'task', key: 'WEB-10' }] })
    render(createElement(App))
    await screen.findByRole('button', { name: 'WEB-1 te necesita' })
    act(() => alone.menu({ kind: 'select', index: 0 }))
    await screen.findByRole('heading', { name: 'WEB-1' })
    act(() => alone.menu({ kind: 'focusMode' }))
    await screen.findByRole('button', { name: 'Salir del foco' })
    await vi.waitFor(() => expect(vi.mocked(alone.menuApi.setNext)).toHaveBeenLastCalledWith(false))
    expect(screen.queryByRole('button', { name: /te necesita$/ })).toBeNull()
    act(() => alone.menu({ kind: 'next' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: 'WEB-1' })).toBeTruthy()
  })
})
