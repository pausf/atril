// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const MINE = 'https://github.com/acme/shop-web/pull/41'
const REVIEW = 'https://github.com/acme/shop-web/pull/88'
const DONE = 'https://github.com/acme/shop-web/pull/90'
const NOREPO = 'https://github.com/acme/api/pull/3'
const BROKEN = 'https://github.com/acme/shop-web/pull/91'
const at = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString()
const mr = (url: string, title: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title, project: 'acme/shop-web', author: 'ana', updatedAt: at(1), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })

beforeEach(() => {
  mockSystemTheme(false)
  // Trabajo mounts the live workspace's terminal, which watches its size.
  vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  cleanup()
})

async function openView(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(await screen.findByRole('button', { name: /^MR/ }))
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }))
  return screen.findByRole('region', { name: title })
}
const selectedRow = (): string | null | undefined => document.querySelector('.ws-row[aria-pressed="true"]')?.textContent

describe('open an mr in atril from its page (M35)', () => {
  it('the mr page opens or finds its workspace', async () => {
    const dead = workspace('old1', 'feat/done', false)
    const api = mockApi({
      workspaces: [workspace('w1', 'feat/other'), dead],
      mrs: lists({
        mine: [mr(MINE, 'Calendario'), mr(DONE, 'Ya abierta')],
        review: [mr(REVIEW, 'Filtros'), mr(NOREPO, 'Sin repo', { project: 'acme/api' }), mr(BROKEN, 'Rota')]
      }),
      work: {
        [MINE]: { kind: 'continue' },
        [REVIEW]: { kind: 'review' },
        [DONE]: { kind: 'existing', workspaceId: 'old1' },
        [NOREPO]: { kind: 'none', reason: 'Añade el repo de acme/api en Ajustes' },
        [BROKEN]: { kind: 'continue' }
      },
      openWork: {
        [REVIEW]: { workspace: { ...workspace('rev1', 'feat/filters'), mode: 'review' } },
        [MINE]: { workspace: workspace('cont1', 'feat/calendar') },
        [BROKEN]: { error: 'No se pudo traer la rama: fatal: couldn\'t find remote ref feat/rota' }
      }
    })
    const user = userEvent.setup()
    render(createElement(App))

    // Review: «A fondo» in «Revisar ▾»; pressing it ends on Trabajo with the review session selected.
    let view = await openView(user, 'Filtros')
    await user.click(await within(view).findByRole('button', { name: 'Revisar ▾' }))
    await user.click(await screen.findByRole('menuitem', { name: /^A fondo/ }))
    expect(api.mrApi.openWork).toHaveBeenCalledWith(REVIEW)
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Filtros' })).toBeNull())
    await waitFor(() => expect(selectedRow()).toContain('feat/filters'))
    expect(selectedRow()).toContain('Revisión')

    // Continue: Mías says «Seguir en Atril» in the header.
    view = await openView(user, 'Calendario')
    expect(within(view).queryByRole('button', { name: 'Revisar en Atril' })).toBeNull()
    expect((await within(view).findByRole('button', { name: 'Seguir en Atril' })).closest('.mr-page-head')).toBeTruthy()
    await user.click(await within(view).findByRole('button', { name: 'Seguir en Atril' }))
    expect(api.mrApi.openWork).toHaveBeenCalledWith(MINE)
    await waitFor(() => expect(selectedRow()).toContain('feat/calendar'))

    // Existing: «Ir al trabajo» opens nothing new; a dead workspace is selected and shows as stopped.
    view = await openView(user, 'Ya abierta')
    await user.click(await within(view).findByRole('button', { name: 'Ir al trabajo' }))
    expect(api.mrApi.openWork).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(selectedRow()).toContain('feat/done'))
    expect(selectedRow()).toContain('parado')

    // None: the reason and a link to Ajustes → Repos.
    view = await openView(user, 'Sin repo')
    expect(await within(view).findByText('Añade el repo de acme/api en Ajustes')).toBeTruthy()
    expect(within(view).queryByRole('button', { name: /en Atril$/ })).toBeNull()
    await user.click(within(view).getByRole('button', { name: 'Ajustes → Repos' }))
    expect(await screen.findByRole('heading', { name: 'Repos' })).toBeTruthy()

    // An error stays on the page, as main says it.
    view = await openView(user, 'Rota')
    await user.click(await within(view).findByRole('button', { name: 'Seguir en Atril' }))
    expect((await within(view).findByRole('alert')).textContent).toBe('No se pudo traer la rama: fatal: couldn\'t find remote ref feat/rota')
    expect(screen.getByRole('region', { name: 'Rota' })).toBeTruthy()
  })
})
