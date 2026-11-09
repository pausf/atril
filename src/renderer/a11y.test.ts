// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RepoView } from '../preload/api'
import { App } from './App'
import { issue, mockApi, mockSystemTheme, workspace } from './mockApi'

const repos: RepoView[] = [
  { id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found' },
  { id: 'api', path: '/a', mode: 'in-place', reason: 'in-place: build reads an ignored file' }
]

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

async function boot() {
  const api = mockApi({
    workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2'), workspace('aaaaaaa3', 'PF-3', false)],
    states: { aaaaaaa1: 'working', aaaaaaa2: 'needs-you', aaaaaaa3: 'stopped' },
    issues: [issue('PF-10', 'todo'), issue('PF-11', 'doing')],
    repos,
    flow: { stage: 'spec', change: 'add-x', others: [] }
  })
  render(createElement(App))
  await screen.findByText('PF-3')
  await screen.findByText('web')
  return api
}

describe('keyboard and labels', () => {
  it('states have text labels and controls are focusable', async () => {
    const user = userEvent.setup()
    const api = await boot()

    // Every agent state shows its colour AND a word.
    const labels = Array.from(document.querySelectorAll('.state')).map((e) => e.textContent?.trim())
    expect(labels).toEqual(['trabajando', 'te necesita', 'parado'])
    for (const m of document.querySelectorAll('.mode')) expect(m.textContent).toMatch(/worktree|in-place/)
    const stages = Array.from(document.querySelectorAll('.stg')).map((e) => e.textContent ?? '')
    expect(stages).toHaveLength(6)
    for (const s of stages) expect(s).toMatch(/hecho|ahora|pendiente/)
    expect(stages.filter((s) => /ahora/.test(s))).toHaveLength(1)

    // Tareas rows: the status colour is a tag with text.
    await user.click(screen.getByRole('button', { name: 'Tareas' }))
    for (const t of document.querySelectorAll('.task')) {
      expect(t.querySelectorAll('.tag').length).toBeGreaterThanOrEqual(2)
      for (const tag of t.querySelectorAll('.tag')) expect(tag.textContent?.trim()).not.toBe('')
    }
    await user.click(screen.getByRole('button', { name: 'Trabajo' }))

    // Controls are real elements, named, and never taken out of the tab order.
    expect(document.querySelectorAll('[role="button"], [role="link"], [onclick]')).toHaveLength(0)
    const controls = Array.from(document.querySelectorAll<HTMLElement>('button, input, select, a[href]'))
    expect(controls.length).toBeGreaterThan(10)
    for (const c of controls) expect(c.tabIndex).toBeGreaterThanOrEqual(0)
    const buttons = screen.getAllByRole('button')
    expect(screen.getAllByRole('button', { name: /\S/ })).toHaveLength(buttons.length)

    // The ring exists for everything the keyboard reaches.
    const css = readFileSync(join(__dirname, 'styles.css'), 'utf8')
    expect(css).toMatch(/button:focus-visible[\s\S]*?\{[^}]*outline: 2px solid var\(--ring\)/)
    expect(css).toMatch(/h2\[tabindex\]:focus/)

    // Tab walks the real controls.
    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(document.activeElement?.matches('button, input, select')).toBe(true)
    }

    // ⌘L and ⌘J (menu actions) land focus on a real element of each column.
    act(() => api.menu({ kind: 'focus', target: 'sidebar' }))
    expect(document.activeElement).toBe(within(document.querySelector<HTMLElement>('.col.left')!).getByRole('button', { name: /Jira/ }))
    act(() => api.menu({ kind: 'focus', target: 'flow' }))
    expect(document.activeElement).toBe(document.querySelector('.col.right h2'))
    expect(document.activeElement?.closest('.col.right')).not.toBeNull()
  })
})
