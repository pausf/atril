// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
  return screen.findByRole('region', { name: title })
}

describe('mr lens drafts in the window', () => {
  it('drafts can be published, sent or discarded', async () => {
    const drafts = [
      draft('a', { file: 'src/envio.ts', line: 42, text: 'Falta validar <b>provincia</b>: **ojo**' }),
      draft('b', { lens: 'design', severity: 'low' }),
      draft('c', { lens: 'tests', severity: 'medium', file: 'src/x.ts', state: 'published' }),
      draft('d', { lens: 'reliability', state: 'sent' })
    ]
    const page = { files: [{ path: 'src/envio.ts', oldPath: 'src/envio.ts', added: 1, removed: 0, lines: [{ kind: 'added' as const, new: 42, text: 'const iva = 0.21' }] }], reviewers: [] }
    const api = mockApi({ mrs: lists({ review: [mr(GH, { title: 'Envío con IVA' })] }), drafts: { [GH]: stored(drafts) }, pages: { [GH]: page } })
    const user = userEvent.setup()
    render(createElement(App))
    const view = await openView(user, 'Envío con IVA')
    expect(api.mrApi.draftsOf).toHaveBeenCalledWith(GH)

    // Each draft is plain text with its lens, severity and place, where M47 puts it.
    const card = async (text: string) => (await within(view).findByText(text)).closest('.mr-draft') as HTMLElement
    const a = await card('Falta validar <b>provincia</b>: **ojo**')
    expect(a.textContent).toContain('Seguridad · Alta')
    expect(a.textContent).toContain('src/envio.ts:42')
    expect(view.querySelector('.mr-draft b')).toBeNull()
    const b = await card('texto b')
    expect(b.textContent).toContain('Diseño · Baja')
    const c = await card('texto c')
    expect(c.textContent).toContain('src/x.ts')
    const d = await card('texto d')

    // Open drafts offer the three actions, «Publicar en esta línea» when they have one; the others a word and nothing to click.
    expect(within(a).getByRole('button', { name: 'Publicar en esta línea' })).toBeTruthy()
    expect(within(b).getByRole('button', { name: 'Publicar' })).toBeTruthy()
    for (const x of [a, b]) {
      expect(within(x).getByRole('button', { name: 'Mandar al agente' })).toBeTruthy()
      expect(within(x).getByRole('button', { name: 'Descartar' })).toBeTruthy()
    }
    expect(within(c).getByText('Publicado')).toBeTruthy()
    expect(within(d).getByText('Enviado al agente')).toBeTruthy()
    for (const x of [c, d]) expect(within(x).queryAllByRole('button')).toHaveLength(0)

    // Publicar: once, then published without actions; main's note (M37) follows «Publicado», and only there.
    const note = 'Publicado como comentario general: la forja no aceptó esa línea'
    vi.mocked(api.mrApi.publishDraft).mockResolvedValueOnce(stored(drafts.map((x) => (x.id === 'a' ? { ...x, state: 'published' as const, note } : x))))
    await user.click(within(a).getByRole('button', { name: 'Publicar en esta línea' }))
    expect(api.mrApi.publishDraft).toHaveBeenCalledTimes(1)
    expect(api.mrApi.publishDraft).toHaveBeenCalledWith(GH, 'a')
    const published = await card('Falta validar <b>provincia</b>: **ojo**')
    expect(await within(published).findByText('Publicado')).toBeTruthy()
    expect(within(published).getByText(note)).toBeTruthy()
    expect(within(published).queryAllByRole('button')).toHaveLength(0)
    expect(within(await card('texto c')).queryByText(note)).toBeNull()

    // A failure keeps the draft open and says why.
    vi.mocked(api.mrApi.sendDraft).mockResolvedValueOnce({ error: 'No se pudo enviar: ese trabajo ya no está' })
    await user.click(within(await card('texto b')).getByRole('button', { name: 'Mandar al agente' }))
    expect((await within(await card('texto b')).findByRole('alert')).textContent).toBe('No se pudo enviar: ese trabajo ya no está')
    expect(within(await card('texto b')).getByRole('button', { name: 'Publicar' })).toBeTruthy()
    vi.mocked(api.mrApi.publishDraft).mockResolvedValueOnce({ error: 'GitHub ha respondido 500' })
    await user.click(within(await card('texto b')).getByRole('button', { name: 'Publicar' }))
    expect((await within(await card('texto b')).findByRole('alert')).textContent).toBe('GitHub ha respondido 500')

    // Mandar al agente, then Descartar removes it.
    await user.click(within(await card('texto b')).getByRole('button', { name: 'Mandar al agente' }))
    expect(api.mrApi.sendDraft).toHaveBeenLastCalledWith(GH, 'b')
    expect(await within(await card('texto b')).findByText('Enviado al agente')).toBeTruthy()
    expect(within(await card('texto b')).queryByRole('alert')).toBeNull()
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

  it('comentar follows the drafts of the commit', async () => {
    const api = mockApi({
      mrs: lists({ mine: [mr(GH, { title: 'Envío con IVA', author: 'pau' })], following: [mr(FOLLOWED, { title: 'Ajena' })] }),
      review: { [GH]: stored([draft('n1', { text: 'Hallazgo nuevo' })]) }
    })
    const user = userEvent.setup()
    render(createElement(App))
    const comentar = async (view: HTMLElement) => {
      await user.click(await within(view).findByRole('button', { name: 'Revisar ▾' }))
      return screen.findByRole('menuitem', { name: /^Comentar/ })
    }

    // Never reviewed: Comentar asks once and the drafts appear.
    let view = await openView(user, 'Envío con IVA')
    await user.click(await comentar(view))
    expect(api.mrApi.review).toHaveBeenCalledTimes(1)
    expect(api.mrApi.review).toHaveBeenCalledWith(GH)
    expect(await within(view).findByText('Hallazgo nuevo')).toBeTruthy()
    // Drafts exist for this commit: Comentar is disabled and asks nothing.
    const again = await comentar(view)
    expect(again.getAttribute('aria-disabled')).toBe('true')
    await user.click(again)
    expect(api.mrApi.review).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    await user.keyboard('{Escape}')

    // Another MR of Sigo: never offered.
    view = await openView(user, 'Ajena')
    await waitFor(() => expect(api.mrApi.draftsOf).toHaveBeenCalledWith(FOLLOWED))
    expect(within(view).queryByRole('button', { name: /Revisar/ })).toBeNull()
    expect(within(view).queryByRole('region', { name: 'Libretto' })).toBeNull()
  })

  it('an older commit offers comentar de nuevo, and nothing found or a failure is said', async () => {
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

    // Its result replaces every draft; zero findings is an answer.
    await user.click(within(view).getByRole('button', { name: 'Revisar ▾' }))
    await user.click(screen.getByRole('menuitem', { name: /^Comentar de nuevo/ }))
    expect(await within(view).findByText('Libretto no ha encontrado nada que comentar')).toBeTruthy()
    expect(within(view).queryByText('Del commit viejo')).toBeNull()
    expect(within(view).queryByText('De un commit anterior')).toBeNull()

    // A failed review says why and offers it again.
    vi.mocked(api.mrApi.draftsOf).mockResolvedValue({ stale: false, canSend: false, drafts: [] })
    vi.mocked(api.mrApi.review).mockResolvedValueOnce({ error: 'Claude no ha podido revisar esta MR: tiempo agotado' })
    cleanup()
    render(createElement(App))
    const fresh = await openView(user, 'Envío con IVA')
    await user.click(await within(fresh).findByRole('button', { name: 'Revisar ▾' }))
    await user.click(screen.getByRole('menuitem', { name: /^Comentar/ }))
    expect((await within(fresh).findByRole('alert')).textContent).toBe('Claude no ha podido revisar esta MR: tiempo agotado')
    await user.click(within(fresh).getByRole('button', { name: 'Revisar ▾' }))
    expect(screen.getByRole('menuitem', { name: /^Comentar/ }).getAttribute('aria-disabled')).toBeNull()
  })
})
