// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { menuTemplate } from '../main/menu'
import { App } from './App'
import { issue, mockApi, mockSystemTheme, workspace } from './mockApi'
import { STEPS } from './tour/Tour'

const data = { workspaces: [workspace('aaaaaaa1', 'PF-1', false)], issues: [issue('PF-10', 'todo')] }

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const tip = () => screen.getByRole('dialog', { name: /./ })
const spot = () => document.querySelector<HTMLElement>('.spot')

describe('tutorial', () => {
  it('first launch runs the tutorial over every element', async () => {
    const user = userEvent.setup()
    // Seeded so every optional target that can exist does: the agent waits, the flow builds, an MR is listed, a tool is missing.
    mockApi(
      {
        workspaces: [workspace('aaaaaaa1', 'PF-1', false)],
        issues: [issue('PF-10', 'todo')],
        states: { aaaaaaa1: 'needs-you' },
        nextup: [{ kind: 'agent', id: 'aaaaaaa1' }],
        flow: { stage: 'construir', change: 'add-x', others: [], checklist: { file: 'proposal.md', closed: 2, total: 5, firstOpen: 'T3' } },
        changes: [{ path: 'src/a.ts', status: 'M', added: 10, removed: 2 }],
        subagents: { aaaaaaa1: [{ id: 's1', type: 'Explore', description: 'Buscar los usos', startedAt: 10 }] },
        mrs: { connected: ['github'], mine: [{ forge: 'github', url: 'https://github.com/acme/web/pull/1', title: 'Envío', project: 'acme/web', author: 'pau', updatedAt: new Date().toISOString() }], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [] },
        doctor: [{ tool: 'tmux', ok: false, problem: 'no está', install: 'brew install tmux' }]
      },
      { tutorialSeen: false, theme: 'auto', folded: {} }
    )
    render(createElement(App))

    // The welcome, centred and with its button.
    expect((await screen.findByRole('heading', { name: 'Bienvenido a Atril' })).textContent).toBeTruthy()
    expect(spot()).toBeNull()
    await user.click(await screen.findByText('PF-1', { selector: '.ws-branch' }))
    await user.click(screen.getByRole('button', { name: 'Enséñamelo · 3 min' }))

    // The 24 steps of «Pasos», in order.
    expect(STEPS.map((s) => s.target)).toEqual([
      'rail', 'next-up', 'new-work', 'workspaces', 'terminal', 'flow', 'stages', 'flow-checklist', 'flow-changes', 'flow-subagents', 'activity', 'tasks',
      'start-mode', 'new-task', 'mr', 'mr-tools', 'avisos', 'doctor', 'palette', 'usage', 'session', 'connections', 'repos', 'appearance'
    ])
    const NEVER = ['start-mode', 'palette']
    for (const [n, step] of STEPS.entries()) {
      await waitFor(() => expect(tip().textContent).toContain(`Paso ${n + 1} de ${STEPS.length}`))
      expect(screen.getByRole('heading', { name: step.title, level: 4 })).toBeTruthy()
      // Two or three sentences: a sentence ends in . ? or ! before a space or the end.
      const text = tip().querySelector('p')?.textContent ?? ''
      const sentences = text.trim().match(/[.?!](?=\s|$)/g)?.length ?? 0
      expect(sentences, `${step.target}: «${text}»`).toBeGreaterThanOrEqual(2)
      expect(sentences, `${step.target}: «${text}»`).toBeLessThanOrEqual(3)
      if (NEVER.includes(step.target)) {
        // No element: the step shows centred over the scrim.
        expect(document.querySelector(`[data-tour="${step.target}"]`)).toBeNull()
        expect(spot()).toBeNull()
        expect(document.querySelector('.tour .scrim')).not.toBeNull()
        expect(tip().classList.contains('centred')).toBe(true)
      } else {
        // The step switches screens so its target is on screen, then spotlights that real element.
        await waitFor(() => expect(spot()?.dataset['target']).toBe(step.target))
        const target = document.querySelector(`[data-tour="${step.target}"]`)
        expect(target, `[data-tour=${step.target}] exists`).not.toBeNull()
        expect(target?.closest('[hidden]')).toBeNull()
        expect(tip().classList.contains('centred')).toBe(false)
      }
      await user.click(screen.getByRole('button', { name: n === STEPS.length - 1 ? 'Terminar' : 'Siguiente' }))
    }
    expect(screen.queryByRole('dialog')).toBeNull()
    // Finishing returns to the main screen.
    expect(document.querySelector('.col.left')?.closest('[hidden]')).toBeNull()
  })

  it('tutorial runs once and reopens from help', async () => {
    const user = userEvent.setup()
    const api = mockApi(data, { tutorialSeen: false, theme: 'auto', folded: {} })
    const { unmount } = render(createElement(App))
    await screen.findByRole('heading', { name: 'Bienvenido a Atril' })
    await user.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.ui.set).toHaveBeenCalledWith({ tutorialSeen: true })
    expect(api.stored.tutorialSeen).toBe(true)

    // The next launch reads ui.json and stays quiet.
    unmount()
    const again = mockApi(data, api.stored)
    render(createElement(App))
    await screen.findByText('PF-1')
    await waitFor(() => expect(again.ui.get).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()

    // Help -> Tutorial exists in the menu and its click reaches the app.
    const help = menuTemplate({ selected: null, count: 0, nextEnabled: false, split: () => {}, send: () => {} }).find((m) => m.role === 'help')
    const item = (help?.submenu as Array<{ label?: string; click?: () => void }>).find((i) => i.label === 'Tutorial')
    expect(item).toBeTruthy()
    act(() => again.menu({ kind: 'tutorial' }))
    expect(await screen.findByRole('heading', { name: 'Bienvenido a Atril' })).toBeTruthy()

    // Finishing it again keeps it seen.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(again.stored.tutorialSeen).toBe(true)
  })

  it('tutorial works with the keyboard alone', async () => {
    const user = userEvent.setup()
    const api = mockApi(data, { tutorialSeen: false, theme: 'auto', folded: {} })
    render(createElement(App))
    await screen.findByRole('heading', { name: 'Bienvenido a Atril' })

    // Focus lands on the primary button; Enter starts.
    expect(document.activeElement?.textContent).toMatch(/Enséñamelo/)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('rail'))
    expect(document.activeElement?.textContent).toBe('Siguiente')

    // → and ← move, Enter on the focused primary advances.
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(tip().textContent).toContain('Paso 2 de'))
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('new-work'))
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(tip().textContent).toContain('Paso 2 de'))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(spot()?.dataset['target']).toBe('new-work'))

    // Tab never leaves the tip, in either direction.
    for (let i = 0; i < 7; i++) {
      await user.tab()
      expect(tip().contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 7; i++) {
      await user.tab({ shift: true })
      expect(tip().contains(document.activeElement)).toBe(true)
    }

    // Esc closes and counts as seen.
    expect(api.stored.tutorialSeen).toBe(false)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.stored.tutorialSeen).toBe(true)
  })
})
