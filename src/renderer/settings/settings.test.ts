// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi } from '../../preload/api'
import { Ajustes } from './Ajustes'
import { ConnectInSettings } from './ConnectInSettings'
import { NavigationContext } from './navigation'

const TOKEN = 'ATATT-super-secret-token'

function mockApi(status: { saved: boolean; account?: string; site?: string }) {
  const settings = {
    jira: {
      status: vi.fn().mockResolvedValue(status),
      save: vi.fn().mockResolvedValue({ account: 'Pau Sánchez' }),
      delete: vi.fn().mockResolvedValue(undefined)
    },
    openTokenPage: vi.fn().mockResolvedValue(undefined)
  }
  window.atril = { settings } as unknown as AtrilApi
  return settings
}

beforeEach(() => vi.restoreAllMocks())
afterEach(cleanup)

describe('settings screen', () => {
  it('saved token cannot be seen again', async () => {
    const api = mockApi({ saved: false })
    const user = userEvent.setup()
    render(createElement(Ajustes))

    await user.type(await screen.findByLabelText('Dirección'), 'https://x.atlassian.net')
    await user.type(screen.getByLabelText('Correo'), 'pau@x.com')
    await user.type(screen.getByLabelText('Token'), TOKEN)
    api.jira.status.mockResolvedValue({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' })
    await user.click(screen.getByRole('button', { name: 'Guardar y comprobar' }))

    await screen.findByText(/Guardado/)
    expect(document.body.innerHTML).not.toContain(TOKEN)
    expect(screen.queryAllByDisplayValue(TOKEN)).toHaveLength(0)
    expect(document.querySelectorAll('input')).toHaveLength(0)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Reemplazar', 'Borrar'])

    await user.click(screen.getByRole('button', { name: 'Reemplazar' }))
    expect((screen.getByLabelText('Token') as HTMLInputElement).value).toBe('')
    expect(screen.getByLabelText('Token')).toHaveProperty('type', 'password')
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

    await user.click(await screen.findByRole('button', { name: 'Crear token en Atlassian' }))

    await waitFor(() => expect(api.openTokenPage).toHaveBeenCalledTimes(1))
    expect(api.openTokenPage).toHaveBeenCalledWith()
    expect(api.jira.save).not.toHaveBeenCalled()
    expect(api.jira.delete).not.toHaveBeenCalled()
  })
})
