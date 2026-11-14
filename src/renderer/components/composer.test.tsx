// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuickAnswer } from '../../preload/api'
import { Composer } from './Composer'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    open(): void {}
    loadAddon(): void {}
    write(): void {}
    dispose(): void {}
  }
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit(): void {} } }))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

let compose: ReturnType<typeof vi.fn<(id: string, text: string) => Promise<QuickAnswer>>>
beforeEach(() => {
  compose = vi.fn(async () => ({ ok: true as const }))
  window.atril = { status: { compose } } as unknown as typeof window.atril
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const box = (): HTMLTextAreaElement => screen.getByRole('textbox', { name: 'Escribe al agente' })

describe('composer', () => {
  it('the composer sends to the agent', async () => {
    const user = userEvent.setup()
    render(createElement(Composer, { workspaceId: 'w1', stopped: false }))
    // Empty or blank: nothing to send.
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true)
    await user.type(box(), '   ')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    expect(compose).not.toHaveBeenCalled()

    // «Enviar» sends the trimmed text, line breaks kept, and clears the box.
    await user.clear(box())
    await user.type(box(), '  primera línea{Shift>}{Enter}{/Shift}segunda  ')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(compose).toHaveBeenLastCalledWith('w1', 'primera línea\nsegunda')
    await waitFor(() => expect(box().value).toBe(''))

    // ⌘↩ with the composer focused sends too.
    await user.type(box(), 'sigue con la casilla 3')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    expect(compose).toHaveBeenLastCalledWith('w1', 'sigue con la casilla 3')
    await waitFor(() => expect(box().value).toBe(''))

    // A failure keeps the text and says what happened, with a way to retry.
    compose.mockResolvedValueOnce({ error: 'No se pudo enviar: ese trabajo ya no está' })
    await user.type(box(), 'otra cosa')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    const alert = await screen.findByRole('alert')
    expect(alert.querySelector('b')?.textContent).toBe('No se pudo enviar: ese trabajo ya no está')
    expect(box().value).toBe('otra cosa')
    await user.click(screen.getByRole('button', { name: 'Volver a intentar' }))
    expect(compose).toHaveBeenLastCalledWith('w1', 'otra cosa')
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    cleanup()

    // A stopped workspace sends nothing.
    compose.mockClear()
    render(createElement(Composer, { workspaceId: 'w2', stopped: true }))
    expect(box().disabled).toBe(true)
    box().form!.requestSubmit()
    expect(compose).not.toHaveBeenCalled()
    cleanup()

    // In the app, ⌘↩ (the menu's «Siguiente») sends the composer only while it has the focus.
    mockSystemTheme(false)
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2')], states: { aaaaaaa1: 'working', aaaaaaa2: 'needs-you' } })
    render(createElement(App))
    await user.click((await screen.findByText('PF-1')).closest('button')!)
    await user.type(await screen.findByRole('textbox', { name: 'Escribe al agente' }), 'hola')
    act(() => api.menu({ kind: 'next' }))
    await waitFor(() => expect(api.statusApi.compose).toHaveBeenLastCalledWith('aaaaaaa1', 'hola'))
    vi.mocked(api.statusApi.compose).mockClear()
    await user.type(box(), 'otra')
    box().blur()
    act(() => api.menu({ kind: 'next' }))
    expect(api.statusApi.compose).not.toHaveBeenCalled()
    expect(box().value).toBe('otra')
  })
})
