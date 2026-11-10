// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const item = (branch: string): HTMLElement =>
  Array.from(document.querySelectorAll<HTMLElement>('.ws-item')).find((i) => i.querySelector('.ws-branch')?.textContent === branch)!
const replies = (branch: string): HTMLElement | null => within(item(branch)).queryByRole('group', { name: 'Respuestas rápidas' })
const labels = (branch: string): string[] => Array.from(replies(branch)?.querySelectorAll('button') ?? []).map((b) => b.textContent ?? '')

describe('quick replies', () => {
  it('a waiting row answers with one press', async () => {
    const user = userEvent.setup()
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2'), workspace('aaaaaaa3', 'PF-3'), workspace('aaaaaaa4', 'PF-4')],
      states: { aaaaaaa1: 'needs-you', aaaaaaa2: 'needs-you', aaaaaaa3: 'needs-you', aaaaaaa4: 'working' },
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
})
