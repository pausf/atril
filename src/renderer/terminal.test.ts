// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TermAttach } from '../preload/api'
import { Terminal } from './components/Terminal'

// jsdom cannot run xterm: a stand-in with the size and calls the component uses.
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    open(): void {}
    loadAddon(): void {}
    onData(): { dispose: () => void } {
      return { dispose: () => undefined }
    }
    write(): void {}
    focus(): void {}
    dispose(): void {}
  }
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit(): void {} } }))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

const FAIL: TermAttach = { error: 'No he podido abrir la terminal de PF-1.', detail: 'posix_spawnp failed.' }
let attach: ReturnType<typeof vi.fn<(id: string, cols: number, rows: number) => Promise<TermAttach>>>

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
  attach = vi.fn(async () => FAIL)
  window.atril = { term: { attach, onData: () => () => undefined, input: vi.fn(), resize: vi.fn(), detach: vi.fn() } } as unknown as typeof window.atril
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('terminal', () => {
  it('a terminal that cannot attach says so', async () => {
    render(createElement(Terminal, { id: 'w1' }))
    const problem = await screen.findByRole('alert')
    expect(problem.querySelector('b')?.textContent).toBe('No he podido abrir la terminal de PF-1.')
    expect(problem.querySelector('p')?.textContent).toBe('Tu agente sigue en tmux: solo falla esta vista.')
    expect(problem.querySelector('details')?.open).toBe(false)
    expect(problem.querySelector('code')?.textContent).toBe('posix_spawnp failed.')
    // The terminal stays mounted under the problem.
    expect(document.querySelector('.xterm-host')).not.toBeNull()

    // An answer that arrives after the terminal moved on to another workspace is dropped.
    cleanup()
    let answer!: (r: TermAttach) => void
    attach.mockImplementationOnce(() => new Promise((r) => (answer = r)))
    const { rerender } = render(createElement(Terminal, { id: 'w2' }))
    attach.mockImplementationOnce(async () => ({ ok: true }))
    rerender(createElement(Terminal, { id: 'w3' }))
    await act(async () => answer(FAIL))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('retrying hides the problem or shows the new one', async () => {
    const user = userEvent.setup()
    render(createElement(Terminal, { id: 'w1' }))
    await screen.findByRole('alert')

    attach.mockImplementationOnce(async () => ({ error: 'No he podido abrir la terminal de PF-1.', detail: 'otra causa' }))
    await user.click(screen.getByRole('button', { name: 'Volver a intentar' }))
    expect(attach).toHaveBeenLastCalledWith('w1', 80, 24)
    await waitFor(() => expect(screen.getByRole('alert').querySelector('code')?.textContent).toBe('otra causa'))

    attach.mockImplementationOnce(async () => ({ ok: true }))
    await user.click(screen.getByRole('button', { name: 'Volver a intentar' }))
    expect(attach).toHaveBeenCalledTimes(3)
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})
