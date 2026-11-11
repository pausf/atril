// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi, WorkspaceView } from '../preload/api'
import { OwnTaskDialog } from './inbox/OwnTaskDialog'

afterEach(cleanup)

describe('new work dialog', () => {
  it('a dirty copy offers a worktree this time', async () => {
    const started = { id: 'w1', branch: 'qa-auto' } as WorkspaceView
    const open = vi
      .fn()
      .mockResolvedValueOnce({ error: 'Tu copia de shop-web tiene 5 cambios sin commitear en feat/x: no puedo pasarla a qa-auto sin mezclarlos.', detail: ' M main.js', fix: 'worktree' })
      .mockResolvedValueOnce({ workspace: started })
    window.atril = { repos: { list: async () => [{ id: 'shop-web', path: '/r', mode: 'in-place', reason: '' }] }, workspaces: { open } } as unknown as AtrilApi
    const onStarted = vi.fn(async () => undefined)
    const user = userEvent.setup()
    render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: () => undefined, onStarted }))

    await user.type(screen.getByRole('textbox', { name: /Qué hay que hacer/ }), 'haz un QA')
    await user.clear(await screen.findByLabelText('Rama'))
    await user.type(screen.getByLabelText('Rama'), 'qa-auto')
    await user.click(screen.getByRole('button', { name: 'Empezar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Tu copia de shop-web tiene 5 cambios')
    expect(alert.textContent).toContain('No he creado el trabajo.')
    const folded = alert.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('code')!.textContent).toBe(' M main.js')

    await user.click(screen.getByRole('button', { name: 'Usar un worktree esta vez' }))
    expect(open).toHaveBeenLastCalledWith('shop-web', 'qa-auto', 'claude', 'default', 'haz un QA', false, true)
    expect(onStarted).toHaveBeenCalledWith(started)
  })
})
