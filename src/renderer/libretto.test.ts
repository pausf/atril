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

describe('libretto screen', () => {
  it('the Libretto screen shows the queue and queues an idea', async () => {
    const user = userEvent.setup()
    const api = mockApi({ repos, libretto: { web, api: { none: true } } })
    render(createElement(App))
    await user.click(rail(/Libretto/))
    await screen.findByText('add-discounts')

    // The queue, oldest first, with Empezar only where nothing started.
    expect(within(row('add-discounts')).getByText('Descuentos relativos')).toBeTruthy()
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
    await user.selectOptions(screen.getByRole('combobox', { name: 'Repo' }), 'api')
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
    expect((screen.getByRole('combobox', { name: 'Repo' }) as HTMLSelectElement).value).toBe('api')
  })
})
