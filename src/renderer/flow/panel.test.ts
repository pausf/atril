// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FileChange, FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const changes: FileChange[] = [{ path: 'src/A.php', status: 'A', added: 4, removed: 0 }]

async function boot(flow: FlowStage) {
  mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' }, flow, changes })
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
  return user
}

const text = (e: Element): string => (e.textContent ?? '').replace(/\s+/g, ' ').trim()

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('libretto panel', () => {
  it('stages sit in one row and keep their names', async () => {
    const user = await boot({ stage: 'plan', change: 'add-x', others: [] })
    await screen.findByRole('button', { name: /^Plan ahora/ })
    expect(screen.queryByText(/Dónde va cada trabajo/)).toBeNull()

    // One row: the stages container lays out horizontally.
    const css = readFileSync(join(__dirname, '..', 'styles.css'), 'utf8')
    const rule = css.match(/\n\.stages \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toMatch(/display: flex/)
    expect(rule).not.toMatch(/flex-direction: column/)

    // Every stage keeps its icon and its name plus state as text.
    const stages = Array.from(document.querySelectorAll('.stages .stg'))
    expect(stages.map(text)).toEqual(['Entrada hecho', 'Spec hecho', 'Plan ahora', 'Construir pendiente', 'Terminado pendiente', 'Aterrizado pendiente'])
    for (const s of stages) {
      expect(s.querySelector('.icon')).not.toBeNull()
      expect(s.getAttribute('title')).toMatch(new RegExp(`^${text(s)}`))
    }

    // Only the current stage's name is visible; the others' text is visually hidden, never removed.
    const hidden = stages.map((s) => s.querySelector('.stg-t')!.classList.contains('sr-only'))
    expect(hidden).toEqual([true, true, false, true, true, true])
    expect(css).toMatch(/\n\.sr-only \{[^}]*clip: rect\(0, 0, 0, 0\)/)

    // F13: reached stages with a document stay buttons that open it.
    expect(screen.getByRole('button', { name: /^Spec hecho/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Construir/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Plan ahora/ }))
    expect(await screen.findByRole('dialog', { name: /Plan/ })).toBeTruthy()
    cleanup()

    // F20: Construir with changes stays the button that opens the diff, its text naming the files instead of its state.
    await boot({ stage: 'terminado', change: 'add-x', others: [] })
    const build = await screen.findByRole('button', { name: 'Construir · ver 1 archivos' })
    expect(build.querySelector('.stg-t')!.classList.contains('sr-only')).toBe(true)
  })
})
