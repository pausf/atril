// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceResult } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

// jsdom cannot run xterm: a stand-in shows whether the terminal attached, and to which pane.
vi.mock('./components/Terminal', () => ({ Terminal: ({ id }: { id: string }) => createElement('div', { 'data-testid': 'term' }, id) }))

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const center = (): HTMLElement => document.querySelector('main.center') as HTMLElement
const pick = async (user: ReturnType<typeof userEvent.setup>, branch: string): Promise<void> => {
  await waitFor(() => expect([...document.querySelectorAll('.ws-branch')].some((b) => b.textContent === branch)).toBe(true))
  await user.click([...document.querySelectorAll('.ws-branch')].find((b) => b.textContent === branch)!.closest('button')!)
}
const TIP = 'Escribe en la terminal como siempre: será tu Claude Code.'

describe('reopening a stopped work', () => {
  it('a stopped work offers to reopen', async () => {
    const user = userEvent.setup()
    const api = mockApi({
      workspaces: [
        workspace('aaaaaaa1', 'PF-1', false),
        { ...workspace('aaaaaaa2', 'PF-2', false), effort: 'xhigh' },
        workspace('aaaaaaa3', 'PF-3', true),
        workspace('aaaaaaa4', 'PF-4', false),
        workspace('aaaaaaa5', 'PF-5', false),
        workspace('aaaaaaa6', 'PF-6', true)
      ],
      states: { aaaaaaa3: 'stopped', aaaaaaa6: 'working' },
      reopen: {
        aaaaaaa4: { error: 'La carpeta de PF-4 ya no existe.', fix: 'forget' },
        aaaaaaa5: { error: 'tmux no ha podido arrancar el agente.', detail: 'tmux new-session falló: no server', fix: 'terminal' }
      }
    })
    render(createElement(App))

    // Dead session: why it stopped, what that means, both buttons; no terminal and no tip.
    await pick(user, 'PF-1')
    const c = center()
    expect(c.textContent).toContain('PF-1 está parado: su sesión de tmux ya no existe (un reinicio o tmux cerrado).')
    expect(c.textContent).toContain('Su agente no sigue hasta que lo vuelvas a abrir.')
    expect(c.textContent).not.toContain(TIP)
    expect(within(c).queryByTestId('term')).toBeNull()
    const reopen = within(c).getByRole('button', { name: 'Volver a abrir' })
    const more = within(c).getByRole('button', { name: 'Seguir con más esfuerzo' })

    // A reopen in flight disables both: a second click sends nothing.
    let finish: (r: WorkspaceResult) => void = () => undefined
    const mocked = vi.mocked(api.ws.reopen)
    const reopened = mocked.getMockImplementation()!
    mocked.mockImplementationOnce((id: string, m: boolean) => new Promise((ok) => (finish = (r) => ok(r))).then(() => reopened(id, m)))
    await user.click(reopen)
    expect(api.ws.reopen).toHaveBeenCalledWith('aaaaaaa1', false)
    expect((reopen as HTMLButtonElement).disabled).toBe(true)
    expect((more as HTMLButtonElement).disabled).toBe(true)
    await user.click(reopen)
    await user.click(more)
    expect(api.ws.reopen).toHaveBeenCalledTimes(1)
    finish({ workspace: workspace('aaaaaaa1', 'PF-1') })

    // Back: the list says alive, the terminal attaches, the tip returns.
    expect((await within(center()).findByTestId('term')).textContent).toBe('aaaaaaa1')
    expect(center().textContent).not.toContain('está parado')
    expect(center().textContent).toContain(TIP)

    // «Seguir con más esfuerzo» asks main for one level up; at the top it is not offered.
    await pick(user, 'PF-2')
    expect(within(center()).getByRole('button', { name: 'Volver a abrir' })).toBeTruthy()
    expect(within(center()).queryByRole('button', { name: 'Seguir con más esfuerzo' })).toBeNull()
    await pick(user, 'PF-5')
    // The refusal from PF-5 comes later; first the effort button on a work below xhigh.
    await user.click(within(center()).getByRole('button', { name: 'Seguir con más esfuerzo' }))
    expect(api.ws.reopen).toHaveBeenLastCalledWith('aaaaaaa5', true)
    const tmux = await within(center()).findByRole('alert')
    expect(tmux.querySelector('b')!.textContent).toBe('tmux no ha podido arrancar el agente.')
    expect(tmux.querySelector('details')!.open).toBe(false)
    expect(tmux.querySelector('code')!.textContent).toBe('tmux new-session falló: no server')
    await user.click(within(tmux).getByRole('button', { name: 'Abrir en Terminal' }))
    expect(api.ws.terminal).toHaveBeenCalledWith({ id: 'aaaaaaa5' })
    expect(within(center()).getByRole('button', { name: 'Volver a abrir' }).hasAttribute('disabled')).toBe(false)

    // Dead pane in a live session: the bar sits above the terminal.
    await pick(user, 'PF-3')
    await waitFor(() => expect(center().textContent).toContain('PF-3 está parado'))
    const bar = center().querySelector('.ws-stopped') as HTMLElement
    expect(within(bar).getByRole('button', { name: 'Volver a abrir' })).toBeTruthy()
    expect(within(center()).getByTestId('term')).toBeTruthy()
    expect(bar.compareDocumentPosition(within(center()).getByTestId('term')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(center().textContent).not.toContain(TIP)

    // A folder that is gone: the way past is forgetting it.
    await pick(user, 'PF-4')
    await user.click(within(center()).getByRole('button', { name: 'Volver a abrir' }))
    const gone = await within(center()).findByRole('alert')
    expect(gone.querySelector('b')!.textContent).toBe('La carpeta de PF-4 ya no existe.')
    expect(within(gone).queryByRole('button', { name: 'Abrir en Terminal' })).toBeNull()
    await user.click(within(gone).getByRole('button', { name: 'Quitar de la lista igualmente' }))
    expect(api.ws.forget).toHaveBeenCalledWith('aaaaaaa4')
    await waitFor(() => expect([...document.querySelectorAll('.ws-branch')].some((b) => b.textContent === 'PF-4')).toBe(false))

    // A working agent shows none of it.
    await pick(user, 'PF-6')
    await waitFor(() => expect(within(center()).queryByRole('button', { name: 'Volver a abrir' })).toBeNull())
    expect(center().textContent).toContain(TIP)
  })
})
