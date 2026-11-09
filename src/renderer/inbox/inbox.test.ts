// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JiraSummary, type InboxState } from './Inbox'

const issue = (key: string, group: 'todo' | 'doing' | 'review') => ({
  key, summary: key, type: 'Story', status: '', project: 'PF', components: [], group
})

describe('jira summary', () => {
  it('sidebar shows a jira summary that opens tareas', async () => {
    const issues = [issue('PF-1', 'doing'), issue('PF-2', 'todo'), issue('PF-3', 'todo'), issue('PF-4', 'review')]
    const inbox: InboxState = { result: { issues }, issues, loading: false, refresh: async () => {} }
    const onOpen = vi.fn()
    render(createElement(JiraSummary, { inbox, onOpen }))

    const button = screen.getByRole('button')
    expect(button.textContent).toContain('Jira: 1 en curso · 2 por empezar')
    // Only counts: no task row is rendered in the sidebar.
    expect(screen.queryByText('PF-1')).toBeNull()
    await userEvent.setup().click(button)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
