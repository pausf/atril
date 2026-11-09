// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView } from '../preload/api'
import { App } from './App'
import { issue, mockApi, mockSystemTheme, workspace } from './mockApi'

const repos: RepoView[] = [{ id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found' }]
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('next up', () => {
  it('command enter opens the next item', async () => {
    // The stopped workspace: a live one would mount xterm, which jsdom cannot run.
    const agent = mockApi({
      workspaces: [workspace('aaaaaaa1', 'WEB-1', false)],
      nextup: [{ kind: 'agent', id: 'aaaaaaa1' }, { kind: 'task', key: 'WEB-10' }],
      issues: [issue('WEB-10', 'todo')],
      repos
    })
    render(createElement(App))
    await screen.findByRole('button', { name: 'WEB-1 te necesita' })
    const setNext = vi.mocked(agent.menuApi.setNext)
    await vi.waitFor(() => expect(setNext).toHaveBeenLastCalledWith(true))

    // Away from Trabajo and Tareas the menu item is disabled.
    await userEvent.setup().click(rail(/Ajustes/))
    await vi.waitFor(() => expect(setNext).toHaveBeenLastCalledWith(false))
    await userEvent.setup().click(rail(/Tareas/))
    await vi.waitFor(() => expect(setNext).toHaveBeenLastCalledWith(true))

    act(() => agent.menu({ kind: 'next' }))
    expect(await screen.findByRole('heading', { name: 'WEB-1' })).toBeTruthy()
    expect(rail(/Trabajo/).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('dialog')).toBeNull()

    // With only a task waiting, the first item is its Start dialog.
    cleanup()
    const task = mockApi({ nextup: [{ kind: 'task', key: 'WEB-10' }], issues: [issue('WEB-10', 'todo')], repos })
    render(createElement(App))
    await screen.findByRole('button', { name: 'WEB-10 por empezar' })
    await vi.waitFor(() => expect(vi.mocked(task.menuApi.setNext)).toHaveBeenLastCalledWith(true))
    act(() => task.menu({ kind: 'next' }))
    expect((await screen.findByRole('dialog')).textContent).toContain('Empezar WEB-10')

    // A task not loaded yet in the renderer falls back to Tareas instead of doing nothing.
    cleanup()
    const stale = mockApi({ nextup: [{ kind: 'task', key: 'WEB-11' }], repos })
    render(createElement(App))
    await vi.waitFor(() => expect(vi.mocked(stale.menuApi.setNext)).toHaveBeenLastCalledWith(true))
    act(() => stale.menu({ kind: 'next' }))
    await vi.waitFor(() => expect(rail(/Tareas/).getAttribute('aria-current')).toBe('page'))
    expect(screen.queryByRole('dialog')).toBeNull()

    // An empty list disables it.
    cleanup()
    const none = mockApi({ repos })
    render(createElement(App))
    await vi.waitFor(() => expect(vi.mocked(none.menuApi.setNext)).toHaveBeenLastCalledWith(false))
  })

  it('one click starts a remembered task', async () => {
    const api = mockApi({
      issues: [issue('PF-10', 'todo')],
      repos,
      proposal: { repoId: 'web', branch: 'PF-10', mode: 'worktree', reason: '', command: 'claude' }
    })
    render(createElement(App))
    const user = userEvent.setup()
    await user.click(rail(/Tareas/))

    await user.click(await screen.findByRole('button', { name: 'Empezar PF-10' }))

    await vi.waitFor(() => expect(api.jira.start).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.jira.start).mock.calls[0]?.[0]).toEqual({ key: 'PF-10', components: [], group: 'todo', repoId: 'web', branch: 'PF-10', model: 'default' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await vi.waitFor(() => expect(rail(/Trabajo/).getAttribute('aria-current')).toBe('page'))
  })

  it('option click or unknown project opens the dialog', async () => {
    const user = userEvent.setup()
    const known = mockApi({
      issues: [issue('PF-10', 'todo')],
      repos,
      proposal: { repoId: 'web', branch: 'PF-10', mode: 'worktree', reason: '', command: 'claude' }
    })
    render(createElement(App))
    await user.click(rail(/Tareas/))
    await user.keyboard('{Alt>}')
    await user.click(await screen.findByRole('button', { name: 'Empezar PF-10' }))
    await user.keyboard('{/Alt}')
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(known.jira.start).not.toHaveBeenCalled()

    // First task of a project: nothing remembered yet.
    cleanup()
    const unknown = mockApi({ issues: [issue('PF-10', 'todo')], repos })
    render(createElement(App))
    await user.click(rail(/Tareas/))
    await user.click(await screen.findByRole('button', { name: 'Empezar PF-10' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(unknown.jira.start).not.toHaveBeenCalled()

    // The proposed branch is taken: the repo is known but PF-10 needs a suffix.
    cleanup()
    const taken = mockApi({
      issues: [issue('PF-10', 'todo')],
      repos,
      proposal: { repoId: 'web', branch: 'PF-10B', mode: 'worktree', reason: '', command: 'claude', note: '«PF-10» ya existe en este repo: se propone «PF-10B»' }
    })
    render(createElement(App))
    await user.click(rail(/Tareas/))
    await user.click(await screen.findByRole('button', { name: 'Empezar PF-10' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(taken.jira.start).not.toHaveBeenCalled()
  })
})
