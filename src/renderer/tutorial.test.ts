// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { menuTemplate } from '../main/menu'
import { App } from './App'
import { issue, mockApi, mockSystemTheme, workspace } from './mockApi'
import { STEPS } from './tour/Tour'

const data = { workspaces: [workspace('aaaaaaa1', 'PF-1')], issues: [issue('PF-10', 'todo')] }

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const tip = () => screen.getByRole('dialog', { name: /./ })
const spot = () => document.querySelector<HTMLElement>('.spot')

describe('tutorial', () => {
  it('first launch runs the tutorial over every element', async () => {
    const user = userEvent.setup()
    mockApi(data, { tutorialSeen: false, theme: 'auto', folded: {} })
    render(createElement(App))

    expect((await screen.findByRole('heading', { name: 'Bienvenido a Atril' })).textContent).toBeTruthy()
    expect(spot()).toBeNull()
    await user.click(screen.getByRole('button', { name: /Enséñamelo/ }))

    expect(STEPS.map((s) => s.target)).toEqual(['rail', 'new-work', 'tasks', 'workspaces', 'terminal', 'flow', 'mr', 'avisos', 'usage', 'session', 'appearance'])
    for (const [n, step] of STEPS.entries()) {
      // The step switches screens so its target is on screen, then spotlights that real element.
      await waitFor(() => expect(spot()?.dataset['target']).toBe(step.target))
      const target = document.querySelector(`[data-tour="${step.target}"]`)
      expect(target, `[data-tour=${step.target}] exists`).not.toBeNull()
      expect(target?.closest('[hidden]')).toBeNull()
      expect(tip().textContent).toContain(`Paso ${n + 1} de ${STEPS.length}`)
      expect(screen.getByRole('heading', { name: step.title, level: 4 })).toBeTruthy()
      await user.click(screen.getByRole('button', { name: n === STEPS.length - 1 ? 'Terminar' : 'Siguiente' }))
    }
    expect(screen.queryByRole('dialog')).toBeNull()
    // Finishing returns to the main screen.
    expect(document.querySelector('.col.left')?.closest('[hidden]')).toBeNull()
  })

  it('tutorial runs once and reopens from help', async () => {
    const user = userEvent.setup()
    const api = mockApi(data, { tutorialSeen: false, theme: 'auto', folded: {} })
    const { unmount } = render(createElement(App))
    await screen.findByRole('heading', { name: 'Bienvenido a Atril' })
    await user.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.ui.set).toHaveBeenCalledWith({ tutorialSeen: true })
    expect(api.stored.tutorialSeen).toBe(true)

    // The next launch reads ui.json and stays quiet.
    unmount()
    const again = mockApi(data, api.stored)
    render(createElement(App))
    await screen.findByText('PF-1')
    await waitFor(() => expect(again.ui.get).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()

    // Help -> Tutorial exists in the menu and its click reaches the app.
    const help = menuTemplate({ selected: null, count: 0, nextEnabled: false, split: () => {}, send: () => {} }).find((m) => m.role === 'help')
    const item = (help?.submenu as Array<{ label?: string; click?: () => void }>).find((i) => i.label === 'Tutorial')
    expect(item).toBeTruthy()
    act(() => again.menu({ kind: 'tutorial' }))
    expect(await screen.findByRole('heading', { name: 'Bienvenido a Atril' })).toBeTruthy()

    // Finishing it again keeps it seen.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(again.stored.tutorialSeen).toBe(true)
  })

  it('tutorial works with the keyboard alone', async () => {
    const user = userEvent.setup()
    const api = mockApi(data, { tutorialSeen: false, theme: 'auto', folded: {} })
    render(createElement(App))
    await screen.findByRole('heading', { name: 'Bienvenido a Atril' })

    // Focus lands on the primary button; Enter starts.
    expect(document.activeElement?.textContent).toMatch(/Enséñamelo/)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('rail'))
    expect(document.activeElement?.textContent).toBe('Siguiente')

    // → and ← move, Enter on the focused primary advances.
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('new-work'))
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('tasks'))
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('new-work'))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('tasks'))

    // Tab never leaves the tip, in either direction.
    for (let i = 0; i < 7; i++) {
      await user.tab()
      expect(tip().contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 7; i++) {
      await user.tab({ shift: true })
      expect(tip().contains(document.activeElement)).toBe(true)
    }

    // Esc closes and counts as seen.
    expect(api.stored.tutorialSeen).toBe(false)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.stored.tutorialSeen).toBe(true)
  })
})
