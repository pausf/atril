// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Terminal } from './Terminal'

// jsdom cannot run xterm: a stand-in that remembers its options and anyone listening for keys.
const made: Array<{ options: Record<string, unknown>; listeners: Array<(d: string) => void> }> = []
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    listeners: Array<(d: string) => void> = []
    constructor(public options: Record<string, unknown>) {
      made.push(this)
    }
    open(): void {}
    loadAddon(): void {}
    onData(cb: (d: string) => void): { dispose: () => void } {
      this.listeners.push(cb)
      return { dispose: () => undefined }
    }
    write(): void {}
    focus(): void {}
    dispose(): void {}
  }
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit(): void {} } }))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

const sent: unknown[][] = []
beforeEach(() => {
  made.length = 0
  sent.length = 0
  vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
  const record = (name: string) => (...a: unknown[]) => void sent.push([name, ...a])
  window.atril = {
    term: { attach: async () => ({ ok: true }), onData: () => () => undefined, input: record('input'), resize: vi.fn(), detach: vi.fn() },
    status: { answer: record('answer'), compose: record('compose') }
  } as unknown as typeof window.atril
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('terminal', () => {
  it('typing in the terminal sends nothing', () => {
    const { container } = render(createElement(Terminal, { id: 'w1' }))
    const term = made.at(-1)!
    // W196: xterm itself refuses keyboard input…
    expect(term.options['disableStdin']).toBe(true)
    // …and nobody listens for what it would have sent.
    term.listeners.forEach((l) => l('hola\r'))
    fireEvent.keyDown(container.querySelector('.xterm-host')!, { key: 'a' })
    expect(sent).toEqual([])
  })
})
