// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { WorkCost } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const card = (branch: string): HTMLElement =>
  Array.from(document.querySelectorAll<HTMLElement>('.ov-card')).find((c) => c.querySelector('.ov-branch')?.textContent === branch)!
const cost = (branch: string): string | undefined => card(branch).querySelector('.ov-cost')?.textContent ?? undefined
const row = (branch: string): HTMLElement => screen.getByRole('button', { name: new RegExp(`^${branch}`) })
const NOTE = 'estimado a precio de API'

describe('cost', () => {
  it('each workspace shows its estimated cost', async () => {
    const costs: Record<string, WorkCost | null> = {
      aaaaaaa1: { tokens: 850, usd: 0.42, unpriced: [] },
      aaaaaaa2: { tokens: 12_345, usd: 0.004, unpriced: [] },
      aaaaaaa3: { tokens: 1_234_567, usd: 3.5, unpriced: ['claude-mystery-9'] },
      aaaaaaa4: { tokens: 0, usd: null, unpriced: [] },
      aaaaaaa5: null
    }
    const branches = ['PF-1', 'PF-2', 'PF-3', 'PF-4', 'PF-5']
    const api = mockApi({ workspaces: branches.map((b, i) => workspace(`aaaaaaa${i + 1}`, b, false)), costs })
    const user = userEvent.setup()
    render(createElement(App))
    await screen.findByText('PF-5')

    // The row says it in its title, with the note; a cost under a cent and thousands of tokens.
    await waitFor(() => expect(row('PF-1').getAttribute('title')).toBe(`≈ 0,42 $ · 850 tokens · ${NOTE}`))
    expect(row('PF-2').getAttribute('title')).toBe(`≈ < 0,01 $ · 12,3 k tokens · ${NOTE}`)
    // Millions, and the model without a price named.
    expect(row('PF-3').getAttribute('title')).toBe(`≈ 3,50 $ · 1,2 M tokens (sin precio para claude-mystery-9) · ${NOTE}`)
    // Nothing at 0 tokens or without a transcript.
    expect(row('PF-4').getAttribute('title')).toBeNull()
    expect(row('PF-5').getAttribute('title')).toBeNull()

    // The card in «Todos» shows the same line with the note.
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(cost('PF-1')).toBe(`≈ 0,42 $ · 850 tokens · ${NOTE}`))
    expect(cost('PF-3')).toBe(`≈ 3,50 $ · 1,2 M tokens (sin precio para claude-mystery-9) · ${NOTE}`)
    expect(cost('PF-4')).toBeUndefined()
    expect(cost('PF-5')).toBeUndefined()

    // It follows main's pushes: a first total appears, a later one replaces it.
    act(() => api.pushCost('aaaaaaa5', { tokens: 2000, usd: 0.1, unpriced: [] }))
    expect(cost('PF-5')).toBe(`≈ 0,10 $ · 2 k tokens · ${NOTE}`)
    act(() => api.pushCost('aaaaaaa1', { tokens: 900, usd: 0.5, unpriced: [] }))
    expect(cost('PF-1')).toBe(`≈ 0,50 $ · 900 tokens · ${NOTE}`)
  })
})
