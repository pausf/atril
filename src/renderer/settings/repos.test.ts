// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const repos: RepoView[] = [
  { id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found' },
  { id: 'cms', path: '/c', mode: 'in-place', reason: 'web/.env no está versionado' }
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
    const api = mockApi({ repos })
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
