// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists, MrReply, MrThread } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const GH = 'https://github.com/acme/web/pull/1'
const GL = 'https://git.example.com/grp/shop/-/merge_requests/7'
const at = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString()
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'ana', updatedAt: at(1), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github', 'gitlab'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })
const c = (id: string, author: string, h: number, body = `texto ${id}`) => ({ id, author, at: at(h), body })

const INLINE: MrThread = { id: '11', forge: 'github', file: 'src/envio.ts', line: 42, code: '+  return coste * 1.21', comments: [c('11', 'eva', 5, 'Esto es <b>IVA</b> fijo: **¿y Canarias?**'), c('12', 'pau', 4), c('13', 'eva', 2)], yourTurn: true }
const GENERAL: MrThread = { id: 'general', forge: 'github', comments: [c('20', 'leo', 3, 'Lo pruebo mañana.')], yourTurn: true }
const RESOLVED: MrThread = { id: 'd1', forge: 'gitlab', file: 'app/a.rb', line: 3, resolved: true, comments: [c('1', 'eva', 2)], yourTurn: false }
const OPEN: MrThread = { id: 'd2', forge: 'gitlab', file: 'app/b.rb', resolved: false, comments: [c('2', 'eva', 2)], yourTurn: false }

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

async function openView(user: ReturnType<typeof userEvent.setup>, title: string) {
  if (!screen.queryByRole('heading', { level: 1, name: /^MR/ })) await user.click(await screen.findByRole('button', { name: /^MR/ }))
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }))
  const view = await screen.findByRole('region', { name: title })
  await user.click(within(view).getByRole('tab', { name: /^Conversación/ }))
  return view
}

describe('mr threads in the window', () => {
  it('threads show their comments, place and state', async () => {
    const api = mockApi({
      mrs: lists({ review: [mr(GH, { title: 'Envío con IVA' })], following: [mr(GL, { forge: 'gitlab', title: 'Nuevo filtro', project: 'grp/shop' })] }),
      threads: { [GH]: { threads: [INLINE, GENERAL], more: true }, [GL]: { threads: [RESOLVED, OPEN], more: false } }
    })
    const user = userEvent.setup()
    render(createElement(App))

    const view = await openView(user, 'Envío con IVA')
    expect(api.mrApi.threads).toHaveBeenCalledWith(GH)
    expect(view.textContent).toContain('acme/web')

    // M24: the tab counts the threads waiting for you; M19's note when the forge had more.
    expect(await within(view).findByRole('tab', { name: 'Conversación 2 · te toca 2' })).toBeTruthy()
    expect(within(view).getByText('Hay más en GitHub: “Te toca responder” puede estar incompleto')).toBeTruthy()

    // M18: the inline thread with its file, line and code, oldest first; General apart.
    const threads = within(view).getAllByRole('article')
    expect(threads).toHaveLength(2)
    const inline = threads[0]!.textContent!
    expect(inline).toContain('src/envio.ts:42')
    expect(inline).toContain('+  return coste * 1.21')
    expect(inline).toContain('Te toca responder')
    const order = ['eva', 'texto 12', 'texto 13'].map((x) => inline.indexOf(x))
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(threads[1]!.textContent).toMatch(/^General.*leo.*Lo pruebo mañana\./)

    // M23: markup shows literally.
    expect(within(threads[0]!).getByText('Esto es <b>IVA</b> fijo: **¿y Canarias?**')).toBeTruthy()
    expect(view.querySelector('b')).toBeNull()

    // M23: Escape closes; with unsent text it asks first.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Envío con IVA' })).toBeNull()

    const gl = await openView(user, 'Nuevo filtro')
    const [resolved, open] = await within(gl).findAllByRole('article')
    expect(resolved!.textContent).toContain('app/a.rb:3')
    expect(resolved!.textContent).toContain('Resuelto')
    expect(open!.textContent).toContain('app/b.rb')
    expect(open!.textContent).toContain('Sin resolver')
    expect(within(gl).getByRole('tab', { name: 'Conversación 2' })).toBeTruthy()
    expect(within(gl).getByRole('button', { name: 'Abrir en GitLab ↗' })).toBeTruthy()

    await user.type(within(open!).getByRole('textbox', { name: 'Responder' }), 'Lo miro')
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.keyboard('{Escape}')
    expect(ask).toHaveBeenCalledWith('Tienes una respuesta sin enviar. ¿Salir y descartarla?')
    expect(screen.getByRole('region', { name: 'Nuevo filtro' })).toBeTruthy()
    expect((within(open!).getByRole('textbox', { name: 'Responder' }) as HTMLTextAreaElement).value).toBe('Lo miro')
    ask.mockReturnValue(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Nuevo filtro' })).toBeNull()
  })

  it('a reply is sent with one click and kept on failure', async () => {
    const api = mockApi({ mrs: lists({ mine: [mr(GH, { title: 'Envío con IVA', author: 'pau' })] }), threads: { [GH]: { threads: [INLINE, GENERAL], more: false } } })
    const user = userEvent.setup()
    render(createElement(App))
    const view = await openView(user, 'Envío con IVA')
    const [inline, general] = await within(view).findAllByRole('article')
    const box = within(inline!).getByRole('textbox', { name: 'Responder' }) as HTMLTextAreaElement
    const send = within(inline!).getByRole('button', { name: 'Enviar' }) as HTMLButtonElement

    // Empty: nothing to send.
    expect(send.disabled).toBe(true)
    await user.type(box, '   ')
    expect(send.disabled).toBe(true)
    await user.clear(box)

    // One reply per click, even clicked twice while it is on its way.
    let answer!: (r: MrReply) => void
    vi.mocked(api.mrApi.reply).mockImplementationOnce(() => new Promise<MrReply>((r) => (answer = r)))
    await user.type(box, 'Hecho, con Canarias')
    await user.dblClick(send)
    expect(api.mrApi.reply).toHaveBeenCalledTimes(1)
    expect(api.mrApi.reply).toHaveBeenCalledWith(GH, '11', 'Hecho, con Canarias')
    answer({ comment: c('99', 'pau', 0, 'Hecho, con Canarias') })
    expect(await within(inline!).findByText('Hecho, con Canarias')).toBeTruthy()
    expect(box.value).toBe('')
    // Your own last word: no longer your turn.
    expect(inline!.textContent).not.toContain('Te toca responder')
    expect(within(view).getByRole('tab', { name: 'Conversación 2 · te toca 1' })).toBeTruthy()

    // A failure keeps the text and says why.
    vi.mocked(api.mrApi.reply).mockResolvedValueOnce({ error: 'GitHub ha respondido 403' })
    const generalBox = within(general!).getByRole('textbox', { name: 'Responder' }) as HTMLTextAreaElement
    await user.type(generalBox, 'Gracias')
    await user.click(within(general!).getByRole('button', { name: 'Enviar' }))
    expect(api.mrApi.reply).toHaveBeenLastCalledWith(GH, 'general', 'Gracias')
    expect((await within(general!).findByRole('alert')).textContent).toBe('GitHub ha respondido 403')
    expect(generalBox.value).toBe('Gracias')

    // M22: an MR no longer listed says so and keeps the text.
    vi.mocked(api.mrApi.reply).mockResolvedValueOnce({ error: 'Esta MR ya no está en la lista: actualiza' })
    await user.click(within(general!).getByRole('button', { name: 'Enviar' }))
    expect((await within(general!).findByRole('alert')).textContent).toBe('Esta MR ya no está en la lista: actualiza')
    expect(generalBox.value).toBe('Gracias')
    expect(api.mrApi.reply).toHaveBeenCalledTimes(3)
  })
})
