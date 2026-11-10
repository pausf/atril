// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ForgeId, ForgeStatus } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

async function openSettings(forges: Partial<Record<ForgeId, ForgeStatus>> = {}, firstJira?: () => Promise<unknown>) {
  mockApi({ forges })
  const jira = {
    status: vi.fn().mockResolvedValue({ saved: false }),
    save: vi.fn().mockResolvedValue({ account: 'Pau' }),
    delete: vi.fn().mockResolvedValue(undefined),
    searchBoards: vi.fn().mockResolvedValue([]),
    pickBoard: vi.fn().mockResolvedValue({ ok: true })
  }
  const settings = window.atril.settings as unknown as { jira: typeof jira; openTokenPage: () => Promise<void> }
  if (firstJira) jira.status.mockImplementation(firstJira)
  settings.jira = jira
  settings.openTokenPage = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Ajustes/))
  const section = await screen.findByRole('region', { name: 'Conexiones' })
  const row = (name: string) => within(section).getByRole('region', { name })
  return { user, jira, forge: window.atril.settings.forge, section, row }
}

/** The text that describes an element through aria-describedby. */
const described = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('connections', () => {
  it('connections read as rows with one button', async () => {
    let answer: (s: unknown) => void = () => undefined
    const { user, row, jira } = await openSettings({ gitlab: { saved: true, account: 'pau', site: 'https://gitlab.com' } }, () =>
      new Promise((r) => (answer = r))
    )

    // Loading: the row says so and offers nothing yet.
    expect(within(row('Jira')).getByText('Cargando…')).toBeTruthy()
    expect(row('Jira').querySelector('form, input')).toBeNull()
    jira.status.mockResolvedValue({ saved: true, account: 'Pau', site: 'https://x.atlassian.net' })
    answer({ saved: true, account: 'Pau', site: 'https://x.atlassian.net' })

    const expected = [
      ['Jira', 'Tus tareas y empezar trabajos', 'Conectado · Pau · x.atlassian.net', 'Gestionar'],
      ['GitHub', 'Tus MR, revisar y crear repos', 'Sin conectar', 'Conectar'],
      ['GitLab', 'Tus MR, revisar y crear repos', 'Conectado · pau · gitlab.com', 'Gestionar']
    ]
    for (const [name, purpose, state, button] of expected) {
      const r = row(name!)
      expect(await within(r).findByText(state!)).toBeTruthy()
      expect(within(r).getByText(purpose!)).toBeTruthy()
      const buttons = within(r).getAllByRole('button')
      expect(buttons.map((b) => b.textContent)).toEqual([button])
      expect(buttons[0]!.getAttribute('aria-expanded')).toBe('false')
      expect(r.querySelector('form, input')).toBeNull()
    }

    // The button folds and unfolds the body; its text stays.
    const toggle = within(row('GitHub')).getByRole('button', { name: 'Conectar' })
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(row('GitHub').querySelector('form')).not.toBeNull()
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(row('GitHub').querySelector('form')).toBeNull()
    cleanup()

    // GitHub has no site to show: the account alone.
    const again = await openSettings({ github: { saved: true, account: 'pau', site: 'https://github.com' } })
    expect(await within(again.row('GitHub')).findByText('Conectado · pau')).toBeTruthy()
  })

  it('connect guides in three steps', async () => {
    const { user, row, jira, forge } = await openSettings({ gitlab: { saved: true, account: 'pau', site: 'https://gitlab.com' } })
    const steps = (r: HTMLElement) => Array.from(r.querySelectorAll('ol > li'))

    // GitHub: step 1 names `repo` beside the button; the empty token is caught here, next to its field.
    const gh = row('GitHub')
    await user.click(await within(gh).findByRole('button', { name: 'Conectar' }))
    expect(steps(gh)).toHaveLength(3)
    expect(steps(gh)[0]!.textContent).toContain('con el permiso repo')
    await user.click(within(gh).getByRole('button', { name: 'Crear token en GitHub' }))
    expect(forge.openTokenPage).toHaveBeenCalledWith('github', undefined)
    expect(within(gh).queryByLabelText('Dirección')).toBeNull()
    expect(within(gh).getByLabelText('Token')).toBeTruthy()
    const ghSave = within(gh).getByRole('button', { name: 'Guardar y comprobar' }) as HTMLButtonElement
    expect(ghSave.disabled).toBe(false)
    await user.click(ghSave)
    expect(described(within(gh).getByLabelText('Token'))).toBe('Falta el token.')
    expect(forge.save).not.toHaveBeenCalled()

    // While the check runs, and only then, the button is disabled and says so.
    let reply: (r: { account: string }) => void = () => undefined
    vi.mocked(forge.save).mockImplementationOnce(() => new Promise((r) => (reply = r)))
    await user.type(within(gh).getByLabelText('Token'), 'ghp_x')
    await user.click(ghSave)
    const busy = within(gh).getByRole('button', { name: 'Comprobando…' }) as HTMLButtonElement
    expect(busy.disabled).toBe(true)
    expect(described(within(gh).getByLabelText('Token'))).toBe('')
    reply({ account: 'pau' })
    expect(((await within(gh).findByRole('button', { name: 'Guardar y comprobar' })) as HTMLButtonElement).disabled).toBe(false)

    // GitLab is saved: Gestionar, then Reemplazar opens the same three steps, naming `api`, with the address.
    const gl = row('GitLab')
    await user.click(within(gl).getByRole('button', { name: 'Gestionar' }))
    await user.click(within(gl).getByRole('button', { name: 'Reemplazar' }))
    expect(steps(gl)).toHaveLength(3)
    expect(steps(gl)[0]!.textContent).toContain('con el permiso api')
    expect(within(gl).getByRole('button', { name: 'Crear token en GitLab' })).toBeTruthy()
    expect(within(gl).getByLabelText('Dirección')).toBeTruthy()
    expect(within(gl).getByLabelText('Token')).toBeTruthy()

    // Jira: address, email and token; only the empty ones get their error, and main is not called.
    const j = row('Jira')
    await user.click(within(j).getByRole('button', { name: 'Conectar' }))
    expect(steps(j)).toHaveLength(3)
    expect(steps(j)[0]!.textContent).toContain('un token de API de Atlassian')
    expect(within(j).getByRole('button', { name: 'Crear token en Atlassian' })).toBeTruthy()
    await user.type(within(j).getByLabelText('Dirección'), 'https://x.atlassian.net')
    await user.click(within(j).getByRole('button', { name: 'Guardar y comprobar' }))
    expect(described(within(j).getByLabelText('Dirección'))).toBe('')
    expect(described(within(j).getByLabelText('Correo'))).toBe('Falta el correo.')
    expect(described(within(j).getByLabelText('Token'))).toBe('Falta el token.')
    expect(jira.save).not.toHaveBeenCalled()

    await user.type(within(j).getByLabelText('Correo'), 'pau@x.com')
    await user.type(within(j).getByLabelText('Token'), 'secret')
    await user.click(within(j).getByRole('button', { name: 'Guardar y comprobar' }))
    expect(jira.save).toHaveBeenCalledWith({ site: 'https://x.atlassian.net', email: 'pau@x.com', token: 'secret' })
  })
})
