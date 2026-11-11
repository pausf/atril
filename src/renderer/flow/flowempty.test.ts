// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

async function boot(flow?: FlowStage) {
  const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'needs-you' }, ...(flow && { flow }) })
  // A flow that never answers: the panel is still waiting for it.
  if (!flow) api.flowApi.get = () => new Promise(() => undefined)
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
  return screen.getByRole('tabpanel')
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('libretto panel when there is nothing to list', () => {
  it('the panel says it is reading', async () => {
    const panel = await boot()
    expect(panel.textContent).toContain('Leyendo el flujo de este trabajo…')
  })

  it('before the checklist the panel says why there are no boxes', async () => {
    for (const stage of ['spec', 'plan', 'construir'] as const) {
      cleanup()
      const panel = await boot({ stage, change: 'add-cart', others: [] })
      await vi.waitFor(() => expect(panel.textContent).toContain('Aún no hay casillas: salen cuando el plan tenga su checklist.'))
      expect(panel.textContent).toContain('add-cart')
    }
    // Main answers no flow at all (a review session): the tab says so.
    cleanup()
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' } })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await vi.waitFor(() => expect(screen.getByRole('tabpanel').textContent).toContain('Este trabajo no sigue el flujo de Libretto.'))
    cleanup()
    const fresh = await boot({ stage: 'entrada', others: [] })
    await vi.waitFor(() => expect(fresh.textContent).toContain('Este trabajo aún no tiene cambio de Libretto: lo crea el primer paso.'))
  })
})
