// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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

async function boot(flow: FlowStage, files: FileChange[] = changes) {
  mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow, changes: files })
  render(createElement(App))
  await userEvent.setup().click(await screen.findByRole('button', { name: /^PF-1/ }))
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('file changes', () => {
  it('changes show from construir on', async () => {
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

  it('a large branch warns in cambios', async () => {
    // F25 (amended by panel-c): the warning is a line at the top of the panel, from the branch total that main sends.
    const big: FileChange[] = [{ path: 'src/Big.php', status: 'A', added: 380, removed: 0 }, { path: 'src/Old.php', status: 'M', added: 70, removed: 50 }]
    await boot(building, big)
    const warn = await vi.waitFor(() => {
      const el = document.querySelector('.col.right .fbig')
      if (!el) throw new Error('no warning yet')
      return el
    })
    expect(warn.textContent).toBe('⚠ 500 líneas: rama grande (más de 400). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.')
    expect(document.querySelector('.col.right [role="tabpanel"]')!.firstElementChild).toBe(warn)
    cleanup()

    // At or under the threshold, nothing.
    await boot(building)
    await screen.findByRole('group', { name: 'Pasos de Libretto' })
    await vi.waitFor(() => expect(window.atril.flow.boxes).toHaveBeenCalled())
    expect(document.querySelector('.fbig')).toBeNull()
  })
})
