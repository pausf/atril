// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiState } from '../../preload/api'
import { App } from '../App'
import { issue, mockApi, mockSystemTheme, workspace } from '../mockApi'

const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: /Pantallas|Screens/ })).getByRole('button', { name })
const group = () => screen.getByRole('group', { name: /Idioma|Language/ })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('language', () => {
  it('language choice persists', async () => {
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const api = mockApi({}, stored)
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(rail(/Ajustes/))
    const pressed = () => within(group()).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)
    expect(within(group()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Español', 'English', 'Sistema'])
    expect(pressed()).toEqual(['Sistema'])

    await user.click(within(group()).getByRole('button', { name: 'English' }))
    expect(api.ui.set).toHaveBeenLastCalledWith({ language: 'en' })
    await vi.waitFor(() => expect(pressed()).toEqual(['English']))

    // A restart reads the stored choice back.
    cleanup()
    mockApi({}, stored)
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /Settings|Ajustes/ }))
    await vi.waitFor(() => expect(within(group()).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)).toEqual(['English']))
  })

  it('the window switches language at once', async () => {
    mockApi({ repos: [], issues: [] })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(rail(/Ajustes/))
    await user.click(within(group()).getByRole('button', { name: 'English' }))
    await screen.findByRole('heading', { name: 'Settings' })
    expect(rail(/^Work/)).toBeTruthy()
    expect(rail(/^Tasks/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeTruthy()
    await user.click(rail(/^Tasks/))
    expect(await screen.findByRole('heading', { name: /^Tasks/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog', { name: 'New task' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.click(rail(/^Work/))
    expect(await screen.findByRole('button', { name: '＋ New work' })).toBeTruthy()
  })

  it('claude and jira text stay as written', async () => {
    const now = Math.floor(Date.now() / 1000)
    mockApi({
      ui: { language: 'en' },
      workspaces: [workspace('aaaaaaa1', 'PF-1', false)],
      activity: { aaaaaaa1: [{ at: now - 5, kind: 'edit', text: 'Editando ListOrders.php' }] },
      issues: [issue('PF-10', 'todo')]
    })
    render(createElement(App))
    // Atril's prefix in English, the file name exactly as written (S17, S28).
    expect((await screen.findAllByText('Editing ListOrders.php')).length).toBeGreaterThan(0)
    await userEvent.setup().click(rail(/^Tasks/))
    expect(await screen.findByText(issue('PF-10', 'todo').summary)).toBeTruthy()
  })
})
