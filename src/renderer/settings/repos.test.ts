// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const repos: RepoView[] = [
  { id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found', health: 'ok' },
  { id: 'cms', path: '/c', mode: 'in-place', reason: 'web/.env no está versionado', health: 'ok' }
]
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

async function openCard() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Ajustes/))
  const card = await screen.findByRole('region', { name: 'Repos' })
  return { user, card }
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('repos card', () => {
  it('repos card lists and sets the mode', async () => {
    const api = mockApi({ repos: [...repos, { id: 'gone', path: '/g', mode: 'worktree', reason: '', health: 'missing' }] })
    const { user, card } = await openCard()
    expect(within(card).getByText('/w')).toBeTruthy()
    const mode = within(card).getByLabelText('Modo de web') as HTMLSelectElement
    expect(Array.from(mode.options).map((o) => o.textContent)).toEqual(['Auto · worktree', 'Worktree', 'In-place'])
    expect(mode.value).toBe('auto')

    await user.selectOptions(mode, 'in-place')
    expect(api.reposApi.setOverride).toHaveBeenLastCalledWith('web', 'in-place')
    await vi.waitFor(() => expect((within(card).getByLabelText('Modo de web') as HTMLSelectElement).value).toBe('in-place'))
    await user.selectOptions(within(card).getByLabelText('Modo de web'), 'auto')
    expect(api.reposApi.setOverride).toHaveBeenLastCalledWith('web', null)

    // The in-place one says why.
    expect(within(card).getByText('web/.env no está versionado')).toBeTruthy()
    expect(within(card).queryByText('worktree: no signal found')).toBeNull()
    // Only a healthy repo has a mode to choose.
    expect(within(card).getByText('/g')).toBeTruthy()
    expect(within(card).queryByLabelText('Modo de gone')).toBeNull()
  })

  it('any repo can be removed and a refusal can be dismissed', async () => {
    const api = mockApi({ repos, removeRepo: { cms: { error: 'cms tiene trabajos abiertos: ciérralos antes.' } } })
    const { user, card } = await openCard()
    const row = (id: string) => within(card).getByText(id).closest('li') as HTMLElement

    await user.click(within(row('cms')).getByRole('button', { name: 'Quitar el repo' }))
    expect(api.reposApi.remove).toHaveBeenCalledWith('cms')
    const alert = await within(row('cms')).findByRole('alert')
    expect(alert.textContent).toContain('cms tiene trabajos abiertos: ciérralos antes.')
    await user.click(within(alert).getByRole('button', { name: 'Cerrar aviso' }))
    expect(within(card).queryByRole('alert')).toBeNull()

    await user.click(within(row('web')).getByRole('button', { name: 'Quitar el repo' }))
    await vi.waitFor(() => expect(within(card).queryByText('/w')).toBeNull())
    expect(within(card).getByText('/c')).toBeTruthy()
  })

  it('a broken repo can be found again', async () => {
    const broken: RepoView[] = [
      { id: 'gone', path: '/g', mode: 'worktree', reason: '', health: 'missing' },
      { id: 'plain', path: '/p', mode: 'worktree', reason: '', health: 'not-git' }
    ]
    const api = mockApi({ repos: broken, relocateRepo: { plain: { error: 'Esa carpeta ya es el repo gone.' } } })
    const { user, card } = await openCard()
    const row = (id: string) => within(card).getByText(id).closest('li') as HTMLElement

    expect(await within(row('gone')).findByText('Carpeta no encontrada')).toBeTruthy()
    expect(within(row('plain')).getByText('No es un repo de git')).toBeTruthy()
    expect(within(card).queryByRole('combobox')).toBeNull()

    await user.click(within(row('plain')).getByRole('button', { name: 'Buscar la carpeta…' }))
    expect(api.reposApi.relocate).toHaveBeenCalledWith('plain')
    expect((await within(row('plain')).findByRole('alert')).textContent).toContain('Esa carpeta ya es el repo gone.')

    await user.click(within(row('gone')).getByRole('button', { name: 'Buscar la carpeta…' }))
    expect(api.reposApi.relocate).toHaveBeenLastCalledWith('gone')
    await vi.waitFor(() => expect(within(card).getByLabelText('Modo de gone')).toBeTruthy())
    expect(within(row('gone')).queryByText('Carpeta no encontrada')).toBeNull()
  })

  it('adding a repo asks for a free id', async () => {
    const api = mockApi({ repos, addRepo: { error: 'id-taken', suggested: 'web-2', path: '/x' } })
    const { user, card } = await openCard()
    await user.click(within(card).getByRole('button', { name: /Añadir repo/ }))
    const id = await within(card).findByRole('textbox')
    expect((id as HTMLInputElement).value).toBe('web-2')
    await user.clear(id)
    await user.type(id, 'shop')
    await user.click(within(card).getByRole('button', { name: 'Usar este id' }))
    expect(api.reposApi.addWithId).toHaveBeenCalledWith('/x', 'shop')
  })

  it('a folder that is not git is refused', async () => {
    const api = mockApi({ repos, addRepo: { error: 'not-a-git-repo', path: '/x' } })
    const { user, card } = await openCard()
    await user.click(within(card).getByRole('button', { name: /Añadir repo/ }))
    expect(await within(card).findByText('Esa carpeta no es un repositorio git.')).toBeTruthy()
    expect(api.reposApi.addWithId).not.toHaveBeenCalled()
  })
})
