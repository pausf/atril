// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
        aviso('g', 'gone', 'Cola de pagos', 2, { url: GONE }),
        aviso('a', 'agent', 'feat/envio', 3, { workspaceId: 'w1' }),
        aviso('x', 'agent', 'feat/borrada', 4, { workspaceId: 'w9' })
      ]
    })
    const user = userEvent.setup()
    render(createElement(App))
    const open = async (title: RegExp): Promise<void> => {
      await user.click(await screen.findByRole('button', { name: /^Avisos/ }))
      await user.click(within(feed()).getByRole('button', { name: title }))
    }

    // An MR in the latest listing: marked read, its MR view opens on the MR screen.
    await open(/Envío con IVA/)
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['r'])
    expect(await screen.findByRole('dialog', { name: 'Envío con IVA' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: /^MR/ })).toBeTruthy()

    // An MR no longer listed: read, and a word instead of a view.
    await open(/Cola de pagos/)
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['g'])
    expect((await screen.findByRole('status')).textContent).toBe('Esta MR ya no está en la lista')
    expect(screen.queryByRole('dialog')).toBeNull()

    // A workspace that is gone.
    await user.click(within(feed()).getByRole('button', { name: /feat\/borrada/ }))
    expect(api.avisosApi.markRead).toHaveBeenLastCalledWith(['x'])
    expect(screen.getByRole('status').textContent).toBe('Ese trabajo ya no está')

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
