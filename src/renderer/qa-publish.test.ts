// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QaPublishResult, QaReport } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

const A = 'aaaaaaa1'
const B = 'aaaaaaa2'
const MR = 'https://github.com/acme/shop-web/pull/41'
const report = (): QaReport => ({
  change: 'add-x',
  criteria: [{ id: 'W1', text: 'Una cosa.' }],
  entries: [{ id: 'W1', status: 'pass', note: 'ok', steps: [] }],
  at: 1000,
  target: null,
  targets: [],
  note: null,
  branch: 'feat/pf-1',
  head: 'a41f9c2'
})

beforeEach(() => {
  mockSystemTheme(false)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function open(qaPublish: (id: string) => Promise<QaPublishResult>) {
  const api = mockApi({
    workspaces: [workspace(A, 'feat/pf-1', false), workspace(B, 'feat/pf-2', false)],
    qa: { [A]: { target: null, live: false, shots: [] }, [B]: { target: null, live: false, shots: [] } },
    qaReports: { [A]: report(), [B]: report() },
    qaMrs: { [A]: { url: MR } },
    qaPublish
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: 'QA' }))
  return { api, user }
}

describe('qa to the mr', () => {
  it('without an mr the button is not offered and a failure says why', async () => {
    let finish: (r: QaPublishResult) => void = () => undefined
    const answers: Array<QaPublishResult | 'wait'> = ['wait', { error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 500', fix: 'retry' }, { url: MR }]
    const { api, user } = await open(async () => {
      const next = answers.shift()!
      return next === 'wait' ? new Promise<QaPublishResult>((r) => (finish = r)) : next
    })

    // The work with an MR offers the button; main was asked by the work's id.
    const press = await screen.findByRole('button', { name: 'Publicar en la MR' })
    expect(api.qaApi.mrFor).toHaveBeenCalledWith(A)

    // A post in flight disables the button: a second press sends nothing.
    await user.click(press)
    expect((press as HTMLButtonElement).disabled).toBe(true)
    await user.click(press)
    expect(api.qaApi.publish).toHaveBeenCalledTimes(1)
    await act(async () => finish({ url: MR }))

    // Done: the link to the MR, opened the app's way, and the button asks again.
    const link = await screen.findByRole('button', { name: 'Publicado en la MR' })
    await user.click(link)
    expect(api.mrApi.open).toHaveBeenCalledWith(MR)
    const again = screen.getByRole('button', { name: 'Publicar de nuevo' })
    expect((again as HTMLButtonElement).disabled).toBe(false)

    // A failure is W150's problem with its fix; nothing more is posted until the fix is pressed.
    await user.click(again)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('GitHub está fallando ahora mismo.')
    expect(alert.textContent).toContain('La QA no ha llegado a la MR.')
    expect((within(alert).getByText('HTTP 500').closest('details') as HTMLDetailsElement).open).toBe(false)
    expect(screen.queryByText('Publicado en la MR')).toBeNull()
    expect(api.qaApi.publish).toHaveBeenCalledTimes(2)
    await user.click(within(alert).getByRole('button', { name: 'Volver a comprobar' }))
    expect(api.qaApi.publish).toHaveBeenCalledTimes(3)
    await screen.findByRole('button', { name: 'Publicado en la MR' })
    expect(screen.queryByRole('alert')).toBeNull()

    // A work without an MR says what to do instead of offering the button.
    await user.click(screen.getByRole('button', { name: /feat\/pf-2/ }))
    await screen.findByText('Abre la MR para poder publicar aquí la QA.')
    expect(screen.queryByRole('button', { name: /Publicar/ })).toBeNull()
    expect(api.qaApi.publish).toHaveBeenCalledTimes(3)
  })
})
