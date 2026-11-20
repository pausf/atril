// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JiraIssue, WorkspaceView } from '../../preload/api'
import { StartDialog } from './StartDialog'
import { mockApi } from '../mockApi'

afterEach(cleanup)

const issue = (type: string): JiraIssue => ({ key: 'PF-1', summary: 'Añadir filtro de laboratorios', type, status: 'To Do', statusId: '1', project: 'PF', components: [], group: 'todo' })

function mount(type: string) {
  const proposeStart = vi.fn().mockResolvedValue({ repoId: 'shop-web', branch: 'PF-1', mode: 'worktree', reason: '', command: 'claude' })
  const start = vi.fn().mockResolvedValue({ workspace: { id: 'w1', branch: 'PF-1' } as WorkspaceView })
  mockApi({}, undefined, { repos: { list: async () => [{ id: 'shop-web', path: '/r', mode: 'worktree', reason: '' }] }, jira: { proposeStart, start } })
  render(createElement(StartDialog, { issue: issue(type), onClose: () => undefined, onStarted: async () => undefined, onOpenWorkspace: () => undefined }))
  return { proposeStart, start }
}

describe('start dialog', () => {
  it('the start dialog suggests from the jira type', async () => {
    const { proposeStart, start } = mount('Bug')
    const user = userEvent.setup()
    const line = await screen.findByText(/Sugerido:/)
    expect(line.textContent).toContain('Sugerido: Sonnet · Medio')
    expect(line.textContent).toContain('Un arreglo acotado')
    expect(screen.getByLabelText<HTMLSelectElement>('Modelo').value).toBe('default')
    expect(screen.getByLabelText<HTMLSelectElement>('Esfuerzo').value).toBe('default')

    await user.click(screen.getByRole('button', { name: 'Usar' }))
    expect(screen.getByLabelText<HTMLSelectElement>('Modelo').value).toBe('sonnet')
    expect(screen.getByLabelText<HTMLSelectElement>('Esfuerzo').value).toBe('medium')
    expect(screen.queryByText(/Sugerido:/)).toBeNull()
    // The command shown follows the effort too.
    await waitFor(() => expect(proposeStart).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'PF-1' }), 'shop-web', 'sonnet', false, 'medium'))

    await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Empezar' }).disabled).toBe(false))
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ key: 'PF-1', model: 'sonnet', effort: 'medium' }))
  })

  it('a story with a plain summary suggests nothing', async () => {
    const { proposeStart } = mount('Story')
    await waitFor(() => expect(proposeStart).toHaveBeenCalled())
    expect(screen.queryByText(/Sugerido:/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Usar' })).toBeNull()
  })
})
