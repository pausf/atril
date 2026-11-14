// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentState } from '../preload/api'
import { menuTemplate } from '../main/menu'
import { overviewOrder } from './agents'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const pauseItem = (selectedState?: AgentState) =>
  (
    menuTemplate({ selected: 'aaaaaaa1', selectedState, count: 3, nextEnabled: false, focusOn: false, focusAvailable: true, overviewAvailable: true, send: () => {} }).find(
      (m) => m.label === 'Trabajo'
    )?.submenu as Array<{ label?: string; accelerator?: string; enabled?: boolean }>
  ).find((i) => i.accelerator === 'CmdOrCtrl+Shift+P')

const cardOf = (branch: string): HTMLElement =>
  Array.from(document.querySelectorAll<HTMLElement>('.ov-card')).find((c) => c.querySelector('.ov-branch')?.textContent === branch)!

describe('pause', () => {
  it('a paused agent reads en pausa and offers resume', async () => {
    // Trabajo menu: «Reanudar» (⌘⇧P) while the selected one is paused, else «Pausar», enabled only while it works.
    expect(pauseItem('paused')).toMatchObject({ label: 'Reanudar', enabled: true })
    expect(pauseItem('working')).toMatchObject({ label: 'Pausar', enabled: true })
    for (const s of ['needs-you', 'stopped', undefined] as const) expect(pauseItem(s)).toMatchObject({ label: 'Pausar', enabled: false })

    // Stopped in tmux terms, so jsdom never mounts xterm; the states say otherwise.
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false), workspace('aaaaaaa2', 'PF-2', false), workspace('aaaaaaa3', 'PF-3', false)],
      states: { aaaaaaa1: 'paused', aaaaaaa2: 'working', aaaaaaa3: 'needs-you' }
    })
    const user = userEvent.setup()
    render(createElement(App))

    // The row reads «en pausa».
    const row = (await screen.findByText('PF-1')).closest('.ws-item') as HTMLElement
    await waitFor(() => expect(row.textContent).toContain('en pausa'))

    // The card reads «en pausa» and offers «Reanudar»; a working card offers «Pausar»; a waiting one neither.
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(cardOf('PF-1').textContent).toContain('en pausa'))
    expect(within(cardOf('PF-2')).getByRole('button', { name: 'Pausar' })).toBeTruthy()
    expect(within(cardOf('PF-3')).queryByRole('button', { name: /Pausar|Reanudar/ })).toBeNull()

    // Pressing them acts on that workspace and does not open it.
    await user.click(within(cardOf('PF-1')).getByRole('button', { name: 'Reanudar' }))
    expect(vi.mocked(api.statusApi.resume)).toHaveBeenCalledWith('aaaaaaa1')
    await user.click(within(cardOf('PF-2')).getByRole('button', { name: 'Pausar' }))
    expect(vi.mocked(api.statusApi.pause)).toHaveBeenCalledWith('aaaaaaa2')
    expect(screen.getByRole('region', { name: 'Todos los agentes' })).toBeTruthy()

    // An error stays on the card.
    api.statusApi.pause = vi.fn(async () => ({ error: 'Ese agente no está trabajando.' }))
    await user.click(within(cardOf('PF-2')).getByRole('button', { name: 'Pausar' }))
    await waitFor(() => expect(cardOf('PF-2').textContent).toContain('Ese agente no está trabajando.'))

    // A state change from main moves the row back to «trabajando».
    api.pushState('aaaaaaa1', 'working')
    await waitFor(() => expect(row.textContent).toContain('trabajando'))

    // W86: «Todos» reads paused as stopped, sorted with them by branch.
    const ws = [workspace('b1', 'z-paused', false), workspace('b2', 'a-stopped', false), workspace('b3', 'm-working', false)]
    const order = overviewOrder(ws, { b1: 'paused', b2: 'stopped', b3: 'working' }, {}, []).map((w) => w.branch)
    expect(order).toEqual(['m-working', 'a-stopped', 'z-paused'])
  })
})
