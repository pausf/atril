// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const row = (branch: string): HTMLElement => screen.getByRole('button', { name: `Quitar ${branch}` }).closest('.ws-item') as HTMLElement

describe('closing a work', () => {
  it('a refused close shows its fix and can be dismissed', async () => {
    const user = userEvent.setup()
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false), workspace('aaaaaaa2', 'PF-2', false)],
      remove: {
        aaaaaaa1: { error: 'La carpeta de PF-1 ya no existe.', fix: 'forget' },
        aaaaaaa2: { error: 'PF-2 tiene 1 cambio sin commitear: no lo cierro para no perderlos.', detail: '?? wip.txt', fix: 'terminal' }
      }
    })
    render(createElement(App))
    await screen.findByText('PF-2')

    // A stopped work closes on the first click; git's output stays folded.
    await user.click(screen.getByRole('button', { name: 'Quitar PF-2' }))
    const dirty = await within(row('PF-2')).findByRole('alert')
    expect(dirty.querySelector('b')!.textContent).toBe('PF-2 tiene 1 cambio sin commitear: no lo cierro para no perderlos.')
    expect(dirty.textContent).toContain('PF-2 sigue en la lista.')
    const folded = dirty.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('code')!.textContent).toBe('?? wip.txt')
    expect(dirty.textContent!.replace(folded.textContent!, '')).not.toContain('wip.txt')
    await user.click(within(dirty).getByRole('button', { name: 'Abrir en Terminal' }))
    expect(api.ws.terminal).toHaveBeenCalledWith({ id: 'aaaaaaa2' })
    await user.click(within(dirty).getByRole('button', { name: 'Cerrar aviso' }))
    expect(within(row('PF-2')).queryByRole('alert')).toBeNull()

    // A folder that is gone is forgotten on request, and the row goes.
    await user.click(screen.getByRole('button', { name: 'Quitar PF-1' }))
    const missing = await within(row('PF-1')).findByRole('alert')
    expect(missing.querySelector('b')!.textContent).toBe('La carpeta de PF-1 ya no existe.')
    expect(missing.textContent).toContain('PF-1 sigue en la lista.')
    expect(within(missing).queryByRole('button', { name: 'Abrir en Terminal' })).toBeNull()
    await user.click(within(missing).getByRole('button', { name: 'Quitar de la lista igualmente' }))
    expect(api.ws.forget).toHaveBeenCalledWith('aaaaaaa1')
    expect(api.ws.terminal).toHaveBeenCalledTimes(1)
    await screen.findByRole('button', { name: 'Quitar PF-2' })
    expect(screen.queryByRole('button', { name: 'Quitar PF-1' })).toBeNull()
  })

  it('closing a live agent asks first', async () => {
    const user = userEvent.setup()
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', true)] })
    render(createElement(App))
    await screen.findByText('PF-1')
    const question = '¿Cerrar PF-1? Su agente se para y el trabajo pasa a Terminados.'

    await user.click(screen.getByRole('button', { name: 'Quitar PF-1' }))
    expect(within(row('PF-1')).getByText(question)).toBeTruthy()
    expect(api.ws.remove).not.toHaveBeenCalled()
    await user.click(within(row('PF-1')).getByRole('button', { name: 'Cancelar' }))
    expect(within(row('PF-1')).queryByText(question)).toBeNull()
    expect(api.ws.remove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Quitar PF-1' }))
    await user.click(within(row('PF-1')).getByRole('button', { name: 'Cerrar' }))
    expect(api.ws.remove).toHaveBeenCalledWith('aaaaaaa1')
    expect(api.ws.remove).toHaveBeenCalledTimes(1)
  })
})
