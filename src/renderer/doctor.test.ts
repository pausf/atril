// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtrilApi, ToolReport } from '../preload/api'
import { TopBar } from './components/TopBar'
import { App } from './App'
import { mockApi, mockSystemTheme } from './mockApi'

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

describe('doctor install', () => {
  it('install runs in the terminal and rechecks on focus', async () => {
    mockSystemTheme(false)
    mockApi()
    const tmux: ToolReport = { tool: 'tmux', ok: false, problem: 'falta', install: 'brew install tmux' }
    const jira: ToolReport = { tool: 'jira', ok: false, problem: 'falta', install: 'brew install jira-cli' }
    const odd: ToolReport = { tool: 'odd', ok: false, problem: 'falta', install: '' }
    const answers = [[tmux, jira, odd], [tmux, jira, odd], [jira], []]
    let n = 0
    const doctor = vi.fn(async (): Promise<ToolReport[]> => answers[Math.min(n++, answers.length - 1)]!)
    const installTool = vi.fn(async (tool: string) => (tool === 'jira' ? { error: 'not allowed' } : { ok: true as const }))
    window.atril.doctor = doctor
    window.atril.installTool = installTool
    const user = userEvent.setup()
    render(createElement(App))

    await user.click(await screen.findByRole('button', { name: '3 herramientas por instalar' }))
    const row = (tool: string): HTMLElement => screen.getByText(tool, { selector: 'b' }).closest('.doctor-item') as HTMLElement
    expect(within(row('odd')).queryByRole('button', { name: 'Instalar' })).toBeNull()

    await user.click(within(row('tmux')).getByRole('button', { name: 'Instalar' }))
    await user.click(within(row('jira')).getByRole('button', { name: 'Instalar' }))
    expect(installTool.mock.calls).toEqual([['tmux'], ['jira']])
    expect(await within(row('tmux')).findByText('Instalando en Terminal…')).toBeTruthy()
    expect(await within(row('jira')).findByText('not allowed')).toBeTruthy()

    const before = doctor.mock.calls.length
    act(() => {
      fireEvent(window, new Event('focus'))
    })
    await waitFor(() => expect(doctor.mock.calls.length).toBe(before + 1))
    await waitFor(() => expect(screen.queryByText('Instalando en Terminal…')).toBeNull())
    expect(screen.queryByText('not allowed')).toBeNull()
    expect(within(row('tmux')).getByRole('button', { name: 'Instalar' })).toBeTruthy()
    expect(within(row('jira')).getByRole('button', { name: 'Instalar' })).toBeTruthy()

    act(() => {
      fireEvent(window, new Event('focus'))
    })
    await waitFor(() => expect(screen.queryByText('tmux', { selector: 'b' })).toBeNull())
    expect(screen.getByRole('dialog').textContent).toContain('jira')

    act(() => {
      fireEvent(window, new Event('focus'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByText(/por instalar/)).toBeNull()
    const after = doctor.mock.calls.length
    act(() => {
      fireEvent(window, new Event('focus'))
    })
    expect(doctor.mock.calls.length).toBe(after)
  })
})
