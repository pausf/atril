// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '../mockApi'
import { Ajustes } from '../settings/Ajustes'
import { UiProvider } from '../ui'
import { CrashBoundary } from './Boundary'
import { installWindowCrash } from './window'

afterEach(cleanup)

function Broken(): never {
  throw new Error('render broke')
}

describe('window crashes', () => {
  it("the window reports its errors and the boundary offers a reload", async () => {
    mockApi()
    const send = vi.fn()
    const off = installWindowCrash(window, send)
    const err = new Error('listener broke')
    window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }))
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new TypeError('promise broke') }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'plain' }))
    expect(send.mock.calls.map((c) => c[0])).toEqual([
      { message: 'listener broke', stack: err.stack },
      { message: 'Script error.', stack: '' },
      { message: 'promise broke', stack: expect.stringContaining('promise broke') },
      { message: 'plain', stack: '' }
    ])
    off()
    window.dispatchEvent(new ErrorEvent('error', { message: 'after' }))
    expect(send).toHaveBeenCalledTimes(4)

    // The boundary sends what it catches through preload and offers a reload.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reload = vi.fn()
    render(
      <CrashBoundary onReload={reload}>
        <Broken />
      </CrashBoundary>
    )
    quiet.mockRestore()
    expect(screen.getByText('Algo ha fallado en esta pantalla.')).toBeTruthy()
    expect(window.atril.crash.report).toHaveBeenCalledWith({ message: 'render broke', stack: expect.stringContaining('render broke') })
    await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

describe('Fallos card', () => {
  it("the Fallos card asks before sending and shows the last send", async () => {
    const m = mockApi()
    render(
      <UiProvider>
        <Ajustes />
      </UiProvider>
    )
    // S47: first column, after «Repos».
    const card = await screen.findByRole('region', { name: 'Fallos' })
    const firstCol = document.querySelector('.ajustes-col')!
    expect([...firstCol.querySelectorAll(':scope > section > h3')].map((h) => h.textContent)).toEqual(['Conexiones', 'Repos', 'Fallos'])
    expect(within(card).getByText('Si Atril falla de una forma que no esperaba, puede abrir un PR en el proyecto con el error, sin tus datos.')).toBeTruthy()
    const sw = within(card).getByRole('switch', { name: 'Enviar los fallos a GitHub como PR' })
    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('false'))
    // No GitHub saved.
    await within(card).findByText('Conecta GitHub en Conexiones para enviarlos.')

    // Turning it on asks first; «Cancelar» leaves it off.
    await userEvent.click(sw)
    let dialog = screen.getByRole('dialog', { name: '¿Enviar los fallos a GitHub?' })
    expect(
      within(dialog).getByText(
        'Se envía: el error, su traza, la versión de Atril y de macOS. Se quitan tus rutas, tokens, correos, direcciones de servidores, claves de Jira y lo que va entre comillas; la limpieza es automática y puede dejarse algo. Va con tu cuenta de GitHub como un issue en pausf/atril, que es público: cualquiera puede leerlo; el proyecto lo convierte en PR.'
      )
    ).toBeTruthy()
    expect(sw.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(sw.getAttribute('aria-checked')).toBe('false')
    expect(m.ui.set).not.toHaveBeenCalledWith(expect.objectContaining({ crashReports: 'on' }))

    // «Activar» saves it on.
    await userEvent.click(sw)
    dialog = screen.getByRole('dialog', { name: '¿Enviar los fallos a GitHub?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Activar' }))
    expect(m.ui.set).toHaveBeenCalledWith({ crashReports: 'on' })
    expect(m.stored.crashReports).toBe('on')
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('dialog')).toBeNull()
    // Off again, without asking.
    await userEvent.click(sw)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(m.stored.crashReports).toBeUndefined()
    cleanup()

    // With GitHub and a sent PR: the link opens it.
    const sent = mockApi({ forges: { github: { saved: true, account: 'pau' } }, ui: { crashReports: 'on', crashLast: { at: Date.now() - 5 * 60_000, url: 'https://github.com/pausf/atril/pull/7' } } })
    render(
      <UiProvider>
        <Ajustes />
      </UiProvider>
    )
    const card2 = await screen.findByRole('region', { name: 'Fallos' })
    await waitFor(() => expect(within(card2).getByRole('switch').getAttribute('aria-checked')).toBe('true'))
    const link = await within(card2).findByRole('button', { name: 'Último fallo enviado: hace 5 min' })
    await waitFor(() => expect(within(card2).queryByText('Conecta GitHub en Conexiones para enviarlos.')).toBeNull())
    await userEvent.click(link)
    expect(window.atril.crash.openLast).toHaveBeenCalledTimes(1)
    expect(sent.stored.crashReports).toBe('on')
    cleanup()

    // A failed send says why.
    mockApi({ forges: { github: { saved: true, account: 'pau' } }, ui: { crashReports: 'on', crashLast: { at: Date.now(), error: 'Not Found' } } })
    render(
      <UiProvider>
        <Ajustes />
      </UiProvider>
    )
    const card3 = await screen.findByRole('region', { name: 'Fallos' })
    expect(await within(card3).findByText('No he podido enviar el último fallo: Not Found.')).toBeTruthy()
  })
})
