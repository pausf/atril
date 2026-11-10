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
})
