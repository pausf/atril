// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi, StateProblem } from '../preload/api'
import { App } from './App'
import { OwnTaskDialog } from './inbox/OwnTaskDialog'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const WS: StateProblem = {
  error: 'No puedo leer workspaces.json: está dañado. No abro ni cierro trabajos hasta que se arregle.',
  detail: 'Unexpected token n in JSON at position 1',
  fix: 'reveal',
  file: 'workspaces'
}
const REPOS: StateProblem = {
  error: 'No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.',
  detail: 'entry 1 has no string "path"',
  fix: 'reveal',
  file: 'repos'
}
const EMPTY = 'Aquí verás cada trabajo con su estado. Crea uno con «＋ Nuevo trabajo», arriba.'
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

describe('damaged state files', () => {
  it('a damaged list shows its problem instead of the empty state', async () => {
    const user = userEvent.setup()
    mockApi({ wsProblem: WS })
    render(createElement(App))
    const sidebar = document.querySelector('aside.col.left') as HTMLElement
    const alert = await within(sidebar).findByRole('alert')
    expect(alert.querySelector('b')!.textContent).toBe(WS.error)
    expect(alert.textContent).toContain('Tus agentes siguen en tmux, pero no puedo enseñártelos.')
    const folded = alert.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('code')!.textContent).toBe(WS.detail)
    expect(sidebar.textContent).not.toContain(EMPTY)
    await user.click(within(alert).getByRole('button', { name: 'Mostrar en Finder' }))
    expect(window.atril.revealState).toHaveBeenCalledWith('workspaces')
    cleanup()

    // An undamaged empty list keeps its empty text; a damaged repos.json alone leaves the list as it is.
    mockApi({ reposProblem: REPOS })
    render(createElement(App))
    expect(await screen.findByText(EMPTY)).toBeTruthy()
    cleanup()
    mockApi({ reposProblem: REPOS, workspaces: [workspace('aaaaaaa1', 'PF-1', false)] })
    render(createElement(App))
    expect(await screen.findByText('PF-1')).toBeTruthy()
    cleanup()

    // W147: a row's refusal with fix 'reveal' offers Finder too.
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], remove: { aaaaaaa1: WS } })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: 'Quitar PF-1' }))
    const row = (screen.getByRole('button', { name: 'Quitar PF-1' }).closest('.ws-item') as HTMLElement)
    await user.click(await within(row).findByRole('button', { name: 'Mostrar en Finder' }))
    expect(window.atril.revealState).toHaveBeenCalledWith('workspaces')
    cleanup()

    // And the new-work dialog, both for its repo list and for an open refused by a damaged file.
    const reveal = vi.fn(async () => true)
    const open = vi.fn().mockResolvedValue(WS)
    window.atril = { repos: { list: async () => [{ id: 'shop-web', path: '/r', mode: 'worktree', reason: '' }] }, workspaces: { open }, revealState: reveal } as unknown as AtrilApi
    render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: () => undefined, onStarted: async () => undefined }))
    await user.type(await screen.findByLabelText('Rama'), 'solo')
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(await screen.findByRole('button', { name: 'Mostrar en Finder' }))
    expect(reveal).toHaveBeenLastCalledWith('workspaces')
    cleanup()
    window.atril = { repos: { list: async () => ({ problem: REPOS }) }, workspaces: { open }, revealState: reveal } as unknown as AtrilApi
    render(createElement(OwnTaskDialog, { textOptional: true, onClose: () => undefined, onOpenSettings: () => undefined, onStarted: async () => undefined }))
    const repoAlert = await screen.findByRole('alert')
    expect(repoAlert.querySelector('b')!.textContent).toBe(REPOS.error)
    await user.click(within(repoAlert).getByRole('button', { name: 'Mostrar en Finder' }))
    expect(reveal).toHaveBeenLastCalledWith('repos')
  })

  it('the repos card shows a damaged list instead of empty', async () => {
    const user = userEvent.setup()
    mockApi({ reposProblem: REPOS })
    render(createElement(App))
    await user.click(rail(/Ajustes/))
    const card = await screen.findByRole('region', { name: 'Repos' })
    const alert = await within(card).findByRole('alert')
    expect(alert.querySelector('b')!.textContent).toBe(REPOS.error)
    const folded = alert.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('code')!.textContent).toBe(REPOS.detail)
    expect(card.textContent).not.toContain('Aún no hay ninguno')
    expect(within(card).queryByRole('button', { name: /Añadir repo/ })).toBeNull()
    await user.click(within(alert).getByRole('button', { name: 'Mostrar en Finder' }))
    expect(window.atril.revealState).toHaveBeenCalledWith('repos')
  })
})
