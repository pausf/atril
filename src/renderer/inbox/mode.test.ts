// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView } from '../../preload/api'
import { App } from '../App'
import { issue, mockApi, mockSystemTheme, workspace } from '../mockApi'

const repos: RepoView[] = [{ id: 'web', path: '/w', mode: 'worktree', reason: '' }]
const proposal = { repoId: 'web', branch: 'PF-10', mode: 'worktree' as const, reason: '', command: 'claude' }
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })
const MANUAL = 'Se para con la spec y el plan escritos y te pregunta'
const AUTO = 'Sin parar en spec y plan; antes de subir te pregunta'
/** Each option explains itself: its text is the radio's accessible description, not a loose line below. */
const described = (radio: HTMLElement): string =>
  (radio.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ')

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

async function startDialog() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Tareas/))
  await user.keyboard('{Alt>}')
  await user.click(await screen.findByRole('button', { name: 'Empezar PF-10' }))
  await user.keyboard('{/Alt}')
  return { user, dialog: await screen.findByRole('dialog', { name: /Empezar PF-10/ }) }
}

describe('start modes', () => {
  it('the start dialogs offer manual or automatic', async () => {
    // Empezar's dialog: Manual by default, Automático sends auto: true.
    const api = mockApi({ issues: [issue('PF-10', 'todo')], repos, proposal })
    const { user: u1, dialog } = await startDialog()
    const group = within(dialog).getByRole('radiogroup', { name: 'Modo' })
    expect((within(group).getByRole('radio', { name: 'Manual' }) as HTMLInputElement).checked).toBe(true)
    expect(described(within(group).getByRole('radio', { name: 'Manual' }))).toBe(MANUAL)
    expect(described(within(group).getByRole('radio', { name: 'Automático' }))).toBe(AUTO)
    await u1.click(within(group).getByRole('radio', { name: 'Automático' }))
    await vi.waitFor(() => expect((within(dialog).getByLabelText('Repo') as HTMLSelectElement).value).toBe('web'))
    await u1.click(within(dialog).getByRole('button', { name: 'Empezar' }))
    await vi.waitFor(() => expect(api.jira.start).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.jira.start).mock.calls[0]?.[0]).toMatchObject({ key: 'PF-10', auto: true })
    expect(vi.mocked(api.jira.proposeStart).mock.calls.at(-1)?.[3]).toBe(true)

    // Left alone it stays manual: no auto key at all.
    cleanup()
    const manual = mockApi({ issues: [issue('PF-10', 'todo')], repos, proposal })
    const again = await startDialog()
    await vi.waitFor(() => expect((within(again.dialog).getByLabelText('Repo') as HTMLSelectElement).value).toBe('web'))
    await again.user.click(within(again.dialog).getByRole('button', { name: 'Empezar' }))
    await vi.waitFor(() => expect(manual.jira.start).toHaveBeenCalledTimes(1))
    expect(vi.mocked(manual.jira.start).mock.calls[0]?.[0]).not.toHaveProperty('auto')
    cleanup()

    // Nueva tarea: same choice.
    const task = mockApi({ repos })
    const user = userEvent.setup()
    render(createElement(App))
    await user.click(rail(/Tareas/))
    await user.click(await screen.findByRole('button', { name: 'Nueva tarea' }))
    const own = await screen.findByRole('dialog', { name: 'Nueva tarea' })
    await user.type(within(own).getByLabelText('¿Qué hay que hacer?'), 'Arreglar el aviso')
    await user.selectOptions(within(own).getByLabelText('Repo'), 'web')
    await user.click(within(own).getByRole('radio', { name: 'Automático' }))
    await user.click(within(own).getByRole('button', { name: 'Empezar' }))
    await vi.waitFor(() => expect(task.ws.open).toHaveBeenCalledTimes(1))
    expect(vi.mocked(task.ws.open).mock.calls[0]).toEqual(['web', 'arreglar-el-aviso', 'claude', 'default', 'Arreglar el aviso', true])
    cleanup()

    // Nuevo trabajo: no choice without text, one as soon as there is text.
    const work = mockApi({ repos })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: '＋ Nuevo trabajo' }))
    const nw = await screen.findByRole('dialog', { name: 'Nuevo trabajo' })
    expect(within(nw).queryByRole('radiogroup')).toBeNull()
    await user.type(within(nw).getByLabelText(/¿Qué hay que hacer\?/), 'x')
    expect(within(nw).getByRole('radiogroup', { name: 'Modo' })).toBeTruthy()
    await user.click(within(nw).getByRole('radio', { name: 'Automático' }))
    await user.clear(within(nw).getByLabelText(/¿Qué hay que hacer\?/))
    expect(within(nw).queryByRole('radiogroup')).toBeNull()
    await user.type(within(nw).getByLabelText('Rama'), 'mi-rama')
    await user.selectOptions(within(nw).getByLabelText('Repo'), 'web')
    await user.click(within(nw).getByRole('button', { name: 'Empezar' }))
    await vi.waitFor(() => expect(work.ws.open).toHaveBeenCalledTimes(1))
    // Blank text means plain Claude, whatever was ticked before.
    expect(vi.mocked(work.ws.open).mock.calls[0]).toEqual(['web', 'mi-rama', 'claude', 'default'])
    cleanup()

    // The row of an automatic workspace shows Auto.
    mockApi({ workspaces: [{ ...workspace('aaaaaaa1', 'WEB-1', false), auto: true }, workspace('bbbbbbb1', 'WEB-2', false)] })
    render(createElement(App))
    const row = (await screen.findByText('WEB-1')).closest('.ws-row') as HTMLElement
    expect(within(row).getByText('Auto')).toBeTruthy()
    expect(within(screen.getByText('WEB-2').closest('.ws-row') as HTMLElement).queryByText('Auto')).toBeNull()
  })
})
