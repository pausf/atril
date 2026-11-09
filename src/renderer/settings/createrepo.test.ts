// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

async function openDialog() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Ajustes/))
  const card = await screen.findByRole('region', { name: 'Repos' })
  await user.click(within(card).getByRole('button', { name: /Crear repo/ }))
  return { user, dialog: await screen.findByRole('dialog', { name: 'Crear repo' }) }
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('create repo dialog', () => {
  it('the dialog offers only connected forges', async () => {
    mockApi({ repos: [] })
    const none = await openDialog()
    expect(await within(none.dialog).findByText('Conecta GitHub o GitLab en Ajustes')).toBeTruthy()
    expect(within(none.dialog).getByRole('button', { name: 'Crear' }).hasAttribute('disabled')).toBe(true)
    cleanup()

    mockApi({ repos: [], forges: { github: { saved: true, account: 'pau', site: 'https://github.com' } } })
    const { dialog } = await openDialog()
    const where = (await within(dialog).findByLabelText('Dónde')) as HTMLSelectElement
    await vi.waitFor(() => expect(Array.from(where.options).map((o) => o.textContent)).toEqual(['GitHub · pau']))
    expect((within(dialog).getByLabelText('Clonar y añadir a Atril') as HTMLInputElement).checked).toBe(false)
  })

  it('a public repo needs the confirmation', async () => {
    const api = mockApi({ repos: [], forges: { gitlab: { saved: true, account: 'pau', site: 'https://gitlab.com' } } })
    const { user, dialog } = await openDialog()
    await vi.waitFor(() => expect((within(dialog).getByLabelText('Dónde') as HTMLSelectElement).value).toBe('gitlab'))
    await user.type(within(dialog).getByLabelText('Nombre'), 'mi-repo')
    const create = within(dialog).getByRole('button', { name: 'Crear' })
    expect(create.hasAttribute('disabled')).toBe(false)

    await user.click(within(dialog).getByLabelText('Público'))
    expect(create.hasAttribute('disabled')).toBe(true)
    await user.click(within(dialog).getByLabelText('Entiendo que cualquiera podrá verlo'))
    expect(create.hasAttribute('disabled')).toBe(false)
    await user.click(create)
    await vi.waitFor(() => expect(api.forgeApi.create).toHaveBeenCalledWith({ forge: 'gitlab', name: 'mi-repo', description: '', public: true, confirmPublic: true }))
    expect(await within(dialog).findByText('https://gitlab.com/pau/mi-repo')).toBeTruthy()
  })
})
