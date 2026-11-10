// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FileChange, FlowStage, SubagentEntry, UiState } from '../../preload/api'
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

  it('the panel sections fold and remember', async () => {
    const flow: FlowStage = { stage: 'construir', change: 'add-x', others: ['fix-cart-rounding'], checklist: { file: 'proposal.md', closed: 3, total: 7, firstOpen: 'T4' } }
    const subs: SubagentEntry[] = [
      { id: 's1', type: 'explorer', description: 'Leer pagos', startedAt: 1, endedAt: 9 },
      { id: 's2', type: 'Plan', startedAt: 2, endedAt: 5 }
    ]
    const files: FileChange[] = [...changes, { path: 'src/B.php', status: 'M', added: 1, removed: 1 }]
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const data = { workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' as const }, flow, changes: files, subagents: { aaaaaaa1: subs } }
    const open = async () => {
      const user = userEvent.setup()
      const view = render(createElement(App))
      await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
      await screen.findByRole('button', { name: /^Cambios\s*2$/ })
      await screen.findByRole('button', { name: /^Subagentes\s*2$/ })
      return { user, view }
    }
    const api = mockApi(data, stored)
    const { user, view } = await open()
    const title = (name: RegExp) => screen.getByRole('button', { name })
    const expanded = (name: RegExp) => title(name).getAttribute('aria-expanded')

    // Each title is a button with its count; Otros cambios starts folded, the rest open.
    expect(expanded(/^Checklist\s*3\/7$/)).toBe('true')
    expect(expanded(/^Cambios\s*2$/)).toBe('true')
    expect(expanded(/^Subagentes\s*2$/)).toBe('true')
    expect(expanded(/^Otros cambios\s*1$/)).toBe('false')
    expect(screen.queryByRole('region', { name: /^Otros cambios/ })).toBeNull()

    // Unfolding shows what was folded.
    await user.click(title(/^Otros cambios/))
    expect(expanded(/^Otros cambios\s*1$/)).toBe('true')
    expect(screen.getByRole('region', { name: /^Otros cambios/ }).textContent).toBe('fix-cart-rounding')

    // Folding hides the body and keeps the count in the title.
    await user.click(title(/^Checklist/))
    expect(expanded(/^Checklist\s*3\/7$/)).toBe('false')
    expect(screen.queryByRole('button', { name: 'Ver checklist' })).toBeNull()
    await user.click(title(/^Cambios/))
    expect(expanded(/^Cambios\s*2$/)).toBe('false')
    expect(screen.queryByRole('button', { name: /src\/B\.php/ })).toBeNull()
    await user.click(title(/^Subagentes/))
    expect(expanded(/^Subagentes\s*2$/)).toBe('false')
    expect(screen.queryByRole('list', { name: 'Subagentes' })).toBeNull()
    expect(api.ui.set).toHaveBeenLastCalledWith({ folded: { 'flow-subagents': true } })
    expect(stored.folded).toEqual({ 'flow-others': false, 'flow-checklist': true, 'flow-changes': true, 'flow-subagents': true })

    // Mounted again, each section comes back as it was left.
    view.unmount()
    mockApi(data, stored)
    await open()
    expect(expanded(/^Checklist\s*3\/7$/)).toBe('false')
    expect(expanded(/^Cambios\s*2$/)).toBe('false')
    expect(expanded(/^Subagentes\s*2$/)).toBe('false')
    expect(expanded(/^Otros cambios\s*1$/)).toBe('true')
  })
})
