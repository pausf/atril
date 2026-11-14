// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotifySettings, UiState } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

async function open(notify: Partial<NotifySettings> = {}, stored?: UiState) {
  const api = mockApi({ notify }, stored)
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Ajustes/))
  const card = await screen.findByRole('region', { name: 'Notificaciones' })
  await within(card).findAllByRole('radiogroup')
  return { api, user, card, notify: window.atril.notify }
}

const group = (card: HTMLElement, name: string): HTMLElement => within(card).getByRole('group', { name })
const radios = (card: HTMLElement, label: string | RegExp): HTMLElement => within(card).getByRole('radiogroup', { name: label })
const checked = (rg: HTMLElement): string | undefined => within(rg).getAllByRole('radio').find((r) => r.getAttribute('aria-checked') === 'true')?.textContent ?? undefined
const row = (rg: HTMLElement): HTMLElement => rg.closest('.nt-row') as HTMLElement

describe('notifications card', () => {
  it('the card lists every type at its stored value', async () => {
    const { card } = await open({ types: { ask: 'mac', done: 'mac', stopped: 'mac', idle: 'list', radar: 'mute', qa: 'mac', review: 'list', comment: 'list', ci: 'mac', cipass: 'list', merged: 'list', following: 'list', opened: 'list', quota: 'mac' } })
    expect(within(card).getByText('Todo llega a Avisos. Aquí eliges qué más te interrumpe con un aviso del Mac.')).toBeTruthy()

    const groups: Array<[string, string[]]> = [
      ['Tus agentes', ['Te pregunta algo', 'Ha terminado su turno', 'Se ha parado', 'Lleva 15 min esperándote', 'Choca con otro trabajo', 'QA terminada']],
      ['Tus MR', ['Te piden revisión', 'Comentario nuevo', 'La CI falla en tu MR', 'La CI vuelve a pasar', 'Fusionada o cerrada', 'MR nueva en lo que sigues', 'Has abierto una MR']],
      ['Tu cuenta', ['Cuota de Claude al 80 %']]
    ]
    for (const [name, labels] of groups) {
      const g = within(card).getByRole('region', { name })
      expect(within(g).getAllByRole('radiogroup').map((r) => r.getAttribute('aria-label'))).toEqual(labels)
    }

    // Each row: its example, the «nuevo» tag where the sketch has it, Mac · Solo Avisos · Nada at the stored value.
    expect(within(row(radios(card, 'Te pregunta algo'))).getByText('WEB-3535 · Te pregunta: ¿Uso la tabla del BOE o la de la API?')).toBeTruthy()
    expect(within(row(radios(card, 'Fusionada o cerrada'))).getByText('Migrar el cron de stock a colas · fusionada. Cerrar su trabajo ›')).toBeTruthy()
    expect(within(row(radios(card, 'Cuota de Claude al 80 %'))).getByText('5 h al 82 % · se reinicia a las 14:00')).toBeTruthy()
    const fresh = within(card)
      .getAllByText('nuevo')
      .map((n) => within(n.closest('.nt-row') as HTMLElement).getByRole('radiogroup').getAttribute('aria-label'))
    expect(fresh).toEqual(['Se ha parado', 'Lleva 15 min esperándote', 'Choca con otro trabajo', 'QA terminada', 'La CI vuelve a pasar', 'Cuota de Claude al 80 %'])
    expect(within(radios(card, 'Te pregunta algo')).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Mac', 'Solo Avisos', 'Nada'])
    expect(checked(radios(card, 'Te pregunta algo'))).toBe('Mac')
    expect(checked(radios(card, 'Te piden revisión'))).toBe('Solo Avisos')
    expect(checked(radios(card, 'Choca con otro trabajo'))).toBe('Nada')

    // A row at «Nada» is dimmed; the others are not.
    expect(row(radios(card, 'Choca con otro trabajo')).classList.contains('off')).toBe(true)
    expect(row(radios(card, 'Te piden revisión')).classList.contains('off')).toBe(false)
  })

  it('a choice saves and survives reopening', async () => {
    const { user, card, notify } = await open()
    await user.click(within(radios(card, 'Te piden revisión')).getByRole('radio', { name: 'Mac' }))
    expect(notify.set).toHaveBeenLastCalledWith({ types: { review: 'mac' } })
    await vi.waitFor(() => expect(checked(radios(card, 'Te piden revisión'))).toBe('Mac'))

    // Away and back: the stored value is read again.
    await user.click(rail(/^Trabajo/))
    await user.click(rail(/Ajustes/))
    const again = await screen.findByRole('region', { name: 'Notificaciones' })
    await vi.waitFor(() => expect(checked(radios(again, 'Te piden revisión'))).toBe('Mac'))
  })

  it('arrows move the choice', async () => {
    const { user, card, notify } = await open()
    const rg = radios(card, 'Te pregunta algo')
    // One tab stop per row: the checked radio.
    expect(within(rg).getAllByRole('radio').map((r) => r.tabIndex)).toEqual([0, -1, -1])
    within(rg).getByRole('radio', { name: 'Mac' }).focus()
    const outside = vi.fn()
    document.addEventListener('keydown', outside)
    await user.keyboard('{ArrowRight}')
    expect(notify.set).toHaveBeenLastCalledWith({ types: { ask: 'list' } })
    await vi.waitFor(() => expect(checked(rg)).toBe('Solo Avisos'))
    expect(document.activeElement?.textContent).toBe('Solo Avisos')
    await user.keyboard('{ArrowRight}')
    await vi.waitFor(() => expect(checked(rg)).toBe('Nada'))
    // Wraps around, both ways.
    await user.keyboard('{ArrowRight}')
    await vi.waitFor(() => expect(checked(rg)).toBe('Mac'))
    await user.keyboard('{ArrowLeft}')
    await vi.waitFor(() => expect(checked(rg)).toBe('Nada'))
    expect(notify.set).toHaveBeenLastCalledWith({ types: { ask: 'mute' } })
    // The arrows stop in the group: no global shortcut hears them.
    expect(outside).not.toHaveBeenCalled()
    document.removeEventListener('keydown', outside)
  })

  it('a group setter changes only its group', async () => {
    const { user, card, notify } = await open()
    const mr = within(card).getByRole('region', { name: 'Tus MR' })
    await user.click(within(group(mr, 'Todo Tus MR')).getByRole('button', { name: 'Todo al Mac' }))
    expect(notify.set).toHaveBeenCalledTimes(1)
    expect(notify.set).toHaveBeenLastCalledWith({ types: { review: 'mac', comment: 'mac', ci: 'mac', cipass: 'mac', merged: 'mac', following: 'mac', opened: 'mac' } })
    await vi.waitFor(() => expect(within(mr).getAllByRole('radiogroup').map(checked)).toEqual(Array(7).fill('Mac')))
    // The agents keep their own values.
    expect(within(within(card).getByRole('region', { name: 'Tus agentes' })).getAllByRole('radiogroup').map(checked)).toEqual(['Mac', 'Mac', 'Mac', 'Solo Avisos', 'Solo Avisos', 'Mac'])

    const agents = within(card).getByRole('region', { name: 'Tus agentes' })
    await user.click(within(group(agents, 'Todo Tus agentes')).getByRole('button', { name: 'Silenciar' }))
    expect(notify.set).toHaveBeenLastCalledWith({ types: { ask: 'mute', done: 'mute', stopped: 'mute', idle: 'mute', radar: 'mute', qa: 'mute' } })
    await user.click(within(group(agents, 'Todo Tus agentes')).getByRole('button', { name: 'Todo a Avisos' }))
    expect(notify.set).toHaveBeenLastCalledWith({ types: { ask: 'list', done: 'list', stopped: 'list', idle: 'list', radar: 'list', qa: 'list' } })
    await vi.waitFor(() => expect(within(agents).getAllByRole('radiogroup').map(checked)).toEqual(Array(6).fill('Solo Avisos')))
    expect(within(mr).getAllByRole('radiogroup').map(checked)).toEqual(Array(7).fill('Mac'))
  })

  it('a group header counts and folds', async () => {
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const { user, card, api } = await open({}, stored)
    const head = (name: string): HTMLElement => within(within(card).getByRole('region', { name })).getByRole('button', { expanded: true })
    // Defaults: agents 4 to the Mac and 2 only in Avisos; MR 1 and 6; the account 1 and none.
    expect(head('Tus agentes').textContent).toMatch(/6 tipos · 4 al Mac · 2 solo en Avisos$/)
    expect(head('Tus MR').textContent).toMatch(/7 tipos · 1 al Mac · 6 solo en Avisos$/)
    expect(head('Tu cuenta').textContent).toMatch(/1 tipo · 1 al Mac$/)

    // Folding hides the rows and is remembered in ui.json.
    const mr = within(card).getByRole('region', { name: 'Tus MR' })
    await user.click(head('Tus MR'))
    expect(api.ui.set).toHaveBeenLastCalledWith({ folded: { 'ntf-mr': true } })
    expect(within(mr).getByRole('button', { expanded: false })).toBeTruthy()
    expect(within(mr).queryAllByRole('radiogroup')).toHaveLength(0)
    await user.click(within(mr).getByRole('button', { expanded: false }))
    expect(api.ui.set).toHaveBeenLastCalledWith({ folded: { 'ntf-mr': false } })
    expect(within(mr).getAllByRole('radiogroup')).toHaveLength(7)

    // Stored folded: it opens folded.
    cleanup()
    const again = await open({}, { ...stored, folded: { 'ntf-account': true } })
    expect(within(within(again.card).getByRole('region', { name: 'Tu cuenta' })).getByRole('button', { expanded: false }).textContent).toMatch(/1 tipo · 1 al Mac$/)
  })

  it('the waiting minutes step by five within bounds', async () => {
    const { user, card, notify } = await open({ idleMinutes: 10 })
    const steps = within(card).getByRole('group', { name: 'Minutos esperándote' })
    const less = within(steps).getByRole('button', { name: 'Cinco minutos menos' })
    const more = within(steps).getByRole('button', { name: 'Cinco minutos más' })
    expect(row(steps).textContent).toMatch(/Lleva\s*−\s*10\s*\+\s*min esperándote/)
    await user.click(less)
    expect(notify.set).toHaveBeenLastCalledWith({ idleMinutes: 5 })
    await vi.waitFor(() => expect(less.hasAttribute('disabled')).toBe(true))
    expect(radios(card, 'Lleva 5 min esperándote')).toBeTruthy()
    await user.click(more)
    expect(notify.set).toHaveBeenLastCalledWith({ idleMinutes: 10 })
    expect(less.hasAttribute('disabled')).toBe(false)

    cleanup()
    const top = await open({ idleMinutes: 115 })
    const s2 = within(top.card).getByRole('group', { name: 'Minutos esperándote' })
    await top.user.click(within(s2).getByRole('button', { name: 'Cinco minutos más' }))
    expect(top.notify.set).toHaveBeenLastCalledWith({ idleMinutes: 120 })
    await vi.waitFor(() => expect(within(s2).getByRole('button', { name: 'Cinco minutos más' }).hasAttribute('disabled')).toBe(true))
  })

  it('the preview follows the hovered type', async () => {
    const { user, card } = await open({ idleMinutes: 20, types: { review: 'list', radar: 'mute' } as NotifySettings['types'] })
    const preview = within(card).getByRole('region', { name: 'Así te llega' })
    const banner = (): HTMLElement => preview.querySelector('.nt-ban') as HTMLElement
    const caption = (): string => preview.querySelector('.nt-cap')?.textContent ?? ''

    // The first type until another is hovered.
    expect(within(preview).getByText('WEB-3535 te pregunta')).toBeTruthy()
    expect(within(preview).getByText('¿Uso la tabla del BOE o la de la API?')).toBeTruthy()
    expect(caption()).toBe('Así te sale en el Mac: Te pregunta algo')
    expect(banner().classList.contains('dim')).toBe(false)

    await user.hover(row(radios(card, 'Te piden revisión')))
    expect(within(banner()).getByText('Te piden revisión')).toBeTruthy()
    expect(within(banner()).getByText('Filtros persistentes en el listado del vendedor')).toBeTruthy()
    expect(caption()).toBe('Te piden revisión: solo en Avisos, sin globo ni sonido')
    expect(banner().classList.contains('dim')).toBe(true)

    // Focus moves it too; «{m}» is filled.
    act(() => within(card).getByRole('button', { name: 'Cinco minutos más' }).focus())
    expect(within(preview).getByText('WEB-3535 te espera')).toBeTruthy()
    expect(within(preview).getByText('Desde hace 20 min. Solo te lo recuerdo una vez.')).toBeTruthy()

    await user.hover(row(radios(card, 'Choca con otro trabajo')))
    expect(within(preview).getByText('Dos trabajos tocan lo mismo')).toBeTruthy()
    expect(within(preview).getByText('WEB-3535 y PF-4870 tocan src/Delivery/PromiseDate.php')).toBeTruthy()
    expect(caption()).toBe('Choca con otro trabajo: silenciado, no te avisa')
    expect(banner().classList.contains('dim')).toBe(true)
  })
})

