// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RepoView, UiState } from '../preload/api'
import { App } from './App'
import { issue, mockApi, mockSystemTheme, workspace } from './mockApi'

const repos: RepoView[] = [{ id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found' }]
const data = {
  workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2')],
  repos,
  issues: [issue('PF-10', 'todo'), issue('PF-11', 'todo'), issue('PF-12', 'review')]
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const section = (name: RegExp) => screen.getByRole('button', { name })

describe('foldable sections', () => {
  it('section title folds the section and keeps its count', async () => {
    const user = userEvent.setup()
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const api = mockApi(data, stored)
    const { unmount } = render(createElement(App))
    await screen.findByText('PF-2')

    const work = section(/^Trabajo en marcha\s*2$/)
    expect(work.tagName).toBe('BUTTON')
    expect(work.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: /^PF-2(?!\d)/ })).toBeTruthy()

    await user.click(work)
    expect(work.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: /^PF-2(?!\d)/ })).toBeNull()
    expect(work.textContent).toContain('2')
    expect(api.ui.set).toHaveBeenLastCalledWith({ folded: { work: true } })

    // Tareas groups: review starts folded with its count; the others start open.
    await user.click(screen.getByRole('button', { name: 'Tareas' }))
    const todo = section(/^Por empezar\s*2$/)
    const review = section(/^En revisión y despliegue\s*1$/)
    expect(todo.getAttribute('aria-expanded')).toBe('true')
    expect(review.getAttribute('aria-expanded')).toBe('false')
    await user.click(todo)
    expect(todo.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Empezar PF-10' })).toBeNull()
    expect(todo.textContent).toContain('2')
    await user.click(review)
    expect(screen.getByText('PF-12')).toBeTruthy()

    // A restart reads ui.json: the same sections come back folded.
    unmount()
    mockApi(data, stored)
    render(createElement(App))
    await screen.findByText('Trabajo en marcha')
    expect(section(/^Trabajo en marcha\s*2$/).getAttribute('aria-expanded')).toBe('false')
    await user.click(screen.getByRole('button', { name: 'Tareas' }))
    expect(section(/^Por empezar\s*2$/).getAttribute('aria-expanded')).toBe('false')
    expect(section(/^En revisión y despliegue\s*1$/).getAttribute('aria-expanded')).toBe('true')
  })

  it('sidebar offers new work and no repos', async () => {
    const user = userEvent.setup()
    mockApi(data)
    render(createElement(App))
    await screen.findByText('PF-2')
    expect(screen.queryByRole('button', { name: /^Repos/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: '＋ Nuevo trabajo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuevo trabajo' })).toBeTruthy()
  })
})
