// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const flow: FlowStage = { stage: 'construir', change: 'add-x', checklist: { file: 'proposal.md', closed: 1, total: 2 }, others: [] }

describe('panel cost', () => {
  it('the panel shows no cost', async () => {
    mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false)],
      flow,
      costs: { aaaaaaa1: { tokens: 12_345, usd: 0.42, unpriced: [] } }
    })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await screen.findByText('Cambio:', { exact: false })

    const panel = document.querySelector('.col.right')!
    expect(panel.textContent).not.toMatch(/[$≈]|tokens/)
    expect(document.querySelector('.fcost')).toBeNull()
  })
})
