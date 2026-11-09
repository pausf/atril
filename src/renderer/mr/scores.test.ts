// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists, MrScore, MrScoreState } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({
  forge: 'github',
  url,
  title: `Título de ${url}`,
  project: 'acme/web',
  author: 'ana',
  updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
  ...o
})
const lists = (o: Partial<MrLists> = {}): MrLists => ({
  connected: ['github'],
  mine: [],
  review: [],
  following: [],
  more: { mine: [], review: [], following: [] },
  errors: [],
  ...o
})
const SCORE: MrScore = {
  head: 'c1',
  metrics: { added: 120, removed: 30, files: 6, tests: true, size: 'M' },
  ai: { difficulty: 4, risk: 2, what: 'Adds a provincial holiday calendar.', why: 'Touches the date logic.', where: ['src/calendar.ts', 'src/holidays.ts'] },
  lang: 'en',
  at: new Date().toISOString()
}
const done = (o: Partial<MrScore> = {}): MrScoreState => ({ state: 'done', score: { ...SCORE, ...o } })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const section = async (title: RegExp): Promise<HTMLElement> => (await screen.findByRole('button', { name: title })).closest('section')!

async function openMr(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /^MR/ }))
  return { mine: await section(/^Mías/), review: await section(/^Me toca revisar/), following: await section(/^Sigo/) }
}

describe('mr scores in the window', () => {
  it('only mine and to review can be scored', async () => {
    const mine = 'https://github.com/a/b/pull/1'
    const review = 'https://github.com/a/b/pull/2'
    const followed = 'https://github.com/a/b/pull/3'
    const api = mockApi({ mrs: lists({ mine: [mr(mine)], review: [mr(review)], following: [mr(followed)] }) })
    const user = userEvent.setup()
    render(createElement(App))
    const s = await openMr(user)

    expect(within(s.mine).getAllByRole('button', { name: 'Puntuar' })).toHaveLength(1)
    expect(within(s.review).getAllByRole('button', { name: 'Puntuar' })).toHaveLength(1)
    expect(within(s.following).queryByRole('button', { name: /Puntuar/ })).toBeNull()
    // Only the scorable rows are asked about.
    expect(api.mrApi.scoreOf).toHaveBeenLastCalledWith([mine, review])

    await user.click(within(s.review).getByRole('button', { name: 'Puntuar' }))
    expect(api.mrApi.score).toHaveBeenCalledWith(review)
    expect(api.mrApi.open).not.toHaveBeenCalled()
  })

  it('the score view puts the measures first', async () => {
    const u = (n: number) => `https://github.com/a/b/pull/${n}`
    const api = mockApi({
      mrs: lists({
        mine: [mr(u(1), { head: 'c1', title: 'Calendario' }), mr(u(2)), mr(u(3))],
        review: [mr(u(4)), mr(u(5), { head: 'c9', title: 'Antigua' }), mr(u(6))]
      }),
      scores: {
        [u(1)]: done({ cut: { seen: 117, total: 300 } }),
        [u(2)]: { state: 'queued' },
        [u(3)]: { state: 'running' },
        [u(4)]: { state: 'error', text: 'Claude no ha podido puntuar esta MR (tiempo agotado)' },
        [u(5)]: done(),
        [u(6)]: { state: 'none' }
      }
    })
    const user = userEvent.setup()
    render(createElement(App))
    const s = await openMr(user)

    // Each row's state.
    const line = (sec: HTMLElement, i: number) => within(sec).getAllByRole('button', { name: /^Título|Calendario|Antigua/ })[i]!.closest('.mr-line') as HTMLElement
    expect(await within(s.mine).findByRole('button', { name: /M · D4 · R2/ })).toBeTruthy()
    expect(line(s.mine, 1).textContent).toContain('En cola')
    expect(line(s.mine, 2).textContent).toContain('Puntuando…')
    expect(line(s.review, 0).textContent).toContain('Claude no ha podido puntuar esta MR (tiempo agotado)')
    expect(within(line(s.review, 2)).getByRole('button', { name: 'Puntuar' })).toBeTruthy()
    // Same head: not stale. A known, different head: stale, with Puntuar de nuevo.
    expect(line(s.mine, 0).textContent).not.toContain('De un commit anterior')
    expect(line(s.review, 1).textContent).toContain('De un commit anterior')
    expect(within(line(s.review, 1)).getByRole('button', { name: 'Puntuar de nuevo' })).toBeTruthy()

    // Main's pushes move a row along.
    act(() => api.pushScore(u(6), { state: 'running' }))
    expect(line(s.review, 2).textContent).toContain('Puntuando…')
    // A row whose head the listing did not know is never stale.
    act(() => api.pushScore(u(6), done({ head: 'c7' })))
    expect(line(s.review, 2).textContent).not.toContain('De un commit anterior')

    // The view: what Atril measured, then Claude's view, and what Claude did not see.
    await user.click(within(s.mine).getByRole('button', { name: /M · D4 · R2/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Calendario' })
    const text = dialog.textContent!
    const order = ['Lo que mide Atril', 'Tamaño M', '+120 −30', '6 archivos', 'Cambia tests', 'Lo que dice Claude', 'Dificultad 4/5', 'Riesgo 2/5', 'Adds a provincial holiday calendar.', 'Touches the date logic.', 'src/calendar.ts']
    const at = order.map((x) => text.indexOf(x))
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    expect(text).toContain('Claude vio 117 de 300 KB')
    expect(text).not.toContain('De un commit anterior')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()

    // A stale score says so in the view too.
    await user.click(within(line(s.review, 1)).getByRole('button', { name: /M · D4 · R2/ }))
    const stale = await screen.findByRole('dialog', { name: 'Antigua' })
    expect(stale.textContent).toContain('De un commit anterior')
    expect(stale.textContent).not.toContain('Claude vio')
    await user.click(within(stale).getByRole('button', { name: 'Puntuar de nuevo' }))
    expect(api.mrApi.score).toHaveBeenCalledWith(u(5))
    // Asked again, the row reads its new state.
    await vi.waitFor(() => expect(line(s.review, 1).textContent).toContain('En cola'))
  })
})
