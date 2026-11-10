// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const flow: FlowStage = { stage: 'construir', change: 'add-x', checklist: { file: 'proposal.md', closed: 1, total: 2 }, others: [] }
const line = (): string | undefined => document.querySelector('.fcost')?.textContent ?? undefined

describe('panel cost', () => {
  it("the panel shows the work's estimated cost", async () => {
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false), workspace('aaaaaaa2', 'PF-2', false)],
      flow,
      costs: { aaaaaaa1: { tokens: 12_345, usd: 0.42, unpriced: [] }, aaaaaaa2: { tokens: 0, usd: null, unpriced: [] } }
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))

    // Under «Cambio», the same line as the card, with its note.
    expect(await screen.findByText(/^≈ 0,42 \$/)).toBeTruthy()
    expect(line()).toBe('≈ 0,42 $ · 12,3 k tokens · estimado a precio de API')
    const change = screen.getByText('Cambio:', { exact: false }).closest('p')!
    expect(change.compareDocumentPosition(document.querySelector('.fcost')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // A zero total shows nothing; the first non-zero push brings it.
    await user.click(screen.getByRole('button', { name: /^PF-2/ }))
    await screen.findByRole('heading', { name: 'PF-2' })
    expect(line()).toBeUndefined()
    act(() => api.pushCost('aaaaaaa2', { tokens: 1_500_000, usd: 12, unpriced: [] }))
    expect(line()).toBe('≈ 12,00 $ · 1,5 M tokens · estimado a precio de API')
  })
})
