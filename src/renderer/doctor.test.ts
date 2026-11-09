// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi, ToolReport } from '../preload/api'
import { TopBar } from './components/TopBar'

const problems: ToolReport[] = [
  { tool: 'tmux', ok: false, problem: 'no responde a -V', install: 'brew install tmux' },
  { tool: 'jira', ok: false, problem: 'no responde a version', install: 'brew install ankitpokhrel/jira-cli/jira-cli' }
]

beforeEach(() => {
  window.atril = { settings: { jira: { status: vi.fn().mockResolvedValue({ saved: false }) } } } as unknown as AtrilApi
})
afterEach(cleanup)

describe('doctor chip', () => {
  it('problems show as one chip that opens the list', async () => {
    const user = userEvent.setup()
    render(createElement(TopBar, { problems }))

    const chip = await screen.findByRole('button', { name: '2 herramientas por instalar' })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('brew install tmux')).toBeNull()

    await user.click(chip)
    const list = screen.getByRole('dialog')
    expect(list.textContent).toContain('brew install tmux')
    expect(list.textContent).toContain('brew install ankitpokhrel/jira-cli/jira-cli')
    expect(screen.getByText('brew install tmux').tagName).toBe('CODE')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()

    chip.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.keyboard(' ')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('no problems means no chip', async () => {
    render(createElement(TopBar, { problems: [] }))
    await screen.findByText('Sin conectar')
    expect(screen.queryByText(/por instalar/)).toBeNull()
  })

  it('one problem is singular', async () => {
    render(createElement(TopBar, { problems: problems.slice(0, 1) }))
    expect(await screen.findByRole('button', { name: '1 herramienta por instalar' })).toBeTruthy()
  })
})
