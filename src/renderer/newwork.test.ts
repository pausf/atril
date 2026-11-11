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
  it('a blank dirty retry opens plain claude in a worktree', async () => {
    const open = vi
      .fn()
      .mockResolvedValueOnce({ error: 'Tu copia…', detail: '', fix: 'worktree' })
      .mockResolvedValueOnce({ workspace: { id: 'w2', branch: 'solo' } as WorkspaceView })
    window.atril = { repos: { list: async () => [{ id: 'shop-web', path: '/r', mode: 'in-place', reason: '' }] }, workspaces: { open } } as unknown as AtrilApi
    const user = userEvent.setup()
    render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: () => undefined, onStarted: async () => undefined }))
    await user.type(await screen.findByLabelText('Rama'), 'solo')
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(await screen.findByRole('button', { name: 'Usar un worktree esta vez' }))
    expect(open).toHaveBeenLastCalledWith('shop-web', 'solo', 'claude', 'default', undefined, false, true)
  })
  it('a git failure offers terminal for the repo', async () => {
    const open = vi.fn().mockResolvedValue({ error: 'git no ha podido crear la carpeta del trabajo.', detail: "fatal: '/wt/x' already exists", fix: 'terminal' })
    const terminal = vi.fn().mockResolvedValue({ ok: true })
    window.atril = { repos: { list: async () => [{ id: 'shop-web', path: '/r', mode: 'worktree', reason: '' }] }, workspaces: { open, terminal } } as unknown as AtrilApi
    const user = userEvent.setup()
    render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: () => undefined, onStarted: async () => undefined }))
    await user.type(await screen.findByLabelText('Rama'), 'x')
    await user.click(screen.getByRole('button', { name: 'Empezar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.querySelector('b')!.textContent).toBe('git no ha podido crear la carpeta del trabajo.')
    expect(alert.textContent).toContain('No he creado el trabajo.')
    const folded = alert.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(alert.textContent!.replace(folded.textContent!, '')).not.toContain('fatal')
    expect(screen.queryByRole('button', { name: 'Usar un worktree esta vez' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Abrir en Terminal' }))
    expect(terminal).toHaveBeenCalledWith({ repoId: 'shop-web' })
    expect(open).toHaveBeenCalledTimes(1)
  })
})
