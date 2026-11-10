// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibrettoState, RepoView, UiState } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })
const repo = (id: string): RepoView => ({ id, path: `/r/${id}`, mode: 'worktree', reason: '' })
const repos = [repo('web'), repo('api')]
const web: LibrettoState = {
  queued: [
    { name: 'add-discounts', date: '2026-11-01', ask: 'Descuentos relativos\nsegunda línea', reading: 'Descuentos relativos', started: false },
    { name: 'add-export', date: '2026-11-02', ask: 'Exportar', started: true }
  ],
  inFlight: [
    { name: 'fix-login', closed: 1, total: 3, firstOpen: 'write the tests' },
    { name: 'tidy-css', closed: 2, total: 2 },
    { name: 'no-list', closed: 0, total: 0 }
  ]
}
const lib = (a: ReturnType<typeof mockApi>) => vi.mocked(a.librettoApi)
const row = (name: string): HTMLElement => screen.getByText(name).closest('li') as HTMLElement
const board = { saved: true, account: 'Pau', site: 'https://x.atlassian.net', board: { id: 7, name: 'TEAM' } }

describe('libretto screen', () => {
  it('the Libretto screen shows the queue and queues an idea', async () => {
    const user = userEvent.setup()
    const api = mockApi({ repos, libretto: { web, api: { none: true } } })
    render(createElement(App))
    await user.click(rail(/Libretto/))
    await screen.findByText('add-discounts')

    // The queue, oldest first, with Empezar only where nothing started.
    expect(within(row('add-discounts')).getByText('01/11 · Descuentos relativos')).toBeTruthy()
    expect(within(row('add-discounts')).getByRole('button', { name: 'Empezar' })).toBeTruthy()
    expect(within(row('add-export')).queryByRole('button', { name: 'Empezar' })).toBeNull()
    expect(within(row('add-export')).getByText('Empezada · feat/add-export')).toBeTruthy()
    // In flight: the count and the first open box, or «Lista para aterrizar».
    expect(within(row('fix-login')).getByText('1/3')).toBeTruthy()
    expect(within(row('fix-login')).getByText('Siguiente: write the tests')).toBeTruthy()
    expect(within(row('tidy-css')).getByText('2/2')).toBeTruthy()
    expect(within(row('tidy-css')).getByText('Lista para aterrizar')).toBeTruthy()
    expect(within(row('no-list')).getByText('Sin checklist')).toBeTruthy()

    // Encolar is disabled while the text is blank.
    const queue = screen.getByRole('button', { name: 'Encolar' }) as HTMLButtonElement
    expect(queue.disabled).toBe(true)
    await user.type(screen.getByRole('textbox', { name: 'Nueva idea' }), '   ')
    expect(queue.disabled).toBe(true)
    await user.type(screen.getByRole('textbox', { name: 'Nueva idea' }), 'Filtros en Tareas')
    expect(queue.disabled).toBe(false)
    const reads = lib(api).state.mock.calls.length
    await user.click(queue)
    expect(lib(api).queue).toHaveBeenCalledWith('web', '   Filtros en Tareas')
    // Read again afterwards, and the box is emptied.
    await waitFor(() => expect(lib(api).state.mock.calls.length).toBe(reads + 1))
    expect((screen.getByRole('textbox', { name: 'Nueva idea' }) as HTMLTextAreaElement).value).toBe('')

    // A failed queue keeps the text and says what caused it, under the box.
    lib(api).queue.mockResolvedValueOnce({ error: 'git commit failed' })
    await user.type(screen.getByRole('textbox', { name: 'Nueva idea' }), 'Otra')
    await user.click(screen.getByRole('button', { name: 'Encolar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('git commit failed')
    expect((screen.getByRole('textbox', { name: 'Nueva idea' }) as HTMLTextAreaElement).value).toBe('Otra')

    // A failed start says why under its idea.
    lib(api).start.mockResolvedValueOnce({ error: 'La copia principal tiene cambios' })
    await user.click(within(row('add-discounts')).getByRole('button', { name: 'Empezar' }))
    expect(lib(api).start).toHaveBeenCalledWith('web', 'add-discounts')
    expect((await within(row('add-discounts')).findByRole('alert')).textContent).toBe('La copia principal tiene cambios')

    // A start that works goes to the new work.
    await user.click(within(row('add-discounts')).getByRole('button', { name: 'Empezar' }))
    await waitFor(() => expect(rail(/Trabajo/).getAttribute('aria-current')).toBe('page'))
  })

  it('a repo without Libretto says so and offers no text box', async () => {
    const user = userEvent.setup()
    mockApi({ repos, libretto: { web: { none: true } } })
    render(createElement(App))
    await user.click(rail(/Libretto/))
    expect(await screen.findByText('Este repo no usa Libretto')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Nueva idea' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Encolar' })).toBeNull()
  })

  it('the Libretto screen is reachable and keeps its repo', async () => {
    const user = userEvent.setup()
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const first = mockApi({ repos, libretto: { web, api: { queued: [], inFlight: [{ name: 'only-api', closed: 0, total: 0 }] } } }, stored)
    const { unmount } = render(createElement(App))

    // From the palette.
    act(() => first.menu({ kind: 'palette' }))
    await user.type(await screen.findByRole('combobox', { name: 'Buscar en Atril' }), 'libretto{Enter}')
    expect(rail(/Libretto/).getAttribute('aria-current')).toBe('page')
    await screen.findByText('add-discounts')
    expect(lib(first).state).toHaveBeenLastCalledWith('web')

    // Changing the repo reads its state and stores the choice.
    await user.click(screen.getByRole('button', { name: /^api/ }))
    await screen.findByText('only-api')
    expect(lib(first).state).toHaveBeenLastCalledWith('api')
    expect(stored.librettoRepo).toBe('api')

    // «Actualizar» reads again; leaving and coming back reads again.
    const before = lib(first).state.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    await waitFor(() => expect(lib(first).state.mock.calls.length).toBe(before + 1))
    await user.click(rail(/Trabajo/))
    await user.click(rail(/Libretto/))
    await waitFor(() => expect(lib(first).state.mock.calls.length).toBe(before + 2))

    // A restart: the same ui.json, the repo is still api.
    unmount()
    cleanup()
    const second = mockApi({ repos, libretto: { web, api: { queued: [], inFlight: [] } } }, stored)
    render(createElement(App))
    await user.click(rail(/Libretto/))
    await waitFor(() => expect(lib(second).state).toHaveBeenCalledWith('api'))
    expect(screen.getByRole('button', { name: /^api/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('the Libretto screen shows each repo with its counts', async () => {
    const user = userEvent.setup()
    mockApi({ repos: [...repos, repo('ops')], libretto: { web, api: { queued: [], inFlight: [{ name: 'only-api', closed: 0, total: 0 }] }, ops: { none: true } } })
    render(createElement(App))
    await user.click(rail(/Libretto/))
    await screen.findByText('add-discounts')

    // A button per repo with its counts, the picked one pressed; no select.
    const web$ = screen.getByRole('button', { name: /^web/ })
    expect(web$.textContent).toBe('web2 en cola · 3 en curso')
    expect(web$.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^api/ }).textContent).toBe('api0 en cola · 1 en curso')
    expect(screen.getByRole('button', { name: /^api/ }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: /^ops/ }).textContent).toBe('opssin Libretto')
    expect(screen.queryByRole('combobox')).toBeNull()

    // The one-line box with Encolar above the queue, then both lists with their counts.
    const box = screen.getByRole('textbox', { name: 'Nueva idea' })
    expect(box.getAttribute('placeholder')).toMatch(/^Apunta una idea…/)
    const queueButton = screen.getByRole('button', { name: 'Encolar' })
    const queued = screen.getByRole('heading', { name: /^En cola/ })
    expect(box.compareDocumentPosition(queued) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(queueButton.compareDocumentPosition(queued) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(queued.textContent).toBe('En cola2')
    expect(screen.getByRole('heading', { name: /^En curso/ }).textContent).toBe('En curso3')
  })

  describe('queued ideas', () => {
    const open = async (jira: typeof board | undefined = board) => {
      const user = userEvent.setup()
      const api = mockApi({ repos, libretto: { web, api: { none: true } }, ...(jira && { jira }) })
      render(createElement(App))
      await user.click(rail(/Libretto/))
      await screen.findByText('add-discounts')
      return { user, api }
    }
    const btn = (name: string, label: string): HTMLButtonElement => within(row(name)).getByRole('button', { name: label }) as HTMLButtonElement

    it('a queued idea can be edited, deleted or sent to Jira', async () => {
      const { user, api } = await open()
      // Only a queued, not started idea offers them.
      await waitFor(() => expect(within(row('add-discounts')).getByRole('button', { name: 'Pasar a Jira' })).toBeTruthy())
      for (const label of ['Editar', 'Borrar', 'Pasar a Jira']) expect(within(row('add-export')).queryByRole('button', { name: label })).toBeNull()

      // Editar: a box with the request, Cancelar leaves it alone, Guardar sends the new text.
      await user.click(btn('add-discounts', 'Editar'))
      const box = within(row('add-discounts')).getByRole('textbox', { name: 'Editar petición' }) as HTMLTextAreaElement
      expect(box.value).toBe('Descuentos relativos\nsegunda línea')
      await user.click(btn('add-discounts', 'Cancelar'))
      expect(lib(api).edit).not.toHaveBeenCalled()
      await user.click(btn('add-discounts', 'Editar'))
      const again = within(row('add-discounts')).getByRole('textbox', { name: 'Editar petición' })
      await user.clear(again)
      await user.type(again, 'Nuevo texto')
      const reads = lib(api).state.mock.calls.length
      await user.click(btn('add-discounts', 'Guardar'))
      expect(lib(api).edit).toHaveBeenCalledWith('web', 'add-discounts', 'Nuevo texto')
      await waitFor(() => expect(lib(api).state.mock.calls.length).toBe(reads + 1))
      expect(within(row('add-discounts')).queryByRole('textbox')).toBeNull()

      // A failed edit stays open, shows the error in the row and keeps the text.
      lib(api).edit.mockResolvedValueOnce({ error: 'git commit failed' })
      await user.click(btn('add-discounts', 'Editar'))
      await user.click(btn('add-discounts', 'Guardar'))
      expect((await within(row('add-discounts')).findByRole('alert')).textContent).toBe('git commit failed')
      expect(within(row('add-discounts')).getByRole('textbox', { name: 'Editar petición' })).toBeTruthy()
      await user.click(btn('add-discounts', 'Cancelar'))

      // Borrar asks in the row, focus on «No»; No does nothing, Sí drops it.
      await user.click(btn('add-discounts', 'Borrar'))
      expect(within(row('add-discounts')).getByText('¿Borrar add-discounts?')).toBeTruthy()
      expect(document.activeElement).toBe(btn('add-discounts', 'No'))
      await user.click(btn('add-discounts', 'No'))
      expect(lib(api).drop).not.toHaveBeenCalled()
      await user.click(btn('add-discounts', 'Borrar'))
      lib(api).drop.mockResolvedValueOnce({ error: 'git rm failed' })
      await user.click(btn('add-discounts', 'Sí'))
      expect(lib(api).drop).toHaveBeenCalledWith('web', 'add-discounts')
      expect((await within(row('add-discounts')).findByRole('alert')).textContent).toBe('git rm failed')
      // The row keeps asking; confirming again goes through.
      const before = lib(api).state.mock.calls.length
      await user.click(btn('add-discounts', 'Sí'))
      await waitFor(() => expect(lib(api).state.mock.calls.length).toBeGreaterThan(before))

      // Pasar a Jira: a pending row has its buttons disabled; then «Creada KEY» and no second Pasar a Jira.
      let finish: (r: { key: string }) => void = () => undefined
      lib(api).jira.mockReturnValueOnce(new Promise((res) => (finish = res)))
      await user.click(btn('add-discounts', 'Pasar a Jira'))
      expect(lib(api).jira).toHaveBeenCalledWith('web', 'add-discounts')
      for (const label of ['Editar', 'Borrar', 'Pasar a Jira', 'Empezar']) expect(btn('add-discounts', label).disabled).toBe(true)
      await act(async () => finish({ key: 'WEB-9' }))
      expect(await within(row('add-discounts')).findByText('Creada WEB-9')).toBeTruthy()
      expect(within(row('add-discounts')).queryByRole('button', { name: 'Pasar a Jira' })).toBeNull()

    })

    it('a failed Jira call keeps the idea and says why', async () => {
      const { user, api } = await open()
      lib(api).jira.mockResolvedValueOnce({ error: 'Jira respondió 400.' })
      await user.click(await within(row('add-discounts')).findByRole('button', { name: 'Pasar a Jira' }))
      expect((await within(row('add-discounts')).findByRole('alert')).textContent).toBe('Jira respondió 400.')
      expect(within(row('add-discounts')).getByRole('button', { name: 'Pasar a Jira' })).toBeTruthy()

      // Created but not removed: «Creada KEY» plus the error, and no second offer.
      lib(api).jira.mockResolvedValueOnce({ key: 'WEB-10', error: 'git commit failed' })
      await user.click(within(row('add-discounts')).getByRole('button', { name: 'Pasar a Jira' }))
      expect(await within(row('add-discounts')).findByText('Creada WEB-10')).toBeTruthy()
      expect(within(row('add-discounts')).getByRole('alert').textContent).toBe('git commit failed')
      expect(within(row('add-discounts')).queryByRole('button', { name: 'Pasar a Jira' })).toBeNull()
    })

    it('Pasar a Jira only shows with Jira saved and a board', async () => {
      await open({ saved: true, account: 'Pau', site: 'https://x.atlassian.net' } as typeof board)
      expect(within(row('add-discounts')).getByRole('button', { name: 'Editar' })).toBeTruthy()
      expect(within(row('add-discounts')).queryByRole('button', { name: 'Pasar a Jira' })).toBeNull()
    })
  })
})
