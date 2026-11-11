// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const mr = (url: string): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'ana', updatedAt: new Date().toISOString() })
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
afterEach(cleanup)

describe('mr screen problems', () => {
  it('a failed list shows its problem and no empty sections', async () => {
    const api = mockApi({
      mrs: lists({
        mine: [mr('https://github.com/acme/web/pull/1')],
        errors: [
          { forge: 'gitlab', error: 'GitLab está fallando ahora mismo.', detail: 'HTTP 503', fix: 'retry' },
          { forge: 'github', error: 'GitHub ha rechazado tu token.', detail: 'HTTP 401', fix: 'settings' }
        ]
      })
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^MR/ }))

    const mine = (await screen.findByRole('button', { name: /^Mías/ })).closest('section')!
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
    // Above the sections, one per failed forge.
    for (const a of alerts) expect(a.compareDocumentPosition(mine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const [gitlab, github] = alerts as [HTMLElement, HTMLElement]
    expect(gitlab.querySelector('b')?.textContent).toBe('GitLab está fallando ahora mismo.')
    expect(gitlab.textContent).toContain('No puedo enseñarte tus MRs de GitLab.')
    expect(gitlab.querySelector('details:not([open]) code')?.textContent).toBe('HTTP 503')
    expect(github.textContent).toContain('No puedo enseñarte tus MRs de GitHub.')
    expect(github.querySelector('details:not([open]) code')?.textContent).toBe('HTTP 401')

    // What did answer stays; an empty section says nothing while a forge failed.
    expect(within(mine).getByText('Título de https://github.com/acme/web/pull/1')).toBeTruthy()
    expect(screen.queryByText('Ninguna MR.')).toBeNull()

    // «Volver a comprobar» loads the lists again.
    const list = vi.mocked(api.mrApi.list)
    const before = list.mock.calls.length
    await user.click(within(gitlab).getByRole('button', { name: 'Volver a comprobar' }))
    expect(list.mock.calls.length).toBe(before + 1)

    // «Abrir Ajustes» opens Ajustes.
    await user.click(within(github).getByRole('button', { name: 'Abrir Ajustes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy()
  })

  it('without failures an empty section says so', async () => {
    mockApi({ mrs: lists({ mine: [mr('https://github.com/acme/web/pull/1')] }) })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^MR/ }))
    await screen.findByRole('button', { name: /^Mías/ })
    expect(screen.getAllByText('Ninguna MR.')).toHaveLength(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
