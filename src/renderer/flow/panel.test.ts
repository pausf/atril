// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
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
  it('the steps show as six named segments above the work', async () => {
    const user = await boot({ stage: 'construir', change: 'add-x', others: [], checklist: { file: 'proposal.md', closed: 3, total: 7, firstOpen: 'T4' } })
    const group = await screen.findByRole('group', { name: 'Pasos de Libretto' })

    // In the centre, above the repo line and the title of the work.
    const title = screen.getByRole('heading', { level: 1, name: 'PF-1' })
    expect(group.closest('main')).toBe(title.closest('main'))
    expect(group.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(group.compareDocumentPosition(title.closest('.whead')!.querySelector('.m')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Six named segments: done full, the current one filled closed/total with the count after its name, pending empty.
    const segs = Array.from(group.querySelectorAll('.seg'))
    expect(segs.map(text)).toEqual(['Entrada hecho', 'Spec hecho', 'Plan hecho', 'Construir 3/7 ahora', 'Revisar pendiente', 'Aterrizar pendiente'])
    const fill = segs.map((s) => parseFloat((s.querySelector('.bar b') as HTMLElement).style.width))
    expect(fill.map((n) => Math.round(n))).toEqual([100, 100, 100, 43, 0, 0])
    expect(segs.map((s) => s.getAttribute('aria-current'))).toEqual([null, null, null, 'step', null, null])

    // Spec and Plan are buttons as F13 makes them, and open the document; the others are not.
    expect(Array.from(group.querySelectorAll('button')).map(text)).toEqual(['Spec', 'Plan'])
    await user.click(within(group).getByRole('button', { name: 'Plan' }))
    expect(await screen.findByRole('dialog', { name: /Plan/ })).toBeTruthy()
    await user.keyboard('{Escape}')

    // The panel no longer carries the stages.
    const panel = document.querySelector('.col.right')!
    expect(panel.querySelector('.seg6, .stages, .stg')).toBeNull()
    cleanup()

    // Spec reached, Plan not yet: one button. Without a change, or without Libretto, no steps at all.
    await boot({ stage: 'spec', change: 'add-x', others: [] })
    expect(Array.from((await screen.findByRole('group', { name: 'Pasos de Libretto' })).querySelectorAll('button')).map(text)).toEqual(['Spec'])
    cleanup()
    await boot({ stage: 'entrada', others: [] })
    await screen.findByRole('heading', { name: 'PF-1' })
    expect(screen.queryByRole('group', { name: 'Pasos de Libretto' })).toBeNull()
    cleanup()
    await boot({ stage: 'sin-libretto', others: [] })
    await screen.findByText(/sin Libretto/)
    expect(screen.queryByRole('group', { name: 'Pasos de Libretto' })).toBeNull()
  })

  it('the panel sections fold and remember', async () => {
    const flow: FlowStage = { stage: 'construir', change: 'add-x', others: ['fix-cart-rounding', 'tidy-css'], checklist: { file: 'proposal.md', closed: 3, total: 7, firstOpen: 'T4' } }
    const subs: SubagentEntry[] = [
      { id: 's1', type: 'explorer', description: 'Leer pagos', startedAt: 1, endedAt: 9 },
      { id: 's2', type: 'Plan', startedAt: 2, endedAt: 5 }
    ]
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const data = { workspaces: [workspace('aaaaaaa1', 'PF-1', false)], states: { aaaaaaa1: 'working' as const }, flow, changes, subagents: { aaaaaaa1: subs } }
    const open = async () => {
      const user = userEvent.setup()
      const view = render(createElement(App))
      await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
      await screen.findByRole('button', { name: /^Subagentes\s*2$/ })
      return { user, view }
    }
    const api = mockApi(data, stored)
    const { user, view } = await open()
    const title = () => screen.getByRole('button', { name: /^Subagentes/ })

    // Checklist and Cambios are no sections any more; Subagentes keeps its count and starts open.
    expect(screen.queryByRole('button', { name: /^Checklist/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Cambios/ })).toBeNull()
    expect(title().getAttribute('aria-expanded')).toBe('true')

    // Folding hides the body and keeps the count in the title.
    await user.click(title())
    expect(title().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('list', { name: 'Subagentes' })).toBeNull()
    expect(api.ui.set).toHaveBeenLastCalledWith({ folded: { 'flow-subagents': true } })
    expect(stored.folded).toEqual({ 'flow-subagents': true })

    // Mounted again, it comes back as it was left.
    view.unmount()
    mockApi(data, stored)
    await open()
    expect(title().getAttribute('aria-expanded')).toBe('false')
  })

  it('other changes lead to Libretto', async () => {
    const stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }
    const repo = (id: string) => ({ id, path: `/r/${id}`, mode: 'worktree' as const, reason: '' })
    const open = async (others: string[]) => {
      mockApi(
        {
          repos: [repo('web'), repo('api')],
          workspaces: [{ ...workspace('aaaaaaa1', 'PF-1', false), repoId: 'api' }],
          states: { aaaaaaa1: 'working' },
          flow: { stage: 'plan', change: 'add-x', others },
          libretto: { web: { none: true }, api: { queued: [], inFlight: [] } }
        },
        stored
      )
      const user = userEvent.setup()
      render(createElement(App))
      await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
      await screen.findByRole('group', { name: 'Pasos de Libretto' })
      return user
    }

    // Its count, no names, and a button that stores the repo and opens the screen.
    const user = await open(['fix-cart-rounding', 'tidy-css'])
    expect(await screen.findByText('2 cambios más en este repo')).toBeTruthy()
    expect(screen.queryByText('fix-cart-rounding')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Ver en Libretto' }))
    expect(stored.librettoRepo).toBe('api')
    expect(within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name: /Libretto/ }).getAttribute('aria-current')).toBe('page')
    cleanup()

    // One other change reads in the singular.
    await open(['tidy-css'])
    expect(await screen.findByText('1 cambio más en este repo')).toBeTruthy()
    cleanup()

    // Nothing else to show: neither the line nor the button.
    await open([])
    expect(screen.queryByText(/cambios más en este repo/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver en Libretto' })).toBeNull()
  })

  it('the documents read as buttons next to the change', async () => {
    // Spec reached, Plan not yet: only Spec, in the steps above the work.
    const early = await boot({ stage: 'spec', change: 'add-x', others: [] })
    const steps = await screen.findByRole('group', { name: 'Pasos de Libretto' })
    expect(Array.from(steps.querySelectorAll('button')).map(text)).toEqual(['Spec'])
    // The panel names the change and carries no document buttons of its own.
    expect(screen.getByText('add-x').closest('.fmeta')!.querySelectorAll('button')).toHaveLength(0)
    await early.click(within(steps).getByRole('button', { name: 'Spec' }))
    expect(await screen.findByRole('dialog', { name: /Spec/ })).toBeTruthy()
    cleanup()

    // From Plan on, both, with the document icon; they open the same documents.
    const user = await boot({ stage: 'plan', change: 'add-x', others: [] })
    const both = await screen.findByRole('group', { name: 'Pasos de Libretto' })
    expect(Array.from(both.querySelectorAll('button')).map(text)).toEqual(['Spec', 'Plan'])
    for (const b of both.querySelectorAll('button')) expect(b.querySelector('.icon')).not.toBeNull()
    await user.click(within(both).getByRole('button', { name: 'Plan' }))
    expect(await screen.findByRole('dialog', { name: /Plan/ })).toBeTruthy()
  })
})
