// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi } from '../../preload/api'
import { Ajustes } from './Ajustes'
import { ConnectInSettings } from './ConnectInSettings'
import { TopBar } from '../components/TopBar'
import { NavigationContext } from './navigation'

const TOKEN = 'ATATT-super-secret-token'

function mockApi(status: { saved: boolean; account?: string; site?: string; avatar?: string; board?: { id: number; name: string } }) {
  const settings = {
    jira: {
      status: vi.fn().mockResolvedValue(status),
      save: vi.fn().mockResolvedValue({ account: 'Pau Sánchez' }),
      delete: vi.fn().mockResolvedValue(undefined),
      searchBoards: vi.fn().mockResolvedValue([]),
      pickBoard: vi.fn().mockResolvedValue({ ok: true })
    },
    openTokenPage: vi.fn().mockResolvedValue(undefined)
  }
  // The forge cards stay loading here: this file is about the Jira card.
  window.atril = { settings: { ...settings, forge: { status: () => new Promise(() => undefined) } }, repos: { list: async () => [] }, snapshotView: async () => null } as unknown as AtrilApi
  return settings
}

beforeEach(() => vi.restoreAllMocks())
afterEach(cleanup)

describe('settings screen', () => {
  it('saved token cannot be seen again', async () => {
    const api = mockApi({ saved: false })
    const user = userEvent.setup()
    render(createElement(Ajustes))

    await user.click(await screen.findByRole('button', { name: 'Conectar' }))
    await user.type(screen.getByLabelText('Dirección'), 'https://x.atlassian.net')
    await user.type(screen.getByLabelText('Correo'), 'pau@x.com')
    await user.type(screen.getByLabelText('Token'), TOKEN)
    api.jira.status.mockResolvedValue({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' })
    await user.click(screen.getByRole('button', { name: 'Guardar y comprobar' }))

    await screen.findByText('Conectado · Pau Sánchez · x.atlassian.net')
    expect(document.body.innerHTML).not.toContain(TOKEN)
    expect(screen.queryAllByDisplayValue(TOKEN)).toHaveLength(0)
    // The saved row has no credential fields left; the board search is the only input.
    expect(document.querySelectorAll('input:not(#jira-board)')).toHaveLength(0)
    expect(within(screen.getByRole('region', { name: 'Jira' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['Gestionar', 'Reemplazar', 'Borrar'])

    // S5 (amended): a saved row opens with Gestionar, whose body offers only Reemplazar and Borrar.
    cleanup()
    render(createElement(Ajustes))
    const row = screen.getByRole('region', { name: 'Jira' })
    await user.click(await within(row).findByRole('button', { name: 'Gestionar' }))
    expect(within(row.querySelector<HTMLElement>('#jira-body')!).getAllByRole('button').map((b) => b.textContent)).toEqual(['Reemplazar', 'Borrar'])
    expect(document.body.innerHTML).not.toContain(TOKEN)

    await user.click(screen.getByRole('button', { name: 'Reemplazar' }))
    expect((screen.getByLabelText('Token') as HTMLInputElement).value).toBe('')
    expect(screen.getByLabelText('Token')).toHaveProperty('type', 'password')
  })

  it('jira error folds its detail', async () => {
    const api = mockApi({ saved: false })
    api.jira.save.mockResolvedValue({ error: 'No responde nada en https://127.0.0.1:9. Revisa la dirección.', detail: 'ECONNREFUSED' })
    const user = userEvent.setup()
    render(createElement(Ajustes))

    await user.click(await screen.findByRole('button', { name: 'Conectar' }))
    await user.type(screen.getByLabelText('Dirección'), 'https://127.0.0.1:9')
    await user.type(screen.getByLabelText('Correo'), 'pau@x.com')
    await user.type(screen.getByLabelText('Token'), TOKEN)
    await user.click(screen.getByRole('button', { name: 'Guardar y comprobar' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('No responde nada en https://127.0.0.1:9.')
    const folded = alert.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('summary')!.textContent).toBe('Ver detalle')
    expect(folded.querySelector('code')!.textContent).toBe('ECONNREFUSED')
  })

  it('missing token links to ajustes', async () => {
    const openSettings = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      createElement(NavigationContext.Provider, { value: { openSettings } }, createElement(ConnectInSettings, { service: 'Jira' }))
    )

    expect(container.textContent).toBe('Conecta Jira en Ajustes')
    await user.click(screen.getByRole('button', { name: /Ajustes/ }))
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('create token button opens the atlassian page', async () => {
    const api = mockApi({ saved: false })
    const user = userEvent.setup()
    render(createElement(Ajustes))

    await user.click(await screen.findByRole('button', { name: 'Conectar' }))
    await user.click(screen.getByRole('button', { name: 'Crear token en Atlassian' }))

    await waitFor(() => expect(api.openTokenPage).toHaveBeenCalledTimes(1))
    expect(api.openTokenPage).toHaveBeenCalledWith()
    expect(api.jira.save).not.toHaveBeenCalled()
    expect(api.jira.delete).not.toHaveBeenCalled()
  })
})

describe('board picker', () => {
  it('picks a board and keeps it', async () => {
    const SAVED = { saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' }
    const api = mockApi(SAVED)
    api.jira.searchBoards.mockResolvedValue([
      { id: 7, name: 'TEAM', type: 'kanban' },
      { id: 9, name: 'TEAM legacy', type: 'scrum' }
    ])
    const user = userEvent.setup()
    render(createElement(Ajustes))

    // One letter is not a search; two letters are, once, after the typing stops.
    await user.click(await screen.findByRole('button', { name: 'Gestionar' }))
    await user.type(screen.getByLabelText('Tablero'), 'd')
    await new Promise((r) => setTimeout(r, 400))
    expect(api.jira.searchBoards).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Tablero'), 'x')
    const match = await screen.findByRole('button', { name: 'TEAM' })
    expect(api.jira.searchBoards).toHaveBeenCalledTimes(1)
    expect(api.jira.searchBoards).toHaveBeenCalledWith('dx')

    api.jira.status.mockResolvedValue({ ...SAVED, board: { id: 7, name: 'TEAM' } })
    await user.click(match)
    expect(api.jira.pickBoard).toHaveBeenCalledWith({ id: 7, name: 'TEAM' })
    expect(await screen.findByText('Tablero: TEAM')).toBeTruthy()

    // Replacing the token and cancelling leaves the board where it was; Cambiar reopens the search.
    await user.click(screen.getByRole('button', { name: 'Reemplazar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Tablero: TEAM')).toBeTruthy()
    api.jira.searchBoards.mockResolvedValue([])
    await user.click(screen.getByRole('button', { name: 'Cambiar' }))
    await user.type(screen.getByLabelText('Tablero'), 'zzz')
    expect(await screen.findByText('Ningún tablero coincide')).toBeTruthy()
  })
})

describe('session chip', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo='

  it('top bar shows who is signed in', async () => {
    mockApi({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net', avatar: PNG })
    const openSettings = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      createElement(NavigationContext.Provider, { value: { openSettings } }, createElement(TopBar, { problems: [] }))
    )

    const chip = await screen.findByRole('button', { name: /Pau Sánchez/ })
    expect(chip.textContent).toContain('Jira')
    expect(container.querySelector('img')?.getAttribute('src')).toBe(PNG)
    expect(document.body.innerHTML).not.toContain(TOKEN)

    await user.click(chip)
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('top bar falls back to initials, and says when nothing is connected', async () => {
    const api = mockApi({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' })
    const first = render(createElement(TopBar, { problems: [] }))
    expect((await screen.findByRole('button', { name: /Pau Sánchez/ })).textContent).toContain('PS')
    first.unmount()

    api.jira.status.mockResolvedValue({ saved: false })
    render(createElement(TopBar, { problems: [] }))
    expect(await screen.findByRole('button', { name: 'Sin conectar' })).toBeTruthy()
  })
})
