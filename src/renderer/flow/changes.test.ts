// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileChange, FlowStage, UiState } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const changes: FileChange[] = [
  { path: 'src/Delivery/HolidayCalendar.php', status: 'A', added: 4, removed: 0 },
  { path: 'src/Delivery/PromiseDate.php', status: 'M', added: 2, removed: 1 },
  { path: 'old.php', status: 'D', added: 0, removed: 3 }
]
const building: FlowStage = { stage: 'construir', change: 'add-x', others: [], checklist: { file: 'proposal.md', closed: 1, total: 3, firstOpen: 'b' } }

async function boot(flow: FlowStage, files: FileChange[] = changes, stored?: UiState) {
  const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow, changes: files }, stored)
  render(createElement(App))
  await userEvent.setup().click(await screen.findByRole('button', { name: /^PF-1/ }))
  return api
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('file changes', () => {
  it('the panel shows no list of changes', async () => {
    // From Construir on the panel holds no «Cambios»: no section, no list of the branch's files, no «ver N archivos».
    for (const flow of [{ stage: 'plan', change: 'add-x', others: [] } as FlowStage, building, { ...building, stage: 'terminado' } as FlowStage]) {
      await boot(flow)
      await screen.findByRole('group', { name: 'Pasos de Libretto' })
      expect(screen.queryByRole('heading', { name: /Cambios/ })).toBeNull()
      expect(screen.queryByRole('button', { name: /Cambios/ })).toBeNull()
      expect(screen.queryByRole('region', { name: /Cambios/ })).toBeNull()
      expect(screen.queryByText(/ver \d+ archivos/)).toBeNull()
      expect(screen.queryByText(/HolidayCalendar/)).toBeNull()
      expect(screen.queryByText(/líneas$/)).toBeNull()
      cleanup()
    }
  })

  it('a large branch offers to split it from the warning', async () => {
    // F25 (amended by terminal-read-only): the line says the total and offers the split or leaving it.
    const big: FileChange[] = [{ path: 'src/Big.php', status: 'A', added: 380, removed: 0 }, { path: 'src/Old.php', status: 'M', added: 70, removed: 50 }]
    const warning = (): Promise<Element> =>
      vi.waitFor(() => {
        const el = document.querySelector('.col.right .fbig')
        if (!el) throw new Error('no warning yet')
        return el
      })
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const api = await boot(building, big, stored)
    const warn = await warning()
    expect(warn.querySelector('.fbig-text')?.textContent).toBe('⚠ 500 líneas: rama grande (más de 400).')
    expect(warn.textContent).not.toContain('Atril le ha pedido a Claude')
    expect(document.querySelector('.col.right [role="tabpanel"]')!.firstElementChild).toBe(warn)

    // «Separar en MRs encadenadas» tells the agent through the composer's path.
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Separar en MRs encadenadas' }))
    expect(api.statusApi.compose).toHaveBeenLastCalledWith('aaaaaaa1', 'Separa esta rama en MRs encadenadas.')
    // A failed send says what happened and offers to try again.
    vi.mocked(api.statusApi.compose).mockResolvedValueOnce({ error: 'No se pudo enviar: ese trabajo ya no está' })
    await user.click(screen.getByRole('button', { name: 'Separar en MRs encadenadas' }))
    const alert = await vi.waitFor(() => within(warn as HTMLElement).getByRole('alert'))
    expect(alert.textContent).toContain('La rama sigue entera.')
    await user.click(within(alert).getByRole('button', { name: 'Volver a intentar' }))
    expect(api.statusApi.compose).toHaveBeenCalledTimes(3)
    await vi.waitFor(() => expect(within(warn as HTMLElement).queryByRole('alert')).toBeNull())

    // «Dejarla así» remembers the threshold for that work and hides the line.
    await user.click(screen.getByRole('button', { name: 'Dejarla así' }))
    expect(api.ui.set).toHaveBeenLastCalledWith({ bigDismissed: { aaaaaaa1: 1 } })
    await vi.waitFor(() => expect(document.querySelector('.fbig')).toBeNull())
    cleanup()

    // After a restart it stays hidden at that threshold…
    await boot(building, big, stored)
    await screen.findByRole('group', { name: 'Pasos de Libretto' })
    await vi.waitFor(() => expect(window.atril.flow.boxes).toHaveBeenCalled())
    expect(document.querySelector('.fbig')).toBeNull()
    cleanup()
    // …and comes back past the next one.
    await boot(building, [...big, { path: 'src/More.php', status: 'A', added: 400, removed: 0 }], stored)
    expect((await warning()).querySelector('.fbig-text')?.textContent).toBe('⚠ 900 líneas: rama grande (más de 400).')
    cleanup()

    // At or under the threshold, nothing.
    await boot(building)
    await screen.findByRole('group', { name: 'Pasos de Libretto' })
    await vi.waitFor(() => expect(window.atril.flow.boxes).toHaveBeenCalled())
    expect(document.querySelector('.fbig')).toBeNull()
  })
})
