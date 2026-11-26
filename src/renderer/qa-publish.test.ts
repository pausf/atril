// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QaPrepared, QaPublishResult, QaReport } from '../preload/api'
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

async function open(qaPublish: (id: string, token?: string) => Promise<QaPublishResult>, qaPrepare?: (id: string) => Promise<QaPrepared>) {
  const api = mockApi({
    workspaces: [workspace(A, 'feat/pf-1', false), workspace(B, 'feat/pf-2', false)],
    qa: { [A]: { target: null, live: false, shots: [] }, [B]: { target: null, live: false, shots: [] } },
    qaReports: { [A]: report(), [B]: report() },
    qaMrs: { [A]: { url: MR } },
    qaPublish,
    ...(qaPrepare && { qaPrepare })
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

  it('the sheet shows what goes and what is blocked before sending', async () => {
    const SRC = 'data:image/png;base64,iVBORw0KGgo='
    const sheets: QaPrepared[] = [
      {
        token: 'tok1',
        rows: [
          { id: 'W1', status: 'pass', view: 'home', verdict: 'send', src: SRC },
          { id: 'W2', status: 'fail', verdict: 'blocked', reason: 'host' }
        ]
      },
      { token: 'tok1', rows: [{ id: 'W1', status: 'pass', verdict: 'send', src: SRC }] },
      { token: 'tok2', rows: [{ id: 'W1', status: 'pass', verdict: 'send', src: SRC }] },
      { token: 'tok3', rows: [{ id: 'W1', status: 'pass', verdict: 'blocked', reason: 'path' }] }
    ]
    let ready: () => void = () => undefined
    const gate = new Promise<void>((r) => (ready = r))
    let first = true
    const answers: QaPublishResult[] = [
      { error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 500', fix: 'retry' },
      { error: 'La descripción de la MR ha cambiado: publica otra vez', fix: 'recheck' },
      { url: MR },
      { url: MR }
    ]
    const { api, user } = await open(
      async () => answers.shift()!,
      async () => {
        if (first) {
          first = false
          await gate
        }
        return sheets.shift()!
      }
    )

    // Preparing: the button is disabled and says so; a second press prepares nothing more.
    await user.click(await screen.findByRole('button', { name: 'Publicar en la MR' }))
    const waiting = screen.getByRole('button', { name: 'Revisando las capturas…' })
    expect((waiting as HTMLButtonElement).disabled).toBe(true)
    await user.click(waiting)
    expect(api.qaApi.preparePublish).toHaveBeenCalledTimes(1)
    await act(async () => ready())

    // The sheet: each picture as it would leave, the blocked one with why; Escape sends nothing.
    let sheet = await screen.findByRole('dialog', { name: 'Lo que irá a la MR' })
    const img = within(sheet).getByRole('img', { name: 'W1' }) as HTMLImageElement
    expect(img.src).toBe(SRC)
    expect(sheet.textContent).toContain('Se envía')
    expect(sheet.textContent).toContain('No se envía: muestra una dirección de servidor')
    expect(within(sheet).queryByRole('img', { name: 'W2' })).toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.qaApi.publish).not.toHaveBeenCalled()

    // Sending: one picture is singular; a forge failure keeps the sheet and retries with the same token.
    await user.click(screen.getByRole('button', { name: 'Publicar en la MR' }))
    sheet = await screen.findByRole('dialog', { name: 'Lo que irá a la MR' })
    await user.click(within(sheet).getByRole('button', { name: 'Enviar 1 imagen' }))
    expect(api.qaApi.publish).toHaveBeenLastCalledWith(A, 'tok1')
    let alert = await within(sheet).findByRole('alert')
    expect(alert.textContent).toContain('GitHub está fallando ahora mismo.')
    await user.click(within(alert).getByRole('button', { name: 'Volver a comprobar' }))
    expect(api.qaApi.publish).toHaveBeenLastCalledWith(A, 'tok1')

    // The description changed: «Revisar otra vez» prepares again, and the new token is the one sent.
    alert = await within(sheet).findByRole('alert')
    expect(alert.textContent).toContain('La descripción de la MR ha cambiado')
    await user.click(within(alert).getByRole('button', { name: 'Revisar otra vez' }))
    expect(api.qaApi.preparePublish).toHaveBeenCalledTimes(3)
    sheet = await screen.findByRole('dialog', { name: 'Lo que irá a la MR' })
    await user.click(within(sheet).getByRole('button', { name: 'Enviar 1 imagen' }))
    expect(api.qaApi.publish).toHaveBeenLastCalledWith(A, 'tok2')
    await screen.findByRole('button', { name: 'Publicado en la MR' })
    expect(screen.queryByRole('dialog')).toBeNull()

    // Every picture blocked: the sheet offers the comment as today.
    await user.click(screen.getByRole('button', { name: 'Publicar de nuevo' }))
    sheet = await screen.findByRole('dialog', { name: 'Lo que irá a la MR' })
    expect(sheet.textContent).toContain('No se envía: muestra una ruta de tu disco')
    await user.click(within(sheet).getByRole('button', { name: 'Publicar sin imágenes' }))
    expect(api.qaApi.publish).toHaveBeenLastCalledWith(A, 'tok3')
  })
})
