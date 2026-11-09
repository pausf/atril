// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrDraft, MrDrafts, MrItem, MrLists } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const GH = 'https://github.com/acme/web/pull/1'
const FOLLOWED = 'https://github.com/acme/web/pull/2'
const at = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString()
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'ana', updatedAt: at(1), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })
const draft = (id: string, o: Partial<MrDraft> = {}): MrDraft => ({ id, lens: 'security', severity: 'high', text: `texto ${id}`, state: 'open', ...o })
const stored = (drafts: MrDraft[], o: Partial<MrDrafts> = {}): MrDrafts => ({ head: 'h1', stale: false, canSend: true, drafts, ...o })

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

async function openView(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(await screen.findByRole('button', { name: /^MR/ }))
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }))
  return screen.findByRole('dialog', { name: title })
}

describe('mr lens drafts in the window', () => {
  it('drafts can be published, sent or discarded', async () => {
    const drafts = [
      draft('a', { file: 'src/envio.ts', line: 42, text: 'Falta validar <b>provincia</b>: **ojo**' }),
      draft('b', { lens: 'design', severity: 'low' }),
      draft('c', { lens: 'tests', severity: 'medium', file: 'src/x.ts', state: 'published' }),
      draft('d', { lens: 'reliability', state: 'sent' })
    ]
    const api = mockApi({ mrs: lists({ review: [mr(GH, { title: 'Envío con IVA' })] }), drafts: { [GH]: stored(drafts) } })
    const user = userEvent.setup()
    render(createElement(App))
    const view = await openView(user, 'Envío con IVA')
    expect(api.mrApi.draftsOf).toHaveBeenCalledWith(GH)

    // The section sits above the threads; each draft is plain text with its lens, severity and place.
    const section = await within(view).findByRole('region', { name: 'Libretto' })
    expect(view.querySelector('.mr-threads')!.firstElementChild).toBe(section)
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]!.textContent).toContain('Seguridad · Alta')
    expect(items[0]!.textContent).toContain('src/envio.ts:42')
    expect(within(items[0]!).getByText('Falta validar <b>provincia</b>: **ojo**')).toBeTruthy()
    expect(section.querySelector('b')).toBeNull()
    expect(items[1]!.textContent).toContain('Diseño · Baja')
    expect(items[2]!.textContent).toContain('src/x.ts')

    // Open drafts offer the three actions; the others a word and nothing to click.
    for (const i of [0, 1]) {
      expect(within(items[i]!).getByRole('button', { name: 'Publicar' })).toBeTruthy()
      expect(within(items[i]!).getByRole('button', { name: 'Mandar al agente' })).toBeTruthy()
      expect(within(items[i]!).getByRole('button', { name: 'Descartar' })).toBeTruthy()
    }
    expect(within(items[2]!).getByText('Publicado')).toBeTruthy()
    expect(within(items[3]!).getByText('Enviado al agente')).toBeTruthy()
    for (const i of [2, 3]) expect(within(items[i]!).queryAllByRole('button')).toHaveLength(0)

    // Publicar: once, then published without actions.
    await user.click(within(items[0]!).getByRole('button', { name: 'Publicar' }))
    expect(api.mrApi.publishDraft).toHaveBeenCalledTimes(1)
    expect(api.mrApi.publishDraft).toHaveBeenCalledWith(GH, 'a')
    expect(await within(items[0]!).findByText('Publicado')).toBeTruthy()
    expect(within(items[0]!).queryAllByRole('button')).toHaveLength(0)

    // A failure keeps the draft open and says why.
    vi.mocked(api.mrApi.sendDraft).mockResolvedValueOnce({ error: 'No se pudo enviar: ese trabajo ya no está' })
    await user.click(within(items[1]!).getByRole('button', { name: 'Mandar al agente' }))
    expect((await within(items[1]!).findByRole('alert')).textContent).toBe('No se pudo enviar: ese trabajo ya no está')
    expect(within(items[1]!).getByRole('button', { name: 'Publicar' })).toBeTruthy()
    vi.mocked(api.mrApi.publishDraft).mockResolvedValueOnce({ error: 'GitHub ha respondido 500' })
    await user.click(within(items[1]!).getByRole('button', { name: 'Publicar' }))
    expect((await within(items[1]!).findByRole('alert')).textContent).toBe('GitHub ha respondido 500')

    // Mandar al agente, then Descartar removes it.
    await user.click(within(items[1]!).getByRole('button', { name: 'Mandar al agente' }))
    expect(api.mrApi.sendDraft).toHaveBeenLastCalledWith(GH, 'b')
    expect(await within(items[1]!).findByText('Enviado al agente')).toBeTruthy()
    expect(within(items[1]!).queryByRole('alert')).toBeNull()
  })

  it('mandar al agente only shows when main offers it, and descartar removes', async () => {
    const api = mockApi({ mrs: lists({ mine: [mr(GH, { title: 'Envío con IVA', author: 'pau' })] }), drafts: { [GH]: stored([draft('a'), draft('b')], { canSend: false }) } })
    const user = userEvent.setup()
    render(createElement(App))
    const view = await openView(user, 'Envío con IVA')
    const section = await within(view).findByRole('region', { name: 'Libretto' })
    expect(within(section).queryByRole('button', { name: 'Mandar al agente' })).toBeNull()
    await user.click(within(section).getAllByRole('button', { name: 'Descartar' })[0]!)
    expect(api.mrApi.discardDraft).toHaveBeenCalledWith(GH, 'a')
    expect(within(section).getAllByRole('listitem')).toHaveLength(1)
    expect(within(section).getByText('texto b')).toBeTruthy()
    expect(within(section).queryByText('texto a')).toBeNull()
  })

  it('the libretto button follows the drafts of the commit', async () => {
    const api = mockApi({
      mrs: lists({ mine: [mr(GH, { title: 'Envío con IVA', author: 'pau' })], following: [mr(FOLLOWED, { title: 'Ajena' })] }),
      review: { [GH]: stored([draft('n1', { text: 'Hallazgo nuevo' })]) }
    })
    const user = userEvent.setup()
    render(createElement(App))

    // Never reviewed: the button; one click asks once, even clicked twice, and the drafts appear.
    let view = await openView(user, 'Envío con IVA')
    const button = await within(view).findByRole('button', { name: 'Revisar con Libretto' })
    await user.dblClick(button)
    expect(api.mrApi.review).toHaveBeenCalledTimes(1)
    expect(api.mrApi.review).toHaveBeenCalledWith(GH)
    expect(await within(view).findByText('Hallazgo nuevo')).toBeTruthy()
    // Drafts exist for this commit: no button.
    expect(within(view).queryByRole('button', { name: /Revisar/ })).toBeNull()
    await user.keyboard('{Escape}')

    // Another MR of Sigo: never offered.
    view = await openView(user, 'Ajena')
    await within(view).findByText('Sin comentarios.')
    expect(within(view).queryByRole('button', { name: /Revisar/ })).toBeNull()
    expect(within(view).queryByRole('region', { name: 'Libretto' })).toBeNull()
    await user.keyboard('{Escape}')
  })

  it('an older commit offers revisar de nuevo, and nothing found or a failure is said', async () => {
    const api = mockApi({
      mrs: lists({ review: [mr(GH, { title: 'Envío con IVA' })] }),
      drafts: { [GH]: stored([draft('old', { text: 'Del commit viejo' })], { stale: true }) },
      review: { [GH]: stored([]) }
    })
    const user = userEvent.setup()
    render(createElement(App))
    const view = await openView(user, 'Envío con IVA')
    expect(await within(view).findByText('De un commit anterior')).toBeTruthy()
    expect(within(view).getByText('Del commit viejo')).toBeTruthy()
    expect(within(view).queryByRole('button', { name: 'Revisar con Libretto' })).toBeNull()

    // Its result replaces every draft; zero findings is an answer.
    await user.click(within(view).getByRole('button', { name: 'Revisar de nuevo' }))
    expect(await within(view).findByText('Libretto no ha encontrado nada que comentar')).toBeTruthy()
    expect(within(view).queryByText('Del commit viejo')).toBeNull()
    expect(within(view).queryByText('De un commit anterior')).toBeNull()
    expect(within(view).queryByRole('button', { name: /Revisar/ })).toBeNull()

    // A failed review says why and offers it again.
    vi.mocked(api.mrApi.draftsOf).mockResolvedValue({ stale: false, canSend: false, drafts: [] })
    vi.mocked(api.mrApi.review).mockResolvedValueOnce({ error: 'Claude no ha podido revisar esta MR: tiempo agotado' })
    cleanup()
    render(createElement(App))
    const again = await openView(user, 'Envío con IVA')
    await user.click(await within(again).findByRole('button', { name: 'Revisar con Libretto' }))
    expect((await within(again).findByRole('alert')).textContent).toBe('Claude no ha podido revisar esta MR: tiempo agotado')
    expect(within(again).getByRole('button', { name: 'Revisar con Libretto' })).toBeTruthy()
  })
})
