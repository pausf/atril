// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi, JiraIssue, WorkRefusal, WorkspaceView } from '../preload/api'
import { OwnTaskDialog } from './inbox/OwnTaskDialog'
import { StartDialog } from './inbox/StartDialog'
import { WorkspaceList } from './components/WorkspaceList'
import { Workspace } from './components/Workspace'
import { NavigationContext } from './settings/navigation'
import { mockApi } from './mockApi'

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
    await user.selectOptions(screen.getByLabelText('Esfuerzo'), 'high')
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(open).toHaveBeenLastCalledWith('shop-web', 'qa-auto', 'claude', 'default', 'haz un QA', false, false, 'high')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Tu copia de shop-web tiene 5 cambios')
    expect(alert.textContent).toContain('No he creado el trabajo.')
    const folded = alert.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('code')!.textContent).toBe(' M main.js')

    await user.click(screen.getByRole('button', { name: 'Usar un worktree esta vez' }))
    expect(open).toHaveBeenLastCalledWith('shop-web', 'qa-auto', 'claude', 'default', 'haz un QA', false, true, 'high')
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
  it('a suggestion is shown and used only on click', async () => {
    const open = vi.fn().mockResolvedValue({ workspace: { id: 'w3', branch: 'b' } as WorkspaceView })
    window.atril = { repos: { list: async () => [{ id: 'shop-web', path: '/r', mode: 'worktree', reason: '' }] }, workspaces: { open } } as unknown as AtrilApi
    const user = userEvent.setup()
    render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: () => undefined, onStarted: async () => undefined }))
    const model = screen.getByLabelText<HTMLSelectElement>('Modelo')
    const effort = screen.getByLabelText<HTMLSelectElement>('Esfuerzo')
    const shown = (): HTMLElement | null => screen.queryByText(/Sugerido:/)

    await user.type(screen.getByRole('textbox', { name: /Qué hay que hacer/ }), 'Añadir filtro')
    expect(shown()).toBeNull()
    await user.type(screen.getByRole('textbox', { name: /Qué hay que hacer/ }), ' y arregla el fallo del carrito')
    expect(shown()!.textContent).toContain('Sugerido: Sonnet · Medio')
    expect(shown()!.textContent).toContain('Un arreglo acotado: Sonnet lo hace bien a mitad de precio que Opus.')
    // Never by itself: the selects keep the person's choice until «Usar».
    expect([model.value, effort.value]).toEqual(['default', 'default'])

    await user.click(screen.getByRole('button', { name: 'Usar' }))
    expect([model.value, effort.value]).toEqual(['sonnet', 'medium'])
    expect(shown()).toBeNull()
    // One of the two moved away: it shows again.
    await user.selectOptions(effort, 'high')
    expect(shown()).not.toBeNull()
    await user.selectOptions(effort, 'medium')
    expect(shown()).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(open).toHaveBeenLastCalledWith('shop-web', expect.any(String), 'claude', 'sonnet', 'Añadir filtro y arregla el fallo del carrito', false, false, 'medium')
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

  it('settings and git fixes do what they say', async () => {
    const SETTINGS: WorkRefusal = { error: 'La carpeta de shop-web ya no existe (/r).', fix: 'settings' }
    const GIT: WorkRefusal = { error: 'git no funciona en este Mac.', detail: 'xcode-select: note: No developer tools were found, requesting install.', fix: 'git' }
    const installTool = vi.fn().mockResolvedValue({ ok: true })
    const openSettings = vi.fn()
    const ws = { id: 'w1', repoId: 'shop-web', branch: 'feat/x', mode: 'worktree', path: '/wt', alive: false, agent: 'claude', session: 's', paneId: '%1', baseCommit: 'a' } as WorkspaceView
    // A full mock per place, with the one answer that place gets swapped in.
    const api = (patch: (a: AtrilApi) => void): void => {
      mockApi({ repos: [{ id: 'shop-web', path: '/r', mode: 'worktree', reason: '', health: 'ok' }] })
      window.atril.installTool = installTool
      patch(window.atril)
    }
    const user = userEvent.setup()
    // Each place a workspace problem shows up: press its fix, then check it did what it said.
    const press = async (refusal: WorkRefusal): Promise<void> => {
      const button = await screen.findByRole('button', { name: refusal.fix === 'settings' ? 'Abrir Ajustes' : 'Instalar herramientas de Xcode' })
      await user.click(button)
    }
    const expectDone = (refusal: WorkRefusal, settingsCalls: number): void => {
      if (refusal.fix === 'settings') expect(openSettings).toHaveBeenCalledTimes(settingsCalls)
      else expect(installTool).toHaveBeenLastCalledWith('git')
    }
    const withNav = (el: ReturnType<typeof createElement>) => createElement(NavigationContext.Provider, { value: { openSettings, openWorkspace: () => undefined } }, el)
    const issue: JiraIssue = { key: 'PF-1', summary: 'x', type: 'Task', status: 'To Do', statusId: '1', project: 'PF', components: [], group: 'todo' }

    let settingsCalls = 0
    for (const refusal of [SETTINGS, GIT]) {
      if (refusal.fix === 'settings') settingsCalls++
      // New work.
      api((a) => (a.workspaces.open = vi.fn().mockResolvedValue(refusal)))
      render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: openSettings, onStarted: async () => undefined }))
      await user.type(await screen.findByLabelText('Rama'), 'x')
      await user.click(screen.getByRole('button', { name: 'Empezar' }))
      await press(refusal)
      expectDone(refusal, settingsCalls)
      cleanup()

      // Start from Jira.
      if (refusal.fix === 'settings') settingsCalls++
      api((a) => {
        a.jira.proposeStart = vi.fn().mockResolvedValue({ repoId: 'shop-web', branch: 'PF-1', mode: 'worktree', reason: '', command: 'claude' })
        a.jira.start = vi.fn().mockResolvedValue(refusal)
      })
      render(withNav(createElement(StartDialog, { issue, onClose: () => undefined, onStarted: async () => undefined, onOpenWorkspace: () => undefined })))
      const start = await screen.findByRole<HTMLButtonElement>('button', { name: 'Empezar' })
      await vi.waitFor(() => expect(start.disabled).toBe(false))
      await user.click(start)
      await press(refusal)
      expectDone(refusal, settingsCalls)
      cleanup()

      // The workspace row (closing) in the sidebar.
      if (refusal.fix === 'settings') settingsCalls++
      api(() => undefined)
      render(withNav(createElement(WorkspaceList, { workspaces: [ws], selected: null, onSelect: () => undefined, onRemove: async () => refusal, onForget: async () => ({ ok: true as const }) })))
      await user.click(screen.getByRole('button', { name: 'Quitar feat/x' }))
      await press(refusal)
      expectDone(refusal, settingsCalls)
      cleanup()

      // The reopen bar of a stopped work.
      if (refusal.fix === 'settings') settingsCalls++
      api((a) => (a.workspaces.reopen = vi.fn().mockResolvedValue(refusal)))
      render(withNav(createElement(Workspace, { ws, flow: null })))
      await user.click(await screen.findByRole('button', { name: 'Volver a abrir' }))
      await press(refusal)
      expectDone(refusal, settingsCalls)
      cleanup()
    }
  })
})
