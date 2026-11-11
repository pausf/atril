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
    // Not connected is not a failure: no problem, no retry.
    expect(screen.queryByText('No puedo enseñarte tus tareas.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Volver a comprobar' })).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: /Ajustes/ }))
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('a connected jira failure shows its problem and button', async () => {
    mockApi()
    const user = userEvent.setup()
    const openSettings = vi.fn()
    const show = (result: InboxState['result'], refresh: () => Promise<void>) =>
      render(
        createElement(
          NavigationContext.Provider,
          { value: { openSettings } },
          createElement(Inbox, { inbox: { result, issues: [], loading: false, refresh }, onStart: () => {}, onOpenWorkspace: () => {}, onNewTask: () => {} })
        )
      )

    // Passing: «Volver a comprobar» reads Jira again.
    const refresh = vi.fn(async () => {})
    show({ error: 'failed', message: 'Jira está fallando ahora mismo.', detail: 'HTTP 503', fix: 'retry' }, refresh)
    const alert = screen.getByRole('alert')
    expect(alert.querySelector('b')?.textContent).toBe('Jira está fallando ahora mismo.')
    expect(alert.textContent).toContain('No puedo enseñarte tus tareas.')
    expect(alert.textContent).not.toContain('Conecta Jira en Ajustes')
    expect(alert.querySelector('details:not([open]) code')?.textContent).toBe('HTTP 503')
    const before = refresh.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Volver a comprobar' }))
    expect(refresh.mock.calls.length).toBe(before + 1)
    expect(screen.queryByRole('button', { name: 'Abrir Ajustes' })).toBeNull()
    cleanup()

    // A rejected token, though saved: the person fixes it in Ajustes.
    show({ error: 'failed', message: 'Jira ha rechazado tu token.', detail: 'HTTP 401', fix: 'settings' }, async () => {})
    expect(screen.getByRole('alert').textContent).not.toContain('Conecta Jira en Ajustes')
    expect(screen.queryByRole('button', { name: 'Volver a comprobar' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Abrir Ajustes' }))
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('a board that cannot be read folds its code', () => {
    mockApi()
    const issues = [issue('PF-1', 'todo')]
    const groups = [{ id: 'todo', title: 'Por empezar', folded: false, keys: ['PF-1'] }]
    const notice = { text: 'No puedo leer el tablero: Jira no encuentra esa dirección.', detail: 'HTTP 404' }
    render(createElement(Inbox, { inbox: { result: { issues, groups, notice }, issues, loading: false, refresh: async () => {} }, onStart: () => {}, onOpenWorkspace: () => {}, onNewTask: () => {} }))
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('No puedo leer el tablero: Jira no encuentra esa dirección.')
    expect(status.querySelector('details:not([open]) code')?.textContent).toBe('HTTP 404')
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
