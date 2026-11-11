// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists, RepoView } from '../../preload/api'
import { App } from '../App'
import { issue, mockApi, mockSystemTheme, workspace } from '../mockApi'

const GH = 'https://github.com/acme/web/pull/7'
const mr = (url: string, title: string): MrItem => ({ forge: 'github', url, title, project: 'acme/web', author: 'ana', updatedAt: new Date().toISOString() })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })
const repos: RepoView[] = [{ id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found', health: 'ok' }]
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const box = (): HTMLInputElement => screen.getByRole('combobox', { name: 'Buscar en Atril' })
const list = (): HTMLElement => screen.getByRole('listbox', { name: 'Resultados' })
/** The label of every option shown, without its kind. */
const labels = (): string[] => within(list()).queryAllByRole('option').map((o) => o.querySelector('.pl-label')?.textContent ?? '')
const highlighted = (): string => list().querySelector('[aria-selected="true"] .pl-label')?.textContent ?? ''

// A stopped workspace: a live one would mount xterm, which jsdom cannot run.
const data = () => ({
  workspaces: [workspace('aaaaaaa1', 'feat/festivos', false)],
  mrs: lists({ review: [mr(GH, 'Envío con IVA')] }),
  issues: [issue('PF-10', 'todo', 'Días festivos de Madrid'), issue('PF-11', 'todo', 'Festivos sin días')],
  repos
})

async function ready(): Promise<ReturnType<typeof mockApi>> {
  const api = mockApi(data())
  render(createElement(App))
  // Everything the palette lists comes from data the app already loaded.
  await screen.findAllByText('feat/festivos')
  await vi.waitFor(() => expect(api.mrApi.list).toHaveBeenCalled())
  await screen.findByRole('button', { name: 'MR: 1 por revisar' })
  return api
}

describe('command palette', () => {
  it('command k opens the palette and runs an item', async () => {
    const api = await ready()
    const user = userEvent.setup()

    // Over whatever screen is shown, with the search box focused.
    await user.click(rail(/Avisos/))
    act(() => api.menu({ kind: 'palette' }))
    expect(screen.getByRole('dialog', { name: 'Buscar' })).toBeTruthy()
    expect(document.activeElement).toBe(box())

    await user.type(box(), 'ajustes')
    expect(labels()).toEqual(['Ajustes'])
    await user.keyboard('{Enter}')
    expect(rail(/Ajustes/).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('dialog')).toBeNull()

    // With another dialog open, ⌘K does nothing.
    act(() => api.menu({ kind: 'palette' }))
    await user.type(box(), 'nuevo trabajo{Enter}')
    expect(await screen.findByRole('dialog', { name: 'Nuevo trabajo' })).toBeTruthy()
    act(() => api.menu({ kind: 'palette' }))
    expect(screen.queryByRole('dialog', { name: 'Buscar' })).toBeNull()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('the palette filters by every word', async () => {
    const api = await ready()
    const user = userEvent.setup()
    act(() => api.menu({ kind: 'palette' }))

    // Screens, actions, workspaces, MRs, tasks, in that order.
    expect(labels()).toEqual([
      'Trabajo',
      'Tareas',
      'MR',
      'Libretto',
      'QA',
      'Avisos',
      'Ajustes',
      'Nuevo trabajo',
      'Nueva tarea',
      'Actualizar MR',
      'Marcar avisos leídos',
      'Tutorial',
      'feat/festivos · web',
      'Envío con IVA · acme/web',
      'PF-10 Días festivos de Madrid',
      'PF-11 Festivos sin días'
    ])

    // Every word must appear, in any order, ignoring case and accents.
    await user.type(box(), 'MADRID dias')
    expect(labels()).toEqual(['PF-10 Días festivos de Madrid'])
    await user.clear(box())
    await user.type(box(), 'FESTIVOS  días')
    expect(labels()).toEqual(['PF-10 Días festivos de Madrid', 'PF-11 Festivos sin días'])
    await user.clear(box())
    await user.type(box(), 'envio iva')
    expect(labels()).toEqual(['Envío con IVA · acme/web'])
    await user.clear(box())
    await user.type(box(), 'festivos nada')
    expect(labels()).toEqual([])
    expect(screen.getByText('Nada coincide con «festivos nada»')).toBeTruthy()

    // At most 50, after filtering and with an empty box.
    cleanup()
    const many = mockApi({ issues: Array.from({ length: 60 }, (_, i) => issue(`PF-${100 + i}`, 'todo', `Tarea ${i}`)) })
    render(createElement(App))
    await vi.waitFor(() => expect(many.mrApi.list).toHaveBeenCalled())
    act(() => many.menu({ kind: 'palette' }))
    await vi.waitFor(() => expect(labels()).toContain('PF-137 Tarea 37'))
    expect(labels()).toHaveLength(50)
    expect(labels()).not.toContain('PF-138 Tarea 38')
    await user.type(box(), 'tarea')
    expect(labels()).toHaveLength(50)
    expect(labels().slice(0, 3)).toEqual(['Tareas', 'Nueva tarea', 'PF-100 Tarea 0'])
    expect(labels().at(-1)).toBe('PF-147 Tarea 47')
  })

  it('the palette moves with the keyboard', async () => {
    const api = await ready()
    const user = userEvent.setup()
    const before = rail(/Tareas/)
    before.focus()
    act(() => api.menu({ kind: 'palette' }))
    await user.type(box(), 'festivos')
    expect(labels()).toEqual(['feat/festivos · web', 'PF-10 Días festivos de Madrid', 'PF-11 Festivos sin días'])
    expect(highlighted()).toBe('feat/festivos · web')
    expect(box().getAttribute('aria-activedescendant')).toBe(list().getAttribute('aria-activedescendant'))
    expect(document.getElementById(list().getAttribute('aria-activedescendant') ?? '')?.getAttribute('aria-selected')).toBe('true')

    await user.keyboard('{ArrowDown}')
    expect(highlighted()).toBe('PF-10 Días festivos de Madrid')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(highlighted()).toBe('feat/festivos · web')
    await user.keyboard('{ArrowUp}')
    expect(highlighted()).toBe('PF-11 Festivos sin días')
    // The focus stays in the box while the highlight moves.
    expect(document.activeElement).toBe(box())

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(before)

    // Enter runs the highlighted item and closes.
    act(() => api.menu({ kind: 'palette' }))
    await user.type(box(), 'festivos{ArrowUp}{ArrowUp}{ArrowUp}{Enter}')
    expect(screen.queryByRole('dialog', { name: 'Buscar' })).toBeNull()
    expect(await screen.findByRole('heading', { name: 'feat/festivos' })).toBeTruthy()
  })

  it('each kind of item goes where it says', async () => {
    const api = await ready()
    const user = userEvent.setup()
    const run = async (query: string): Promise<void> => {
      act(() => api.menu({ kind: 'palette' }))
      await user.type(box(), `${query}{Enter}`)
    }

    await run('avisos')
    expect(rail(/Avisos/).getAttribute('aria-current')).toBe('page')

    // A workspace is selected on Trabajo.
    await run('feat festivos')
    expect(rail(/Trabajo/).getAttribute('aria-current')).toBe('page')
    expect(await screen.findByRole('heading', { name: 'feat/festivos' })).toBeTruthy()

    // An MR opens its view on the MR screen.
    await run('envio')
    expect(await screen.findByRole('dialog', { name: 'Envío con IVA' })).toBeTruthy()
    expect(rail(/MR/).getAttribute('aria-current')).toBe('page')
    await user.keyboard('{Escape}')

    // A task does what Empezar does: here its dialog, since no repo is remembered.
    await run('pf-11')
    expect((await screen.findByRole('dialog')).textContent).toContain('Empezar PF-11')
    expect(api.jira.proposeStart).toHaveBeenCalledWith(expect.objectContaining({ key: 'PF-11' }))
    expect(rail(/Tareas/).getAttribute('aria-current')).toBe('page')
    await user.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await run('nueva tarea')
    expect(await screen.findByRole('dialog', { name: 'Nueva tarea' })).toBeTruthy()
    await user.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const loads = vi.mocked(api.mrApi.list).mock.calls.length
    await run('actualizar mr')
    await vi.waitFor(() => expect(vi.mocked(api.mrApi.list).mock.calls.length).toBe(loads + 1))

    await run('marcar avisos')
    expect(api.avisosApi.markRead).toHaveBeenCalledWith('all')

    await run('tutorial')
    expect(await screen.findByRole('dialog', { name: 'Bienvenido a Atril' })).toBeTruthy()
  })
})
