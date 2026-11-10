// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const repos: RepoView[] = [{ id: 'web', path: '/w', mode: 'worktree', reason: '' }]
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

async function openDialog() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Tareas/))
  await user.click(await screen.findByRole('button', { name: 'Nueva tarea' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nueva tarea' })
  return { user, dialog, text: within(dialog).getByLabelText('¿Qué hay que hacer?'), branch: within(dialog).getByLabelText('Rama') as HTMLInputElement, go: within(dialog).getByRole('button', { name: 'Empezar' }) }
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('own task', () => {
  it('own task opens a workspace with its text', async () => {
    const api = mockApi({ repos })
    const { user, dialog, text, go } = await openDialog()
    await user.type(text, 'Añadir filtro de laboratorios')
    await user.selectOptions(within(dialog).getByLabelText('Repo'), 'web')
    await user.selectOptions(within(dialog).getByLabelText('Modelo'), 'sonnet')
    await user.click(go)

    await vi.waitFor(() => expect(api.ws.open).toHaveBeenCalledWith('web', 'anadir-filtro-de-laboratorios', 'claude', 'sonnet', 'Añadir filtro de laboratorios'))
    await vi.waitFor(() => expect(rail(/Trabajo/).getAttribute('aria-current')).toBe('page'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('own task needs text', async () => {
    mockApi({ repos })
    const { user, dialog, text, go } = await openDialog()
    await user.selectOptions(within(dialog).getByLabelText('Repo'), 'web')
    expect(go.hasAttribute('disabled')).toBe(true)
    await user.type(text, '   ')
    expect(go.hasAttribute('disabled')).toBe(true)
    expect(text.getAttribute('maxlength')).toBe('2000')
    await user.type(text, 'x')
    expect(go.hasAttribute('disabled')).toBe(false)
  })

  it('own task needs a repo', async () => {
    mockApi({ repos: [] })
    const { user, dialog, text, go } = await openDialog()
    await user.type(text, 'algo')
    expect(within(dialog).getByText('Añade un repo en Ajustes → Repos')).toBeTruthy()
    expect(go.hasAttribute('disabled')).toBe(true)
    await user.click(within(dialog).getByRole('button', { name: 'Ir a Ajustes' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rail(/Ajustes/).getAttribute('aria-current')).toBe('page')
  })

  it('own task works without jira', async () => {
    mockApi({ repos, noJira: true })
    const { dialog } = await openDialog()
    expect(dialog).toBeTruthy()
  })

  it('branch follows the text until edited', async () => {
    mockApi({ repos })
    const { user, text, branch } = await openDialog()
    await user.type(text, 'fix: bug-in api, ya')
    expect(branch.value).toBe('fix-bug-in-api-ya')
    await user.clear(text)
    await user.type(text, 'Una frase bastante larga con muchísimas palabras')
    expect(branch.value).toBe('una-frase-bastante-larga-con')
    await user.clear(branch)
    await user.type(text, ' más')
    expect(branch.value).toBe('')
    await user.type(branch, 'mi-rama')
    await user.type(text, ' otra')
    expect(branch.value).toBe('mi-rama')
  })

  it('new work without text opens plain claude', async () => {
    const api = mockApi({ repos })
    const user = userEvent.setup()
    render(createElement(App))
    const start = async (text: string) => {
      await user.click(await screen.findByRole('button', { name: '＋ Nuevo trabajo' }))
      const dialog = await screen.findByRole('dialog', { name: 'Nuevo trabajo' })
      if (text) await user.type(within(dialog).getByLabelText(/¿Qué hay que hacer\?/), text)
      const branch = within(dialog).getByLabelText('Rama')
      await user.clear(branch)
      await user.type(branch, 'mi-rama')
      await vi.waitFor(() => expect((within(dialog).getByLabelText('Repo') as HTMLSelectElement).value).toBe('web'))
      await user.click(within(dialog).getByRole('button', { name: 'Empezar' }))
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    }

    await start('')
    expect(vi.mocked(api.ws.open).mock.calls.at(-1)).toEqual(['web', 'mi-rama', 'claude', 'default'])
    await start('Arreglar el aviso')
    expect(vi.mocked(api.ws.open).mock.calls.at(-1)).toEqual(['web', 'mi-rama', 'claude', 'default', 'Arreglar el aviso'])
  })
})
