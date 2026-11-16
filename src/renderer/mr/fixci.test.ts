// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const FAILING = 'https://github.com/acme/web/pull/1'
const PASSING = 'https://github.com/acme/web/pull/2'
const ALONE = 'https://github.com/acme/web/pull/3'
const at = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString()
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'ana', updatedAt: at(1), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

async function openView(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(await screen.findByRole('button', { name: /^MR/ }))
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }))
  await screen.findByRole('region', { name: title })
  return screen.getByRole('complementary', { name: 'Esta MR' })
}

describe('fix ci with claude in the window (M31)', () => {
  it('the fix ci button shows only with a failing ci and an agent', async () => {
    const mine = [mr(FAILING, { title: 'Envío roto', ci: 'fail' }), mr(PASSING, { title: 'Envío verde', ci: 'pass' }), mr(ALONE, { title: 'Envío solo', ci: 'fail' })]
    const api = mockApi({ mrs: lists({ mine }), ciAgents: { [FAILING]: 'feat/envio', [PASSING]: 'feat/verde' } })
    const user = userEvent.setup()
    render(createElement(App))

    // Failing CI and an agent: the button beside the CI state; pressing it says where it went.
    let view = await openView(user, 'Envío roto')
    expect(api.mrApi.ciAgent).toHaveBeenCalledWith(FAILING)
    const fix = await within(view).findByRole('button', { name: 'Arreglar CI con Claude' })
    expect(fix.previousElementSibling?.textContent).toBe('Falla')
    expect(api.mrApi.fixCi).not.toHaveBeenCalled()
    await user.click(fix)
    expect(api.mrApi.fixCi).toHaveBeenCalledTimes(1)
    expect(api.mrApi.fixCi).toHaveBeenCalledWith(FAILING)
    expect((await within(view).findByRole('status')).textContent).toBe('Enviado a feat/envio')

    // The error, as main says it; the button stays to try again, and works from the keyboard.
    vi.mocked(api.mrApi.fixCi).mockResolvedValueOnce({ error: 'La CI de esta MR ya no falla.' })
    fix.focus()
    await user.keyboard('{Enter}')
    expect((await within(view).findByRole('alert')).textContent).toBe('La CI de esta MR ya no falla.')
    expect(within(view).queryByRole('status')).toBeNull()
    await user.click(screen.getByRole('button', { name: '‹ Tus MR' }))

    // Another CI state, even with an agent: no button.
    view = await openView(user, 'Envío verde')
    await waitFor(() => expect(api.mrApi.ciAgent).toHaveBeenCalledWith(PASSING))
    expect(within(view).queryByRole('button', { name: 'Arreglar CI con Claude' })).toBeNull()
    await user.click(screen.getByRole('button', { name: '‹ Tus MR' }))

    // Failing CI with no agent: no button.
    view = await openView(user, 'Envío solo')
    await waitFor(() => expect(api.mrApi.ciAgent).toHaveBeenCalledWith(ALONE))
    expect(within(view).getByText('Falla')).toBeTruthy()
    expect(within(view).queryByRole('button', { name: 'Arreglar CI con Claude' })).toBeNull()
  })
})
