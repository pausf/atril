// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { MrItem, MrLists, MrMergeResult } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const GH = 'https://github.com/acme/web/pull/1'
const REV = 'https://github.com/acme/web/pull/2'
const PLAIN = 'https://github.com/acme/web/pull/3'
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'pau', updatedAt: new Date().toISOString(), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })
const MINE = mr(GH, { title: 'Envío con IVA', branch: 'feat/envio', target: 'main', mergeable: true })

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

async function openPage(user: ReturnType<typeof userEvent.setup>, title: string) {
  if (!screen.queryByRole('heading', { level: 1, name: /^MR/ })) await user.click(await screen.findByRole('button', { name: /^MR/ }))
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }))
  return screen.findByRole('region', { name: title })
}

describe('fusionar in the window', () => {
  it('fusionar asks first and merges once', async () => {
    let answer!: (r: MrMergeResult) => void
    const api = mockApi({
      mrs: lists({ mine: [MINE, mr(PLAIN, { title: 'Sin fusionar' })], review: [mr(REV, { title: 'Ajena', author: 'ana', mergeable: true })] }),
      merges: { [GH]: () => new Promise<MrMergeResult>((r) => (answer = r)) }
    })
    const user = userEvent.setup()
    render(createElement(App))

    // M42: only on an MR of Mías that the forge lets merge, in the header.
    let view = await openPage(user, 'Ajena')
    await within(view).findByRole('button', { name: 'Abrir en GitHub ↗' })
    expect(within(view).queryByRole('button', { name: 'Fusionar' })).toBeNull()
    view = await openPage(user, 'Sin fusionar')
    await within(view).findByRole('button', { name: 'Abrir en GitHub ↗' })
    expect(within(view).queryByRole('button', { name: 'Fusionar' })).toBeNull()
    view = await openPage(user, 'Envío con IVA')
    const merge = await within(view).findByRole('button', { name: 'Fusionar' })
    expect(merge.closest('.mr-page-head')).toBeTruthy()

    // It asks in the app, focus on «Cancelar»; Escape cancels the confirmation alone (M43's layers), and so does «Cancelar».
    await user.click(merge)
    let ask = await screen.findByRole('dialog', { name: '¿Fusionar «Envío con IVA» en main?' })
    expect(document.activeElement).toBe(within(ask).getByRole('button', { name: 'Cancelar' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('region', { name: 'Envío con IVA' })).toBeTruthy()
    await user.click(merge)
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.mrApi.merge).not.toHaveBeenCalled()

    // «Fusionar» there merges once, confirmed, disabled while on its way.
    await user.click(merge)
    ask = await screen.findByRole('dialog')
    const yes = within(ask).getByRole('button', { name: 'Fusionar' }) as HTMLButtonElement
    await user.dblClick(yes)
    expect(api.mrApi.merge).toHaveBeenCalledTimes(1)
    expect(api.mrApi.merge).toHaveBeenCalledWith(GH, true)
    expect(yes.disabled).toBe(true)
    // Merged: back to the inbox with its word; the MR leaves Mías on the new listing.
    const list = api.mrApi.list as unknown as Mock<() => Promise<MrLists>>
    list.mockResolvedValue(lists({ mine: [mr(PLAIN, { title: 'Sin fusionar' })] }))
    answer({ merged: true })
    expect((await screen.findByText('Fusionada: Envío con IVA')).getAttribute('role')).toBe('status')
    expect(screen.queryByRole('region', { name: 'Envío con IVA' })).toBeNull()
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Envío con IVA/ })).toBeNull())

    // Merged but the new listing failed: «Fusionada» and the list's own problem with its button.
    list.mockResolvedValue(lists({ mine: [MINE] }))
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    vi.mocked(api.mrApi.merge).mockResolvedValueOnce({ merged: true, list: { error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 502', fix: 'retry' } })
    await user.click(await within(await openPage(user, 'Envío con IVA')).findByRole('button', { name: 'Fusionar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Fusionar' }))
    expect((await screen.findByText('Fusionada: Envío con IVA'))).toBeTruthy()
    const listProblem = (await screen.findByText('GitHub está fallando ahora mismo.')).closest('[role="alert"]') as HTMLElement
    const before = list.mock.calls.length
    await user.click(within(listProblem).getByRole('button', { name: 'Volver a comprobar' }))
    await waitFor(() => expect(list.mock.calls.length).toBe(before + 1))

    // A refusal (M41) shows on the page with «Volver a comprobar», which lists again.
    vi.mocked(api.mrApi.merge).mockResolvedValueOnce({ error: 'Esta MR no se puede fusionar desde Atril ahora: actualiza', fix: 'retry' })
    view = await openPage(user, 'Envío con IVA')
    await user.click(await within(view).findByRole('button', { name: 'Fusionar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Fusionar' }))
    let problem = await within(view).findByRole('alert')
    expect(problem.textContent).toContain('Esta MR no se puede fusionar desde Atril ahora: actualiza')
    const again = list.mock.calls.length
    await user.click(within(problem).getByRole('button', { name: 'Volver a comprobar' }))
    await waitFor(() => expect(list.mock.calls.length).toBe(again + 1))

    // A forge that says no (M50): «Abrir en GitHub ↗» opens the MR.
    vi.mocked(api.mrApi.merge).mockResolvedValueOnce({ error: 'GitHub no ha dejado fusionar esta MR.', fix: 'forge' })
    await user.click(within(view).getByRole('button', { name: 'Fusionar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Fusionar' }))
    problem = await within(view).findByText('GitHub no ha dejado fusionar esta MR.').then((b) => b.closest('[role="alert"]') as HTMLElement)
    await user.click(within(problem).getByRole('button', { name: 'Abrir en GitHub ↗' }))
    expect(api.mrApi.open).toHaveBeenCalledWith(GH)
    expect(api.mrApi.merge).toHaveBeenCalledTimes(4)
  })
})
