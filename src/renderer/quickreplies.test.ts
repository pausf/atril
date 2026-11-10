// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const item = (branch: string): HTMLElement =>
  Array.from(document.querySelectorAll<HTMLElement>('.ws-item')).find((i) => i.querySelector('.ws-branch')?.textContent === branch)!
const replies = (branch: string): HTMLElement | null => within(item(branch)).queryByRole('group', { name: 'Respuestas rápidas' })
const labels = (branch: string): string[] => Array.from(replies(branch)?.querySelectorAll('button') ?? []).map((b) => b.lastChild?.textContent ?? '')
const QUESTION = '¿Aplico el plan completo o solo la primera parte?'
const asked = [{ at: 5, kind: 'asks' as const, text: QUESTION }]

describe('quick replies', () => {
  it('a waiting row answers with one press', async () => {
    const user = userEvent.setup()
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2'), workspace('aaaaaaa3', 'PF-3'), workspace('aaaaaaa4', 'PF-4')],
      states: { aaaaaaa1: 'needs-you', aaaaaaa2: 'needs-you', aaaaaaa3: 'needs-you', aaaaaaa4: 'working' },
      activity: { aaaaaaa1: asked, aaaaaaa2: asked, aaaaaaa3: asked, aaaaaaa4: [{ at: 5, kind: 'read' as const, text: 'src/a.ts' }] },
      quickReplies: {
        aaaaaaa1: { options: ['Sí', '<b>Rehaz</b> el plan'], multiSelect: false },
        aaaaaaa3: { options: [], multiSelect: true }
      }
    })
    render(createElement(App))
    await screen.findByText('PF-4')

    // Stored options as buttons, their labels as text; none stored: the two fixed replies.
    await waitFor(() => expect(labels('PF-1')).toEqual(['Sí', '<b>Rehaz</b> el plan']))
    expect(item('PF-1').querySelector('b')).toBeNull()
    await waitFor(() => expect(labels('PF-2')).toEqual(['Sí, sigue', 'No, espera']))
    // A multiSelect question and a working agent offer nothing.
    expect(replies('PF-3')).toBeNull()
    expect(replies('PF-4')).toBeNull()

    // The card joins its row: whole question, numbered buttons, and the row stops repeating the cut line.
    const card = item('PF-1').querySelector('.ask')!
    expect(item('PF-1').classList.contains('asks')).toBe(true)
    expect(card.querySelector('.ask-q')?.textContent).toContain(QUESTION)
    expect(Array.from(card.querySelectorAll('.ask-opt kbd')).map((k) => k.textContent)).toEqual(['1', '2'])
    expect(card.querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true')
    expect(item('PF-1').querySelector('.ws-act')).toBeNull()
    expect(item('PF-3').classList.contains('asks')).toBe(false)
    expect(item('PF-3').querySelector('.ws-act')).toBeTruthy()
    expect(item('PF-4').querySelector('.ws-act')).toBeTruthy()

    // A mouse press sends the option, says «Enviado» and disables the buttons.
    await user.click(within(replies('PF-1')!).getByRole('button', { name: '<b>Rehaz</b> el plan' }))
    expect(api.statusApi.answer).toHaveBeenLastCalledWith('aaaaaaa1', { option: 1 })
    expect(await within(item('PF-1')).findByText('Enviado')).toBeTruthy()
    expect(within(replies('PF-1')!).getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    // PF-1 never got selected: the press stays in the row.
    expect(item('PF-1').querySelector('.ws-row')?.getAttribute('aria-pressed')).toBe('false')

    // A keyboard press sends a fixed reply.
    within(replies('PF-2')!).getByRole('button', { name: 'No, espera' }).focus()
    await user.keyboard('{Enter}')
    expect(api.statusApi.answer).toHaveBeenLastCalledWith('aaaaaaa2', { fixed: 'no' })
    expect(await within(item('PF-2')).findByText('Enviado')).toBeTruthy()

    // Leaving needs-you takes the buttons and the «Enviado» away.
    act(() => api.pushState('aaaaaaa1', 'working'))
    expect(replies('PF-1')).toBeNull()
    expect(within(item('PF-1')).queryByText('Enviado')).toBeNull()
    expect(item('PF-1').classList.contains('asks')).toBe(false)
    expect(item('PF-1').querySelector('.ws-act')).toBeTruthy()

    // Back to needs-you: the buttons are live again; an error from main is shown.
    act(() => api.pushState('aaaaaaa1', 'needs-you'))
    await waitFor(() => expect(labels('PF-1')).toEqual(['Sí', '<b>Rehaz</b> el plan']))
    vi.mocked(api.statusApi.answer).mockResolvedValueOnce({ error: 'Esa opción ya no existe.' })
    await user.click(within(replies('PF-1')!).getByRole('button', { name: 'Sí' }))
    expect(api.statusApi.answer).toHaveBeenLastCalledWith('aaaaaaa1', { option: 0 })
    expect(await within(item('PF-1')).findByText('Esa opción ya no existe.')).toBeTruthy()
    // A failed send leaves the buttons live, so the person can try again.
    expect(within(replies('PF-1')!).getAllByRole('button').some((b) => (b as HTMLButtonElement).disabled)).toBe(false)
  })

  it('the question card reads in every theme', () => {
    const css = readFileSync(join(__dirname, 'styles.css'), 'utf8')
    const block = (selector: string): Record<string, string> => {
      const start = css.indexOf(`${selector} {`)
      const body = css.slice(start, css.indexOf('}', start))
      return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
    }
    const light = block(':root')
    const dark = block("[data-theme='dark']")
    const grafito = block("[data-palette='grafito']")
    const grafitoDark = block("[data-palette='grafito'][data-theme='dark']")
    const sets = {
      'original light': light,
      'original dark': { ...light, ...dark },
      'grafito light': { ...light, ...grafito },
      'grafito dark': { ...light, ...dark, ...grafito, ...grafitoDark }
    }
    const channel = (v: number): number => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const lum = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16)
      return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
    }
    const ratio = (a: string, b: string): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
      return (hi + 0.05) / (lo + 0.05)
    }
    for (const [name, set] of Object.entries(sets)) {
      expect(set['ask-bg'], `${name} defines --ask-bg`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(ratio(set['text']!, set['ask-bg']!), `${name}: --text on --ask-bg`).toBeGreaterThanOrEqual(4.5)
    }
    // Each theme and palette block owns its own tint.
    for (const b of [light, dark, grafito, grafitoDark]) expect(b['ask-bg']).toBeTruthy()
  })
})
