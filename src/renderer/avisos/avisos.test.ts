// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Aviso, MrItem, MrLists } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const MIN = 60_000
const GH = 'https://github.com/acme/web/pull/1'
const GONE = 'https://github.com/acme/web/pull/2'
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'ana', updatedAt: new Date().toISOString(), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })
const aviso = (id: string, kind: Aviso['kind'], title: string, minutesAgo: number, o: Partial<Aviso> = {}): Aviso => ({ id, kind, title, at: Date.now() - minutesAgo * MIN, read: false, ...o })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const feed = (): HTMLElement => screen.getByRole('list', { name: 'Avisos' })
const rows = (): string[] => within(feed()).queryAllByRole('button').map((b) => b.textContent ?? '')

describe('avisos', () => {
  it('the feed lists, filters and marks read', async () => {
    const api = mockApi({
      avisos: [
        aviso('c', 'ci', 'Cola de pagos', 90, { url: GONE }),
        aviso('r', 'review', 'Envío con IVA', 5, { url: GH }),
        aviso('o', 'opened', 'Filtro nuevo', 300, { url: GH, read: true }),
        aviso('a', 'agent', 'feat/envio', 20, { workspaceId: 'w1' })
      ]
    })
    const user = userEvent.setup()
    render(createElement(App))

    // The rail counts unread notices before the screen is ever opened.
    const entry = await screen.findByRole('button', { name: 'Avisos: 3 sin leer' })
    expect(entry.textContent).toBe('Avisos3')
    await user.click(entry)

    // Newest first, with kind, title and time.
    expect(rows()).toEqual([
      expect.stringMatching(/Te piden revisión.*Envío con IVA.*hace 5 min/),
      expect.stringMatching(/Agente.*feat\/envio te necesita.*hace 20 min/),
      expect.stringMatching(/La CI falla.*Cola de pagos.*hace 1 h/),
      expect.stringMatching(/Has abierto una MR.*Filtro nuevo.*hace 5 h/)
    ])

    // A filter hides the other kinds; «Todos» brings them back.
    const filters = screen.getByRole('group', { name: 'Filtrar por tipo' })
    await user.click(within(filters).getByRole('button', { name: 'La CI falla' }))
    expect(within(filters).getByRole('button', { name: 'La CI falla' }).getAttribute('aria-pressed')).toBe('true')
    expect(rows()).toEqual([expect.stringMatching(/Cola de pagos/)])
    await user.click(within(filters).getByRole('button', { name: 'Todos' }))
    expect(rows()).toHaveLength(4)

    // A notice that arrives while the screen is open shows up and counts.
    api.pushAvisos([aviso('n', 'comment', 'Envío con IVA', 0, { url: GH }), ...(await api.avisosApi.list())])
    expect(await screen.findByRole('button', { name: 'Avisos: 4 sin leer' })).toBeTruthy()
    expect(rows()[0]).toMatch(/Comentario nuevo.*Envío con IVA.*ahora/)

    await user.click(screen.getByRole('button', { name: 'Marcar todo leído' }))
    expect(api.avisosApi.markRead).toHaveBeenCalledWith('all')
    expect((await screen.findByRole('button', { name: 'Avisos' })).textContent).toBe('Avisos')
  })

  it('a notice opens what it is about', async () => {
    const api = mockApi({
      mrs: lists({ review: [mr(GH, { title: 'Envío con IVA' })] }),
      workspaces: [workspace('w1', 'feat/envio', false)],
      avisos: [
        aviso('r', 'review', 'Envío con IVA', 1, { url: GH }),
        aviso('g', 'comment', 'Cola de pagos', 2, { url: GONE }),
        aviso('a', 'agent', 'feat/envio', 3, { workspaceId: 'w1' }),
        aviso('x', 'agent', 'feat/borrada', 4, { workspaceId: 'w9' }),
        aviso('q', 'qa', 'WEB-9', 5, { workspaceId: 'w1', vars: { p: 1, f: 0 } }),
        aviso('z', 'quota', '', 6, { vars: { window: 'fiveHour', pct: 82, resetsAt: null } })
      ]
    })
    const user = userEvent.setup()
    render(createElement(App))
    const open = async (title: RegExp): Promise<void> => {
      await user.click(await screen.findByRole('button', { name: /^Avisos/ }))
      await user.click(within(feed()).getByRole('button', { name: title }))
    }

    // An MR in the latest listing: marked read, its MR page opens on the MR screen (M43).
    await open(/Envío con IVA/)
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['r'])
    expect(await screen.findByRole('region', { name: 'Envío con IVA' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: /^MR/ })).toBeTruthy()

    // An MR no longer listed: read, and a word instead of a view.
    await open(/Cola de pagos/)
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['g'])
    expect((await screen.findByRole('status')).textContent).toBe('Esta MR ya no está en la lista')
    expect(screen.queryByRole('region', { name: 'Cola de pagos' })).toBeNull()

    // A workspace that is gone.
    await user.click(within(feed()).getByRole('button', { name: /feat\/borrada/ }))
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['x'])
    expect(screen.getByRole('status').textContent).toBe('Ese trabajo ya no está')

    // The quota opens nothing beyond marking it read.
    await user.click(within(feed()).getByRole('button', { name: /Cuota de Claude al 80/ }))
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['z'])
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('list', { name: 'Avisos' })).toBeTruthy()

    // A QA notice opens that work's QA screen.
    await user.click(within(feed()).getByRole('button', { name: /QA terminada en WEB-9/ }))
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['q'])
    expect(screen.getByRole('button', { name: 'QA' }).getAttribute('aria-current')).toBe('page')
    await user.click(await screen.findByRole('button', { name: /^Avisos/ }))

    // A live workspace: selected on the Trabajo screen.
    await user.click(within(feed()).getByRole('button', { name: /feat\/envio/ }))
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['a'])
    expect(api.menuApi.setState).toHaveBeenLastCalledWith('w1', 1)
    expect(screen.queryByRole('list', { name: 'Avisos' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Trabajo' }).getAttribute('aria-current')).toBe('page')
  })
})

describe('avisos badge', () => {
  it('the badge counts what waits for you', async () => {
    mockApi({
      avisos: [
        // Two agent notices of one workspace (an old one from before V18) count once; another workspace once more.
        aviso('a1', 'ask', 'WEB-1', 1, { workspaceId: 'w1' }),
        aviso('a2', 'agent', 'feat/w1', 30, { workspaceId: 'w1' }),
        aviso('a3', 'done', 'WEB-2', 2, { workspaceId: 'w2' }),
        aviso('a4', 'idle', 'WEB-3', 2, { workspaceId: 'w3', read: true }),
        // Everything else counts once per notice.
        aviso('s1', 'stopped', 'WEB-1', 3, { workspaceId: 'w1' }),
        aviso('r1', 'review', 'Envío con IVA', 4, { url: GH }),
        aviso('q1', 'quota', '', 5),
        aviso('r2', 'comment', 'Leído', 6, { url: GH, read: true })
      ]
    })
    render(createElement(App))
    expect(await screen.findByRole('button', { name: 'Avisos: 5 sin leer' })).toBeTruthy()
  })
})

describe('avisos kinds', () => {
  it('merged, closed and gone open the forge', async () => {
    const api = mockApi({
      mrs: lists({ mine: [mr(GH)] }),
      avisos: [
        aviso('m', 'merged', 'Cola de pagos', 1, { url: GONE }),
        aviso('c', 'closed', 'Envío con IVA', 2, { url: GH }),
        aviso('g', 'gone', 'Filtro nuevo', 3, { url: GONE })
      ]
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^Avisos/ }))
    for (const [id, title, url] of [['m', /Cola de pagos/, GONE], ['c', /Envío con IVA/, GH], ['g', /Filtro nuevo/, GONE]] as const) {
      await user.click(within(feed()).getByRole('button', { name: title }))
      expect(api.avisosApi.markRead).toHaveBeenLastCalledWith([id])
      // In the browser, even when the MR is still listed: it is no longer open.
      expect(api.mrApi.open).toHaveBeenLastCalledWith(url)
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.queryByRole('status')).toBeNull()
    }
    expect(screen.getByRole('list', { name: 'Avisos' })).toBeTruthy()
  })

  it('a question keeps what it asked', async () => {
    mockApi({
      workspaces: [workspace('w1', 'feat/envio'), workspace('w2', 'feat/iva'), workspace('w3', 'feat/sin')],
      avisos: [
        aviso('a', 'ask', 'WEB-1', 1, { workspaceId: 'w1', detail: 'Te pregunta: ¿Uso <b>la tabla</b> del BOE?' }),
        aviso('d', 'done', 'WEB-2', 2, { workspaceId: 'w2', detail: 'Claude dice: Plan listo, 9 tareas.' }),
        aviso('n', 'ask', 'WEB-3', 3, { workspaceId: 'w3' })
      ]
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^Avisos/ }))
    const row = (name: RegExp): HTMLElement => within(feed()).getByRole('button', { name })
    // The agent's words, under the title, as text (no markup comes alive).
    expect(within(row(/WEB-1/)).getByText('Te pregunta: ¿Uso <b>la tabla</b> del BOE?')).toBeTruthy()
    expect(row(/WEB-1/).querySelector('b')).toBeNull()
    expect(within(row(/WEB-2/)).getByText('Claude dice: Plan listo, 9 tareas.')).toBeTruthy()
    // Without detail, the title alone.
    expect(row(/WEB-3/).querySelector('.detail')).toBeNull()

    // Localised as the needs-you body is: Atril's prefix in English, Claude's words as written.
    cleanup()
    mockApi({ ui: { language: 'en' }, avisos: [aviso('a', 'ask', 'WEB-1', 1, { workspaceId: 'w1', detail: 'Te pregunta: ¿Uso la tabla del BOE?' })] })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^Notices/ }))
    expect(within(screen.getByRole('list', { name: 'Notices' })).getByText('Asks you: ¿Uso la tabla del BOE?')).toBeTruthy()
  })

  it('every kind has its label and its filter', async () => {
    const w = { workspaceId: 'w1' }
    mockApi({
      avisos: [
        aviso('1', 'ask', 'WEB-1', 1, w),
        aviso('2', 'done', 'WEB-2', 2, { workspaceId: 'w2' }),
        aviso('3', 'stopped', 'WEB-3', 3, { workspaceId: 'w3' }),
        aviso('4', 'idle', 'WEB-4', 4, { workspaceId: 'w4', vars: { m: 15 } }),
        aviso('5', 'radar', 'WEB-5', 5, { workspaceId: 'w5', vars: { b: 'WEB-6', file: 'src/a.ts', more: 0 } }),
        aviso('6', 'qa', 'WEB-6', 6, { workspaceId: 'w6', vars: { p: 5, f: 1 } }),
        aviso('7', 'cipass', 'Envío con IVA', 7, { url: GH }),
        aviso('8', 'merged', 'Cola de pagos', 8, { url: GONE }),
        aviso('9', 'closed', 'Filtro nuevo', 9, { url: GONE }),
        aviso('10', 'review', 'Revisa esto', 10, { url: GH })
      ]
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^Avisos/ }))
    expect(rows()).toEqual([
      expect.stringMatching(/WEB-1 te pregunta/),
      expect.stringMatching(/WEB-2 ha terminado su turno/),
      expect.stringMatching(/WEB-3 se ha parado/),
      expect.stringMatching(/WEB-4 te espera/),
      expect.stringMatching(/WEB-5 choca con otro trabajo/),
      expect.stringMatching(/QA terminada en WEB-6/),
      expect.stringMatching(/La CI vuelve a pasar.*Envío con IVA/),
      expect.stringMatching(/MR fusionada.*Cola de pagos/),
      expect.stringMatching(/MR cerrada.*Filtro nuevo/),
      expect.stringMatching(/Te piden revisión.*Revisa esto/)
    ])
    // Only the kinds stored, each once.
    const filters = screen.getByRole('group', { name: 'Filtrar por tipo' })
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Todos',
      'Te pregunta algo',
      'Ha terminado su turno',
      'Se ha parado',
      'Te espera',
      'Choca con otro trabajo',
      'QA terminada',
      'Te piden revisión',
      'La CI vuelve a pasar',
      'MR fusionada',
      'MR cerrada'
    ])
    await user.click(within(filters).getByRole('button', { name: 'MR cerrada' }))
    expect(rows()).toEqual([expect.stringMatching(/Filtro nuevo/)])
  })

  it('a merged MR offers to close its work', async () => {
    // A live work mounts its terminal.
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
    const api = mockApi({
      workspaces: [workspace('w1', 'feat/cola')],
      closable: { m: 'w1' },
      avisos: [aviso('m', 'merged', 'Cola de pagos', 1, { url: GONE, branch: 'feat/cola', project: 'acme/web' }), aviso('c', 'closed', 'Filtro nuevo', 2, { url: GH, branch: 'feat/otra', project: 'acme/web' })]
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^Avisos/ }))
    const item = (name: RegExp): HTMLElement => within(feed()).getByRole('button', { name }).closest('li') as HTMLElement
    // Only where main matched a non-review work of the same repo.
    const close = await within(item(/Cola de pagos/)).findByRole('button', { name: 'Cerrar su trabajo' })
    expect(within(item(/Filtro nuevo/)).queryByRole('button', { name: 'Cerrar su trabajo' })).toBeNull()

    // It opens the usual confirmation; nothing closes by itself.
    await user.click(close)
    expect(await screen.findByText('¿Cerrar feat/cola? Su agente se para y el trabajo pasa a Terminados.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trabajo' }).getAttribute('aria-current')).toBe('page')
    expect(api.ws.remove).not.toHaveBeenCalled()
  })
})
