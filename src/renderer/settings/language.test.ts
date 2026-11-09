// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiState } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

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
})
