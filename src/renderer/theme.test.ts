// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UiState } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme } from './mockApi'

const css = readFileSync(join(__dirname, 'styles.css'), 'utf8')
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`)
  return css.slice(start, css.indexOf('}', start))
}
const tokens = (b: string): Record<string, string> =>
  Object.fromEntries([...b.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
const light = tokens(block(':root'))
const dark = tokens(block("[data-theme='dark']"))

// WCAG 2.x relative luminance and contrast ratio.
const channel = (v: number): number => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Every text colour next to the background it is really drawn on.
const PAIRS: ReadonlyArray<[string, string]> = [
  ['text', 'win'], ['text', 'card'], ['text', 'bg'], ['text', 'chip'], ['text', 'ok-bg'],
  ['sub', 'win'], ['sub', 'card'], ['sub', 'rail'], ['sub', 'chip'], ['sub', 'hover'],
  ['run-text', 'card'], ['run-text', 'win'], ['you-text', 'card'], ['you-text', 'win'],
  ['bad-text', 'card'], ['bad-text', 'win'], ['bad-text', 'bad-bg'],
  ['mode-text', 'mode-bg'], ['ip-text', 'ip-bg'],
  ['on-text', 'text'], ['on-jira', 'jira'],
  ['term-fg', 'term-bg'], ['term-sub', 'term-bg']
]

beforeEach(() => {
  delete document.documentElement.dataset['theme']
})
afterEach(cleanup)

describe('theme', () => {
  it('theme follows the choice and the system', async () => {
    const user = userEvent.setup()
    const system = mockSystemTheme(false)
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const api = mockApi({}, stored)
    const root = document.documentElement
    const { unmount } = render(createElement(App))
    await screen.findByText('Atril')
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))

    const pick = (name: string) => screen.getByRole('button', { name })
    const pressed = () => ['Claro', 'Oscuro', 'Automático'].filter((n) => pick(n).getAttribute('aria-pressed') === 'true')

    // Automático is the default and follows the system live.
    expect(pressed()).toEqual(['Automático'])
    expect(root.dataset['theme']).toBe('light')
    act(() => system.setDark(true))
    expect(root.dataset['theme']).toBe('dark')
    act(() => system.setDark(false))
    expect(root.dataset['theme']).toBe('light')

    // An explicit choice ignores the system and is written to ui.json.
    await user.click(pick('Oscuro'))
    expect(root.dataset['theme']).toBe('dark')
    expect(pressed()).toEqual(['Oscuro'])
    expect(api.ui.set).toHaveBeenLastCalledWith({ theme: 'dark' })
    act(() => system.setDark(true))
    act(() => system.setDark(false))
    expect(root.dataset['theme']).toBe('dark')
    await user.click(pick('Claro'))
    act(() => system.setDark(true))
    expect(root.dataset['theme']).toBe('light')
    expect(stored.theme).toBe('light')

    // Back to Automático with the system dark: it follows again.
    await user.click(pick('Automático'))
    expect(root.dataset['theme']).toBe('dark')
    act(() => system.setDark(false))
    expect(root.dataset['theme']).toBe('light')

    // The choice survives a restart.
    await user.click(pick('Oscuro'))
    unmount()
    delete root.dataset['theme']
    mockApi({}, stored)
    render(createElement(App))
    await waitFor(() => expect(root.dataset['theme']).toBe('dark'))

    // Both themes define the same tokens, and no colour lives outside them.
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
    const rest = css.replace(block(':root') + '}', '').replace(block("[data-theme='dark']") + '}', '')
    expect(rest.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g)).toBeNull()

    // Body text keeps 4.5:1 in both.
    for (const [name, set] of [['light', light], ['dark', dark]] as const) {
      for (const [fg, bg] of PAIRS) {
        const ratio = contrast(set[fg]!, set[bg]!)
        expect(ratio, `${name}: ${fg} on ${bg} (${set[fg]} / ${set[bg]})`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
