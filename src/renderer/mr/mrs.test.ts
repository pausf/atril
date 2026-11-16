// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const HOUR = 3_600_000
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({
  forge: 'github',
  url,
  title: `Título de ${url}`,
  project: 'acme/web',
  author: 'ana',
  updatedAt: new Date(Date.now() - HOUR).toISOString(),
  ...o
})
const lists = (o: Partial<MrLists> = {}): MrLists => ({
  connected: ['github', 'gitlab'],
  mine: [],
  review: [],
  following: [],
  more: { mine: [], review: [], following: [] },
  errors: [],
  ...o
})

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const section = async (title: RegExp): Promise<HTMLElement> => (await screen.findByRole('button', { name: title })).closest('section')!

describe('mr screen', () => {
  it('the mr screen shows three lists with their rows', async () => {
    const api = mockApi({
      mrs: lists({
        mine: [mr('https://github.com/acme/web/pull/1', { title: 'Arreglar el envío', author: 'pau', ci: 'fail', added: 12, removed: 3, files: 4, updatedAt: new Date(Date.now() - 3 * HOUR - 60_000).toISOString() })],
        review: [mr('https://git.example.com/grp/shop/-/merge_requests/7', { forge: 'gitlab', title: 'Nuevo filtro', project: 'grp/shop', author: 'eva', ci: 'pass', files: 7, updatedAt: new Date(Date.now() - 50 * HOUR).toISOString() })],
        following: [
          mr('https://github.com/acme/api/pull/2', { title: 'En marcha', ci: 'running', added: 1, removed: 0, files: 1 }),
          mr('https://github.com/acme/api/pull/3', { title: 'Sin pipeline', ci: 'none', added: 2, removed: 2, files: 2 }),
          mr('https://github.com/acme/api/pull/4', { title: 'Sin detalles' })
        ],
        more: { mine: ['github'], review: [], following: [] },
        errors: [{ forge: 'gitlab', error: 'GitLab está fallando ahora mismo.', detail: 'HTTP 500', fix: 'retry' }]
      })
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^MR/ }))

    const mine = await section(/^Mías/)
    const review = await section(/^Me toca revisar/)
    const following = await section(/^Sigo/)
    // Mías and Me toca revisar also hold Puntuar (M12): the rows are the other buttons.
    const rows = (sec: HTMLElement) => within(sec).getAllByRole('button').slice(1).filter((b) => b.textContent !== 'Puntuar')
    expect(rows(mine).map((b) => b.textContent)).toEqual([
      expect.stringMatching(/Arreglar el envío.*acme\/web.*pau.*Falla.*\+12 −3 · 4 archivos.*hace 3 h/)
    ])
    expect(within(mine).getByText('Hay más: ábrelas en GitHub')).toBeTruthy()
    expect(rows(review).map((b) => b.textContent)).toEqual([
      expect.stringMatching(/Nuevo filtro.*grp\/shop.*eva.*Pasa.*7 archivos.*hace 2 d/)
    ])
    expect(within(review).getAllByRole('button')[1]!.textContent).not.toMatch(/[+−]/)
    expect(within(following).getAllByRole('button').slice(1).map((b) => b.textContent)).toEqual([
      expect.stringMatching(/En marcha.*En curso/),
      expect.stringMatching(/Sin pipeline.*Sin CI/),
      expect.stringMatching(/Sin detalles.*—.*—/)
    ])
    expect(screen.getByRole('alert').querySelector('b')?.textContent).toBe('GitLab está fallando ahora mismo.')

    // M5 (amended): the row opens its MR page; «Abrir en GitLab ↗» opens the browser.
    await user.click(within(review).getAllByRole('button')[1]!)
    const view = await screen.findByRole('region', { name: 'Nuevo filtro' })
    expect(api.mrApi.open).not.toHaveBeenCalled()
    await user.click(within(view).getByRole('button', { name: 'Abrir en GitLab ↗' }))
    expect(api.mrApi.open).toHaveBeenCalledWith('https://git.example.com/grp/shop/-/merge_requests/7')
  })

  it('no forge connected points to ajustes', async () => {
    mockApi()
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^MR/ }))
    expect(await screen.findByText('Conecta GitHub o GitLab en Ajustes')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Mías/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Abrir Ajustes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy()
  })

  it('the lists refresh and the rail counts reviews', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const api = mockApi({ mrs: lists({ review: [mr('https://github.com/a/b/pull/1'), mr('https://github.com/a/b/pull/2')], mine: [mr('https://github.com/a/b/pull/3')] }) })
    const list = vi.mocked(api.mrApi.list)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(createElement(App))

    // At start, before the screen was ever opened: the rail already counts «Me toca revisar».
    const entry = await screen.findByRole('button', { name: 'MR: 2 por revisar' })
    expect(entry.textContent).toBe('MR2')
    expect(list).toHaveBeenCalledTimes(1)

    await user.click(entry)
    await section(/^Mías/)
    expect(list).toHaveBeenCalledTimes(2)

    await act(() => vi.advanceTimersByTimeAsync(5 * 60_000))
    expect(list).toHaveBeenCalledTimes(3)

    list.mockResolvedValue(lists({ mine: [mr('https://github.com/a/b/pull/3')] }))
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(list).toHaveBeenCalledTimes(4)
    // Zero to review: the entry shows no number.
    const plain = await screen.findByRole('button', { name: 'MR' })
    expect(plain.textContent).toBe('MR')
  })
})
