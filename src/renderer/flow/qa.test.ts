// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

beforeEach(() => {
  mockSystemTheme(false)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('qa section', () => {
  it('the panel shows no qa section', async () => {
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false)],
      flow: { stage: 'construir', change: 'add-x', others: [] },
      qa: { aaaaaaa1: { target: null, live: false, shots: [] } }
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await screen.findByText('add-x')

    // A classified workspace gets no QA section, no button and no screenshots in the panel, and the panel never asks main for them.
    const panel = document.querySelector<HTMLElement>('aside.right')!
    await act(() => vi.advanceTimersByTimeAsync(3500))
    expect(panel.textContent).not.toMatch(/QA|Probar en vivo/)
    expect(panel.querySelector('.qa-shots, [data-tour="flow-qa"]')).toBeNull()
    expect(api.qaApi.status).not.toHaveBeenCalled()

    // QA lives in its own screen, one press away in the rail.
    await user.click(screen.getByRole('button', { name: 'QA' }))
    await waitFor(() => expect(api.qaApi.status).toHaveBeenCalledWith('aaaaaaa1'))
    expect(await screen.findByRole('heading', { name: 'QA' })).toBeTruthy()
  })
})
