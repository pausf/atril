// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DoctorReport, JiraSettingsStatus, ToolReport } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const card = () => screen.queryByRole('region', { name: 'Primeros pasos' })
const step = (name: string) => within(card()!).getByText(name).closest('li')!
const mark = (name: string) => within(step(name)).queryByLabelText(/^(Hecho|Pendiente)$/)?.getAttribute('aria-label')
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })
const missing = (tool: string): ToolReport => ({ tool, ok: false, problem: 'no está', install: `brew install ${tool}` })

describe('first-run setup', () => {
  it('a new person sees what is left to start', async () => {
    const user = userEvent.setup()
    // Read at call time: the test changes them as the person would.
    const o = {
      doctor: [missing('tmux')],
      repos: [{ id: 'web', path: '/Users/pau/web', mode: 'worktree' as const, reason: '', health: 'ok' as const }],
      jira: { saved: false } as JiraSettingsStatus,
      forges: { gitlab: { saved: true as const, account: 'pau' } }
    }
    const api = mockApi(o, { tutorialSeen: false, theme: 'auto', folded: {} })
    render(createElement(App))

    // The tutorial is open on first launch: no card until it closes.
    await screen.findByRole('heading', { name: 'Bienvenido a Atril' })
    expect(card()).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Saltar' }))
    await waitFor(() => expect(card()).not.toBeNull())

    // Five steps, in order.
    const names = within(card()!).getAllByRole('listitem').map((li) => li.querySelector('.setup-name')?.textContent)
    expect(names).toEqual(['Herramientas listas', 'Añade un repo', 'Conecta Jira', 'Conecta GitHub o GitLab', 'Abre tu primer trabajo'])

    // 1–4 marked from the live state; GitLab alone counts as a forge.
    await waitFor(() => expect(mark('Conecta GitHub o GitLab')).toBe('Hecho'))
    expect(mark('Herramientas listas')).toBe('Pendiente')
    expect(mark('Añade un repo')).toBe('Hecho')
    expect(mark('Conecta Jira')).toBe('Pendiente')
    // 5 is only its button, never marked.
    expect(mark('Abre tu primer trabajo')).toBeUndefined()

    // 3 and 4 are optional, the others not.
    expect(within(step('Conecta Jira')).getByText('opcional')).toBeTruthy()
    expect(within(step('Conecta GitHub o GitLab')).getByText('opcional')).toBeTruthy()
    for (const n of ['Herramientas listas', 'Añade un repo', 'Abre tu primer trabajo']) expect(within(step(n)).queryByText('opcional')).toBeNull()

    // A done step has no button.
    expect(within(step('Añade un repo')).queryByRole('button')).toBeNull()
    expect(within(step('Conecta GitHub o GitLab')).queryByRole('button')).toBeNull()

    // 1's button opens the tools list (W32), where «Instalar» lives.
    await user.click(within(step('Herramientas listas')).getByRole('button', { name: 'Ver qué falta' }))
    expect(within(screen.getByRole('dialog', { name: 'Herramientas que faltan' })).getByRole('button', { name: 'Instalar' })).toBeTruthy()
    await user.keyboard('{Escape}')

    // 5's button opens «Nuevo trabajo».
    await user.click(within(step('Abre tu primer trabajo')).getByRole('button', { name: 'Nuevo trabajo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuevo trabajo' })).toBeTruthy()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // 3's button goes to Ajustes, where Jira is connected.
    await user.click(within(step('Conecta Jira')).getByRole('button', { name: 'Ir a Ajustes' }))
    expect(await screen.findByRole('region', { name: 'Conexiones' })).toBeTruthy()

    // Done elsewhere, it shows done back in Trabajo: a token saved; tmux installed, only the jira CLI left (step 3's).
    o.jira = { saved: true, account: 'Pau', site: 'https://x.atlassian.net' }
    o.doctor = [missing('jira')]
    await user.click(rail(/Trabajo/))
    act(() => void window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(mark('Conecta Jira')).toBe('Hecho'))
    await waitFor(() => expect(mark('Herramientas listas')).toBe('Hecho'))

    // Ayuda → Tutorial hides it while the tutorial is open.
    act(() => api.menu({ kind: 'tutorial' }))
    await screen.findByRole('heading', { name: 'Bienvenido a Atril' })
    expect(card()).toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(card()).not.toBeNull())

    // «Comprobando…» until the doctor answers; 2's button goes to Ajustes, where repos are added.
    cleanup()
    const fresh = mockApi({ repos: [] })
    let answer: (r: DoctorReport) => void = () => {}
    window.atril.doctor = () => new Promise((r) => (answer = r))
    render(createElement(App))
    await waitFor(() => expect(card()).not.toBeNull())
    expect(within(step('Herramientas listas')).getByText('Comprobando…')).toBeTruthy()
    expect(mark('Herramientas listas')).toBeUndefined()
    act(() => answer([]))
    await waitFor(() => expect(mark('Herramientas listas')).toBe('Hecho'))
    await waitFor(() => expect(mark('Añade un repo')).toBe('Pendiente'))
    await user.click(within(step('Añade un repo')).getByRole('button', { name: 'Ir a Ajustes' }))
    expect(await screen.findByRole('region', { name: 'Repos' })).toBeTruthy()

    // «Ya lo tengo» stores setupDismissed and hides it, also after a restart.
    await user.click(rail(/Trabajo/))
    await user.click(within(card()!).getByRole('button', { name: 'Ya lo tengo' }))
    expect(card()).toBeNull()
    expect(fresh.stored.setupDismissed).toBe(true)
    cleanup()
    mockApi({}, fresh.stored)
    render(createElement(App))
    await screen.findByText('Elige un trabajo')
    expect(card()).toBeNull()

    // A live workspace, even one whose tmux session stopped: nothing to set up.
    cleanup()
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1', false)] })
    render(createElement(App))
    await screen.findByText('PF-1', { selector: '.ws-branch' })
    expect(card()).toBeNull()

    // Someone who already worked (history has lines) never sees it again.
    cleanup()
    mockApi({ history: [{ branch: 'PF-2', repoId: 'web', mode: 'worktree', closedAt: 1, cost: null }] })
    render(createElement(App))
    await screen.findByText('PF-2')
    expect(card()).toBeNull()
  })
})
