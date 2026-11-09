// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inbox, JiraSummary, type InboxState } from './Inbox'
import { NavigationContext } from '../settings/navigation'
import { mockApi } from '../mockApi'

const issue = (key: string, group: 'todo' | 'doing' | 'review') => ({
  key, summary: key, type: 'Story', status: '', statusId: '', project: 'PF', components: [], group
})

afterEach(cleanup)

describe('jira summary', () => {
  it('sidebar shows a jira summary that opens tareas', async () => {
    const issues = [issue('PF-1', 'doing'), issue('PF-2', 'todo'), issue('PF-3', 'todo'), issue('PF-4', 'review')]
    const inbox: InboxState = { result: { issues, groups: [] }, issues, loading: false, refresh: async () => {} }
    const onOpen = vi.fn()
    render(createElement(JiraSummary, { inbox, onOpen }))

    const button = screen.getByRole('button')
    expect(button.textContent).toContain('Jira: 1 en curso · 2 por empezar')
    // Only counts: no task row is rendered in the sidebar.
    expect(screen.queryByText('PF-1')).toBeNull()
    await userEvent.setup().click(button)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('inbox without a jira token links to ajustes', async () => {
    mockApi()
    const inbox: InboxState = { result: { error: 'unconfigured' }, issues: [], loading: false, refresh: async () => {} }
    const openSettings = vi.fn()
    render(
      createElement(
        NavigationContext.Provider,
        { value: { openSettings } },
        createElement(Inbox, { inbox, onStart: () => {}, onOpenWorkspace: () => {}, onNewTask: () => {} })
      )
    )
    expect(screen.getByRole('alert').textContent).toContain('Conecta Jira en Ajustes')
    await userEvent.setup().click(screen.getByRole('button', { name: /Ajustes/ }))
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('no board keeps the status groups and asks to pick one', async () => {
    mockApi()
    const issues = [issue('PF-1', 'todo'), issue('PF-2', 'doing')]
    const groups = [
      { id: 'todo', title: 'Por empezar', folded: false, keys: ['PF-1'] },
      { id: 'doing', title: 'En curso', folded: false, keys: ['PF-2'] }
    ]
    const notice = { text: 'Elige tu tablero en Ajustes para ver sus columnas', settings: true }
    const inbox: InboxState = { result: { issues, groups, notice }, issues, loading: false, refresh: async () => {} }
    const openSettings = vi.fn()
    render(
      createElement(
        NavigationContext.Provider,
        { value: { openSettings } },
        createElement(Inbox, { inbox, onStart: () => {}, onOpenWorkspace: () => {}, onNewTask: () => {} })
      )
    )

    expect(screen.getByRole('button', { name: /Por empezar/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /En curso/ })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Elige tu tablero en Ajustes para ver sus columnas')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('summary follows the board columns', () => {
    // The category says "review" for all of them: only the columns may decide the counts.
    const issues = ['PF-1', 'PF-2', 'PF-3', 'PF-4', 'PF-5', 'PF-6'].map((k) => issue(k, 'review'))
    const groups = [
      { id: 'col-0', title: 'Backlog', folded: false, keys: ['PF-1'] },
      { id: 'col-1', title: 'To Do', folded: false, keys: ['PF-2', 'PF-3'] },
      { id: 'col-3', title: 'Code Review', folded: false, keys: ['PF-4'] },
      { id: 'outside', title: 'Fuera del tablero', folded: true, keys: ['PF-5', 'PF-6'] }
    ]
    const inbox: InboxState = { result: { issues, groups }, issues, loading: false, refresh: async () => {} }
    render(createElement(JiraSummary, { inbox, onOpen: () => {} }))
    expect(screen.getByRole('button').textContent).toContain('Jira: 3 en curso · 1 por empezar')
  })
})
