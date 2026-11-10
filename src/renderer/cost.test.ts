// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const money = /[$≈]|tokens/

describe('cost', () => {
  it('no workspace shows a cost', async () => {
    // Main still has a priced total for every work; neither the row nor the «Todos» card says it.
    const costs = {
      aaaaaaa1: { tokens: 850, usd: 0.42, unpriced: [] },
      aaaaaaa2: { tokens: 1_234_567, usd: 3.5, unpriced: ['claude-mystery-9'] }
    }
    mockApi({ workspaces: ['PF-1', 'PF-2'].map((b, i) => workspace(`aaaaaaa${i + 1}`, b, false)), costs })
    const user = userEvent.setup()
    render(createElement(App))
    await screen.findByText('PF-2')

    for (const branch of ['PF-1', 'PF-2']) {
      const row = screen.getByRole('button', { name: new RegExp(`^${branch}`) })
      expect(row.getAttribute('title') ?? '').not.toMatch(money)
      expect(row.textContent).not.toMatch(money)
    }

    await user.click(screen.getByRole('button', { name: 'Todos' }))
    const cards = document.querySelectorAll('.ov-card')
    expect(cards).toHaveLength(2)
    for (const card of cards) expect(card.textContent).not.toMatch(money)
    expect(document.querySelector('.ov-cost')).toBeNull()
  })
})
