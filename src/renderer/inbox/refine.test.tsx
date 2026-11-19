// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'
import { withAnswers } from './Refine'

const repos: RepoView[] = [{ id: 'web', path: '/w', mode: 'worktree', reason: '', health: 'ok' }]
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })
const FIXED = ['¿Qué tiene que pasar cuando esté hecho?', '¿Qué no entra?', '¿Dónde se toca? (pantalla, archivos)', 'Un ejemplo']

async function openDialog() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Tareas/))
  await user.click(await screen.findByRole('button', { name: 'Nueva tarea' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nueva tarea' })
  await vi.waitFor(() => expect((within(dialog).getByLabelText('Repo') as HTMLSelectElement).value).toBe('web'))
  const q = within(dialog)
  return {
    user,
    dialog,
    q,
    text: q.getByLabelText('¿Qué hay que hacer?'),
    go: q.getByRole('button', { name: 'Empezar' }),
    section: () => dialog.querySelector('details'),
    launch: () => q.getByLabelText('Comando que se ejecutará').textContent,
    field: (label: string) => q.getByLabelText(label) as HTMLInputElement
  }
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('refine the request', () => {
  it('the fixed questions add their answers to the request', async () => {
    const api = mockApi({ repos })
    const { user, dialog, text, go, section, launch, field } = await openDialog()
    expect(section()).toBeNull()
    expect(launch()).toBe('/libretto:libretto-flow «tu texto»')

    await user.type(text, 'Añadir filtro')
    const details = section()!
    expect(details.open).toBe(false)
    const summary = details.querySelector('summary')!
    expect(summary.textContent).toBe('Afinar la petición · opcional')
    expect(launch()).toBe('/libretto:libretto-flow «Añadir filtro»')

    await user.click(summary)
    expect(details.open).toBe(true)
    for (const label of FIXED) expect(field(label)).toBeTruthy()

    await user.type(field('¿Dónde se toca? (pantalla, archivos)'), '  /productos ')
    expect(summary.textContent).toBe('Afinar la petición · opcional · 1 respuesta añadida')
    await user.type(field('¿Qué tiene que pasar cuando esté hecho?'), 'Filtra por laboratorio')
    await user.type(field('¿Qué no entra?'), '   ')
    expect(summary.textContent).toBe('Afinar la petición · opcional · 2 respuestas añadidas')
    const composed = 'Añadir filtro\n\nHecho cuando: Filtra por laboratorio\nDónde: /productos'
    expect(launch()).toBe(`/libretto:libretto-flow «${composed}»`)

    // Blank text hides the section and sends nothing of it; the answers wait in the dialog.
    await user.clear(text)
    expect(section()).toBeNull()
    expect(launch()).toBe('/libretto:libretto-flow «tu texto»')
    await user.type(text, 'Añadir filtro')
    await user.click(section()!.querySelector('summary')!)
    expect(field('¿Dónde se toca? (pantalla, archivos)').value).toBe('  /productos ')

    await user.click(go)
    await vi.waitFor(() => expect(api.ws.open).toHaveBeenCalledWith('web', 'anadir-filtro', 'claude', 'default', composed))
    expect(dialog.isConnected).toBe(false)

    expect(withAnswers('Pedir algo', [['Hecho cuando:', ' una\n  dos \r\n tres '], ['No entra:', '  '], ['¿Qué pantalla?', 'la de\nproductos']])).toBe('Pedir algo\n\nHecho cuando: una dos tres\n¿Qué pantalla? la de productos')
    expect(withAnswers('Pedir algo', [['No entra:', ' \n ']])).toBe('Pedir algo')
  })

  it('a request too long with its answers cannot start', async () => {
    mockApi({ repos })
    const { user, q, text, go, section, field } = await openDialog()
    const TOO_LONG = 'Con las respuestas pasa de 2000 caracteres: acorta algo.'
    await user.click(text)
    await user.paste('x'.repeat(1980))
    expect(go.hasAttribute('disabled')).toBe(false)
    await user.click(section()!.querySelector('summary')!)
    // 1980 + 2 + «Ejemplo: » (9) + 9 = 2000: still fits.
    await user.type(field('Un ejemplo'), 'abcdefghi')
    expect(go.hasAttribute('disabled')).toBe(false)
    expect(q.queryByText(TOO_LONG)).toBeNull()
    await user.type(field('Un ejemplo'), 'j')
    expect(go.hasAttribute('disabled')).toBe(true)
    expect(q.getByText(TOO_LONG)).toBeTruthy()
    await user.type(field('Un ejemplo'), '{Backspace}')
    expect(go.hasAttribute('disabled')).toBe(false)
    expect(q.queryByText(TOO_LONG)).toBeNull()
  })

  it('enter moves through the questions', async () => {
    const api = mockApi({ repos })
    const { user, q, text, section, field } = await openDialog()
    await user.type(text, 'Añadir filtro')
    await user.click(section()!.querySelector('summary')!)
    await user.click(field(FIXED[0]!))
    for (const next of FIXED.slice(1)) {
      await user.keyboard('a{Enter}')
      expect(document.activeElement).toBe(field(next))
    }
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(q.getByRole('button', { name: 'Que Claude me pregunte' }))
    expect(api.ws.open).not.toHaveBeenCalled()
    expect(api.refine.ask).not.toHaveBeenCalled()

    await user.click(field(FIXED[2]!))
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await vi.waitFor(() => expect(api.ws.open).toHaveBeenCalledWith('web', 'anadir-filtro', 'claude', 'default', 'Añadir filtro\n\nHecho cuando: a\nNo entra: a\nDónde: a'))
  })
})
