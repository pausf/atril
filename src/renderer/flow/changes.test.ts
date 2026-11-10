// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileChange, FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const changes: FileChange[] = [
  { path: 'src/Delivery/HolidayCalendar.php', status: 'A', added: 4, removed: 0 },
  { path: 'src/Delivery/PromiseDate.php', status: 'M', added: 2, removed: 1 },
  { path: 'old.php', status: 'D', added: 0, removed: 3 }
]
const building: FlowStage = { stage: 'construir', change: 'add-x', others: [], checklist: { file: 'proposal.md', closed: 1, total: 3, firstOpen: 'b' } }
const DIFF = 'diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1,2 +1,2 @@\n uno\n-dos\n+DOS <script>alert(1)</script>\n'

async function boot(flow: FlowStage, extra: { diff?: string } = {}) {
  const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow, changes, ...extra })
  const user = vi.isFakeTimers() ? userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) }) : userEvent.setup()
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
  return { api, user }
}

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('file changes', () => {
  it('changes show from construir on', async () => {
    await boot({ stage: 'plan', change: 'add-x', others: [] })
    await screen.findByRole('button', { name: /^Plan/ })
    expect(screen.queryByRole('button', { name: /^Construir/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /Cambios/ })).toBeNull()
    cleanup()

    await boot(building)
    expect(await screen.findByRole('button', { name: /^Construir.*ver 3 archivos/ })).toBeTruthy()
    const section = screen.getByRole('region', { name: /Cambios/ })
    expect(within(section).getByText('10 líneas')).toBeTruthy()
    const rows = within(section).getAllByRole('button')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/^A.*HolidayCalendar\.php.*\+4.*−0/),
      expect.stringMatching(/^M.*PromiseDate\.php.*\+2.*−1/),
      expect.stringMatching(/^D.*old\.php.*\+0.*−3/)
    ])
  })

  it('a file opens its diff', async () => {
    const { api, user } = await boot(building, { diff: DIFF })
    const section = await screen.findByRole('region', { name: /Cambios/ })
    await user.click(within(section).getByRole('button', { name: /PromiseDate\.php/ }))
    const dialog = await screen.findByRole('dialog', { name: /Cambios/ })
    expect(api.flowApi.diff).toHaveBeenLastCalledWith('aaaaaaa1', 'src/Delivery/PromiseDate.php')
    await vi.waitFor(() => expect(dialog.querySelector('.dadd')?.textContent).toBe('+DOS <script>alert(1)</script>'))
    expect(dialog.querySelector('.ddel')?.textContent).toBe('-dos')
    expect(dialog.querySelector('script')).toBeNull()
    expect(dialog.contains(document.activeElement)).toBe(true)

    // Another file from the list on the left; Actualizar asks again.
    await user.click(within(dialog).getByRole('button', { name: /old\.php/ }))
    expect(api.flowApi.diff).toHaveBeenLastCalledWith('aaaaaaa1', 'old.php')
    const calls = vi.mocked(api.flowApi.diff).mock.calls.length
    await user.click(within(dialog).getByRole('button', { name: 'Actualizar' }))
    expect(vi.mocked(api.flowApi.diff).mock.calls.length).toBe(calls + 1)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()

    // Construir opens the first file.
    await user.click(screen.getByRole('button', { name: /^Construir/ }))
    await screen.findByRole('dialog', { name: /Cambios/ })
    expect(api.flowApi.diff).toHaveBeenLastCalledWith('aaaaaaa1', 'src/Delivery/HolidayCalendar.php')
  })

  it('the list refreshes while claude works', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { api } = await boot(building)
    await screen.findByRole('region', { name: /Cambios/ })
    const changesMock = vi.mocked(api.flowApi.changes)
    const before = changesMock.mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(changesMock.mock.calls.length).toBe(before + 1)

    // A request that does not answer holds the next ticks back.
    changesMock.mockReturnValue(new Promise(() => undefined))
    await act(() => vi.advanceTimersByTimeAsync(3000))
    const stuck = changesMock.mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(9000))
    expect(changesMock.mock.calls.length).toBe(stuck)
  })

  it('a large branch warns in cambios', async () => {
    const big: FileChange[] = [{ path: 'src/Big.php', status: 'A', added: 380, removed: 0 }, { path: 'src/Old.php', status: 'M', added: 70, removed: 50 }]
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow: building, changes: big })
    render(createElement(App))
    await userEvent.setup().click(await screen.findByRole('button', { name: /^PF-1/ }))
    const section = await screen.findByRole('region', { name: /Cambios/ })
    const warn = await vi.waitFor(() => {
      const el = section.querySelector('.fbig')
      if (!el) throw new Error('no warning yet')
      return el
    })
    expect(warn.textContent).toBe('⚠ 500 líneas: rama grande (más de 400). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.')
    expect(within(section).queryByText('500 líneas')).toBeNull()
  })

  it('cambios shows eight and opens the rest', async () => {
    const many: FileChange[] = Array.from({ length: 12 }, (_, i) => ({ path: `src/F${i + 1}.php`, status: 'M' as const, added: i + 1, removed: 1 }))
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow: building, changes: many })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    const section = await screen.findByRole('region', { name: /Cambios/ })
    await within(section).findByText('+4 más')

    // The first eight in list order, then «+4 más»; the total still counts all twelve (78 + 12).
    const rows = within(section).getAllByRole('button')
    expect(rows.map((r) => r.textContent)).toEqual([...many.slice(0, 8).map((f) => expect.stringContaining(f.path.slice(4))), '+4 más'])
    expect(within(section).getByText('90 líneas')).toBeTruthy()

    // «+4 más» opens the diff modal on the ninth file, with all twelve in its list.
    await user.click(within(section).getByRole('button', { name: '+4 más' }))
    const dialog = await screen.findByRole('dialog', { name: /Cambios/ })
    expect(api.flowApi.diff).toHaveBeenLastCalledWith('aaaaaaa1', 'src/F9.php')
    expect(within(dialog).getByRole('button', { name: /F12\.php/ })).toBeTruthy()
  })
})
