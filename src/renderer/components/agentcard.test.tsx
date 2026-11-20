// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentWait, QuickAnswer } from '../../preload/api'
import { AgentCard } from './AgentCard'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

// The terminal under the strip: jsdom cannot run xterm.
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    open(): void {}
    loadAddon(): void {}
    write(): void {}
    dispose(): void {}
  }
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit(): void {} } }))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

const q = (question: string, options: [string, string?][], multiSelect = false) => ({
  question,
  header: question.slice(1, 6),
  multiSelect,
  options: options.map(([label, description = '']) => ({ label, description }))
})
let wait: AgentWait | null
let answer: ReturnType<typeof vi.fn<(id: string, choice: unknown) => Promise<QuickAnswer>>>

beforeEach(() => {
  wait = null
  answer = vi.fn(async () => ({ ok: true as const }))
  mockApi({}, undefined, { status: { wait: vi.fn(async () => wait), answer } })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const card = (): HTMLElement => screen.getByRole('group')
const buttons = (): string[] => within(card()).queryAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '')

describe('agent card', () => {
  it('a card answers by mouse and by number keys', async () => {
    const user = userEvent.setup()
    wait = { kind: 'question', questions: [q('¿Cómo seguimos?', [['Corto'], ['Largo']])], next: 0, idle: false }
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    await screen.findByText('¿Cómo seguimos?')

    // A mouse press sends its choice, says «Enviado» and disables the card.
    await user.click(within(card()).getByRole('button', { name: /Largo/ }))
    expect(answer).toHaveBeenLastCalledWith('w1', { option: 1, question: 0 })
    expect(await screen.findByText('Enviado')).toBeTruthy()
    expect(within(card()).getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    cleanup()

    // With the card focused, a number key presses that button; an error keeps the card live.
    answer.mockResolvedValueOnce({ error: 'Esa opción ya no existe.' })
    render(createElement(AgentCard, { workspaceId: 'w2', activityAt: 1 }))
    await screen.findByText('¿Cómo seguimos?')
    card().focus()
    await user.keyboard('1')
    expect(answer).toHaveBeenLastCalledWith('w2', { option: 0, question: 0 })
    expect(await screen.findByText('Esa opción ya no existe.')).toBeTruthy()
    expect(within(card()).getAllByRole('button').some((b) => (b as HTMLButtonElement).disabled)).toBe(false)
    // A number with no button sends nothing.
    answer.mockClear()
    await user.keyboard('4')
    expect(answer).not.toHaveBeenCalled()
    // The error says the agent still waits and tries the same answer again.
    const alert = within(card()).getByRole('alert')
    expect(alert.textContent).toContain('El agente sigue esperando tu respuesta.')
    await user.click(within(alert).getByRole('button', { name: 'Volver a intentar' }))
    expect(answer).toHaveBeenLastCalledWith('w2', { option: 0, question: 0 })

    // A permission card answers with 1 and 2 too.
    cleanup()
    wait = { kind: 'permission', questions: [], next: 0, permission: { tool: 'Bash', summary: 'ls' }, idle: false }
    render(createElement(AgentCard, { workspaceId: 'w3', activityAt: 1 }))
    await screen.findByText('Quiere ejecutar ls')
    card().focus()
    await user.keyboard('2')
    expect(answer).toHaveBeenLastCalledWith('w3', { deny: true })
    cleanup()

    // In the app: the waiting row and the strip above its terminal carry the card, not today's quick replies.
    mockSystemTheme(false)
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2')],
      states: { aaaaaaa1: 'needs-you', aaaaaaa2: 'working' },
      activity: { aaaaaaa1: [{ at: 5, kind: 'asks', text: 'Te pregunta: ¿Sigo?' }], aaaaaaa2: [{ at: 5, kind: 'read', text: 'Leyendo a.ts' }] },
      waits: { aaaaaaa1: { kind: 'permission', questions: [], next: 0, permission: { tool: 'Bash', summary: 'ls' }, idle: false } }
    })
    render(createElement(App))
    const found = (sel: string): HTMLElement => {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el) throw new Error(`no ${sel}`)
      return el
    }
    const row = await waitFor(() => found('.ws-item.asks'))
    expect(row.querySelector('.ws-branch')?.textContent).toBe('PF-1')
    expect(within(row).getByRole('group', { name: 'Lo que espera el agente' })).toBeTruthy()
    expect(row.querySelector('.ws-act')).toBeNull()
    expect(document.querySelectorAll('.ws-item .ask')).toHaveLength(1)
    await user.click(within(row).getByRole('button', { name: 'Permitir' }))
    expect(api.statusApi.answer).toHaveBeenLastCalledWith('aaaaaaa1', { allow: true })
    await user.click(row.querySelector<HTMLElement>('.ws-row')!)
    const strip = await waitFor(() => found('.term-ask'))
    expect(within(strip).getByText('Quiere ejecutar ls')).toBeTruthy()
  })

  it('a question card answers with its options', async () => {
    const user = userEvent.setup()
    wait = {
      kind: 'question',
      text: 'Te pregunta: ¿Cómo?',
      questions: [
        q('¿Cómo?', [['Ya']]),
        q('¿Qué hacemos con <b>esto</b>?', [['Partirla (Recommended)', 'Dos MRs, más fáciles de revisar'], ['Dejarla', 'Una sola MR'], ['Otra (Recomendado)']])
      ],
      next: 1,
      idle: false
    }
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    // The next unanswered question, with its header; text is text, never HTML.
    await screen.findByText('¿Qué hacemos con <b>esto</b>?')
    expect(card().querySelector('b')).toBeNull()
    expect(screen.queryByText('¿Cómo?')).toBeNull()
    expect(within(card()).getByText('Qué h')).toBeTruthy()
    // Each option a numbered button with its label and description; the recommended one marked, without the suffix.
    const opts = within(card()).getAllByRole('button')
    expect(opts.map((b) => b.querySelector('kbd')?.textContent)).toEqual(['1', '2', '3'])
    expect(opts[0]!.querySelector('.ask-label')?.textContent).toBe('Partirla')
    expect(opts[0]!.querySelector('.ask-rec')?.textContent).toBe('Recomendada')
    expect(opts[0]!.querySelector('.ask-desc')?.textContent).toBe('Dos MRs, más fáciles de revisar')
    expect(opts[1]!.querySelector('.ask-rec')).toBeNull()
    expect(opts[2]!.querySelector('.ask-label')?.textContent).toBe('Otra')
    expect(opts[2]!.querySelector('.ask-rec')).toBeTruthy()
    await user.click(opts[1]!)
    expect(answer).toHaveBeenLastCalledWith('w1', { option: 1, question: 1 })
    cleanup()

    // The row and the strip show the same wait: answering in one moves both to the next question, and the last says «Enviado».
    const two = (next: number): AgentWait => ({ kind: 'question', questions: [q('¿Primera?', [['A'], ['B']]), q('¿Segunda?', [['C'], ['D']])], next, idle: false })
    wait = two(0)
    const { container } = render(createElement('div', null, createElement(AgentCard, { workspaceId: 'w9', activityAt: 1 }), createElement(AgentCard, { workspaceId: 'w9', activityAt: 1 })))
    await waitFor(() => expect(screen.getAllByText('¿Primera?')).toHaveLength(2))
    wait = two(1)
    await user.click(within(container.querySelectorAll<HTMLElement>('.ask')[0]!).getByRole('button', { name: 'B' }))
    await waitFor(() => expect(screen.getAllByText('¿Segunda?')).toHaveLength(2))
    wait = two(2)
    await user.click(within(container.querySelectorAll<HTMLElement>('.ask')[1]!).getByRole('button', { name: 'C' }))
    await waitFor(() => expect(screen.getAllByText('Enviado')).toHaveLength(2))
    expect(screen.queryAllByRole('button')).toEqual([])
    cleanup()

    // multiSelect: the options without buttons, and where to answer.
    wait = { kind: 'question', questions: [q('¿Cuáles?', [['A', 'la a'], ['B']], true)], next: 0, idle: false }
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    await screen.findByText('¿Cuáles?')
    expect(within(card()).queryAllByRole('button')).toEqual([])
    expect(within(card()).getByText('A')).toBeTruthy()
    expect(within(card()).getByText('Contesta por escrito abajo')).toBeTruthy()
  })

  it('a permission card allows or denies', async () => {
    const user = userEvent.setup()
    const perm = (permission?: AgentWait['permission']): AgentWait => ({ kind: 'permission', questions: [], next: 0, ...(permission && { permission }), idle: false })
    wait = perm({ tool: 'Bash', summary: 'git push origin <b>main</b>' })
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    await screen.findByText('Quiere ejecutar git push origin <b>main</b>')
    expect(buttons()).toEqual(['Permitir', 'Denegar'])
    await user.click(screen.getByRole('button', { name: 'Permitir' }))
    expect(answer).toHaveBeenLastCalledWith('w1', { allow: true })
    cleanup()
    wait = perm({ tool: 'WebFetch' })
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    await screen.findByText('Quiere usar WebFetch')
    await user.click(screen.getByRole('button', { name: 'Denegar' }))
    expect(answer).toHaveBeenLastCalledWith('w1', { deny: true })
    cleanup()
    wait = perm()
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    expect(await screen.findByText('Quiere permiso para seguir')).toBeTruthy()
    expect(buttons()).toEqual(['Permitir', 'Denegar'])
  })

  it('a turn end offers to continue', async () => {
    const user = userEvent.setup()
    const composer = document.createElement('textarea')
    composer.id = 'composer-w1'
    document.body.append(composer)
    wait = { kind: 'turn-end', text: 'Claude dice: He terminado la casilla 2.', questions: [], next: 0, idle: false }
    render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1, focusComposer: true }))
    expect(await screen.findByText('Ha terminado: He terminado la casilla 2.')).toBeTruthy()
    // The composer takes the focus, so the person can write at once.
    await waitFor(() => expect(document.activeElement).toBe(composer))
    expect(screen.queryByText('Lleva un rato esperándote')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Sigue' }))
    expect(answer).toHaveBeenLastCalledWith('w1', { continue: true })
    cleanup()
    composer.remove()

    // While idle, it says it has been waiting a while.
    wait = { kind: 'turn-end', text: 'Claude ha terminado', questions: [], next: 0, idle: true }
    const { rerender } = render(createElement(AgentCard, { workspaceId: 'w1', activityAt: 1 }))
    expect(await screen.findByText('Lleva un rato esperándote')).toBeTruthy()
    // A new activity line asks main again.
    wait = { kind: 'turn-end', text: 'Claude dice: Otra cosa.', questions: [], next: 0, idle: false }
    await act(async () => rerender(createElement(AgentCard, { workspaceId: 'w1', activityAt: 2 })))
    expect(await screen.findByText('Ha terminado: Otra cosa.')).toBeTruthy()
  })
})
