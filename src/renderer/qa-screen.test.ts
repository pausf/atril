// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QaEntry, QaPlatform, QaReport, QaShot, QaTarget } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

const png = (name: string): string => `data:image/png;base64,${btoa(name)}`
const shot = (name: string, at: number): QaShot => ({ name, at, src: png(name) })

const W1 = 'Cuando el pedido cae en festivo nacional, la fecha prometida salta al siguiente día laborable.'
const W2 = 'Donde la provincia tiene festivo propio, se respeta además del nacional.'
const W3 = 'Si la provincia está vacía, el checkout pide elegirla antes de pagar.'
const pass: QaEntry = {
  id: 'W1',
  status: 'pass',
  note: 'ok',
  steps: [
    { text: 'Abrir /checkout', ms: 1200, shot: 'a.png', shotAt: 1 },
    { text: 'Pagar con tarjeta de prueba', ms: 3100 },
    { text: 'Leer la fecha prometida', ms: 600, shot: 'b.png', shotAt: 2 }
  ]
}
const fail: QaEntry = {
  id: 'W2',
  status: 'fail',
  note: 'esperaba sábado 14, sale viernes 13',
  steps: [
    { text: 'Abrir /checkout', ms: 1200 },
    { text: 'Elegir la provincia Madrid', ms: 800, shot: 'a.png', shotAt: 1 },
    { text: 'Comprobar: sábado 14, sale viernes 13', ms: 400, shot: 'c.png', shotAt: 3 }
  ]
}
const WHY = 'Hay un package.json con el script dev'
const tg = (platform: QaPlatform, dir = '', source: QaTarget['source'] = 'detected', why = WHY): QaTarget => ({ key: `${platform}:${dir}`, platform, dir, command: 'pnpm run dev', why, source })
const WEB = [tg('chrome'), tg('safari')]
const report = (over: Partial<QaReport> = {}): QaReport => ({
  change: 'add-delivery-holidays',
  criteria: [{ id: 'W1', text: W1 }, { id: 'W2', text: W2 }, { id: 'W3', text: W3 }],
  entries: [pass, fail],
  at: 1000,
  target: WEB[0]!,
  targets: WEB,
  note: null,
  branch: 'feat/pf-1',
  head: 'a41f9c2',
  ...over
})
const status = (live = false) => ({ target: WEB[0]!, live, shots: [shot('c.png', 3), shot('b.png', 2), shot('a.png', 1)] })
const A = 'aaaaaaa1'

beforeEach(() => {
  mockSystemTheme(false)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function open(o: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({
    workspaces: [workspace(A, 'feat/pf-1', false), workspace('aaaaaaa2', 'feat/pf-2', false), workspace('aaaaaaa3', 'feat/pf-3', false)],
    qa: { [A]: status(), aaaaaaa2: { target: tg('android'), live: false, shots: [] }, aaaaaaa3: { target: null, live: false, shots: [] } },
    qaReports: {
      [A]: report(),
      aaaaaaa2: report({ target: tg('android'), targets: [tg('android')], criteria: [], entries: [], change: null }),
      aaaaaaa3: report({ target: null, targets: [], criteria: [], entries: [], change: null })
    },
    ...o
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: 'QA' }))
  return { api, user }
}
const rowOf = (id: string): HTMLElement => screen.getByText(id, { selector: '.qa-id' }).closest('li') as HTMLElement
const settle = async (ms = 0): Promise<void> => void (await act(() => vi.advanceTimersByTimeAsync(ms)))

describe('qa screen', () => {
  it('the QA screen reports each criterion', async () => {
    const { api, user } = await open()

    // The rail entry sits between Libretto and Avisos.
    const names = screen.getAllByRole('navigation', { name: 'Pantallas' })[0]!.textContent
    expect(names).toMatch(/Libretto\s*QA\s*Avisos/)

    // A card per workspace names its chosen target or «sin detectar»; the picked one is pressed.
    const cards = within(await screen.findByRole('group', { name: 'Trabajos' }))
    expect(cards.getAllByRole('button').map((b) => b.textContent)).toEqual(['feat/pf-1 Chrome', 'feat/pf-2 Android', 'feat/pf-3 sin detectar'])
    expect(cards.getByRole('button', { name: /pf-1/ }).getAttribute('aria-pressed')).toBe('true')
    expect(cards.getByRole('button', { name: /pf-2/ }).getAttribute('aria-pressed')).toBe('false')

    // Each criterion of the change with its id, text and a word: last entry per id, absent is «Sin probar».
    await screen.findByText(W1)
    expect(rowOf('W1').textContent).toContain(W1)
    expect(within(rowOf('W1')).getByText('Pasa')).toBeTruthy()
    expect(within(rowOf('W2')).getByText('Falla')).toBeTruthy()
    expect(within(rowOf('W3')).getByText('Sin probar')).toBeTruthy()
    expect(within(document.querySelector<HTMLElement>('.qa-screen')!).getByText('Cambio: add-delivery-holidays')).toBeTruthy()
    expect(document.querySelector('.qa-sum')!.textContent).toBe('1 pasa · 1 falla · 1 sin probar')

    // The newest screenshots of the QA folder, as the data URLs main sent.
    const all = within(screen.getByRole('region', { name: 'Todas las capturas' }))
    expect((all.getAllByRole('img') as HTMLImageElement[]).map((i) => [i.alt, i.src])).toEqual([['c.png', png('c.png')], ['b.png', png('b.png')], ['a.png', png('a.png')]])
    await user.click(all.getByRole('button', { name: /c\.png/ }))
    const big = await screen.findByRole('dialog', { name: /c\.png/ })
    expect((within(big).getByRole('img') as HTMLImageElement).src).toBe(png('c.png'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // W123's tabs and the reason under them.
    expect(within(screen.getByRole('group', { name: 'Objetivos' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['Chrome', 'Safari'])
    expect(screen.getByText(WHY)).toBeTruthy()

    // «Probar en vivo» launches the chosen target (W84); it turns into «Detener QA» and back.
    await user.click(screen.getByRole('button', { name: 'Probar en vivo' }))
    expect(api.qaApi.launch).toHaveBeenCalledWith(A, 'chrome:')
    await user.click(await screen.findByRole('button', { name: 'Detener QA' }))
    expect(api.qaApi.stop).toHaveBeenCalledWith(A)
    await screen.findByRole('button', { name: 'Probar en vivo' })

    // No criteria: a sentence, no list and no summary.
    await user.click(cards.getByRole('button', { name: /pf-2/ }))
    await screen.findByText('Este trabajo no tiene criterios que probar')
    expect(document.querySelector('.qa-sum')).toBeNull()
    expect(screen.queryByText(W1)).toBeNull()

    // Not detected: W126's lines instead of «Probar en vivo».
    await user.click(cards.getByRole('button', { name: /pf-3/ }))
    await screen.findByText('No sé cómo abrir este proyecto')
    expect(screen.queryByRole('button', { name: 'Probar en vivo' })).toBeNull()
  })

  it('the QA screen follows the report every 3 seconds and keeps slow answers', async () => {
    const { api } = await open()
    await screen.findByText(W1)
    expect(within(rowOf('W3')).getByText('Sin probar')).toBeTruthy()

    // A new report arrives with the next poll.
    api.setReport(A, report({ entries: [pass, fail, { id: 'W3', status: 'pass', note: '', steps: [] }], at: 2000 }))
    await settle(3000)
    await waitFor(() => expect(within(rowOf('W3')).getByText('Pasa')).toBeTruthy())

    // A report that takes 4 s to answer (longer than the poll) still lands.
    const next = report({ entries: [{ ...fail, status: 'pass' }], at: 3000 })
    vi.mocked(api.qaApi.report).mockImplementation(() => new Promise((r) => setTimeout(() => r(next), 4000)))
    await settle(3000)
    await settle(4500)
    await waitFor(() => expect(within(rowOf('W2')).getByText('Pasa')).toBeTruthy())
    expect(within(rowOf('W1')).getByText('Sin probar')).toBeTruthy()
  })

  it('a criterion shows how it was tested', async () => {
    const { user } = await open()
    await screen.findByText(W1)

    // Only a criterion with steps offers it.
    expect(within(rowOf('W3')).queryByRole('button', { name: 'Ver cómo' })).toBeNull()
    const how = within(rowOf('W2')).getByRole('button', { name: 'Ver cómo' })
    await user.click(how)
    const dialog = await screen.findByRole('dialog', { name: /W2/ })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(dialog)

    // The steps with their duration; the failing one (the last) marked with a word.
    const steps = within(dialog).getAllByRole('listitem').map((li) => li.textContent)
    expect(steps[0]).toContain('Abrir /checkout')
    expect(steps[0]).toContain('1,2 s')
    expect(steps[1]).toContain('0,8 s')
    expect(steps[2]).toContain('Comprobar: sábado 14, sale viernes 13')
    expect(steps[2]).toContain('Falló aquí')
    expect(steps[0]).not.toContain('Falló aquí')

    // The screenshots in a strip (only steps with one), the failing step's large to begin with.
    const strip = within(within(dialog).getByRole('group', { name: 'Capturas' }))
    expect(strip.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Paso 2: Elegir la provincia Madrid', 'Paso 3: Comprobar: sábado 14, sale viernes 13'])
    expect((within(dialog).getByRole('img', { name: /Paso 3/ }) as HTMLImageElement).src).toBe(png('c.png'))
    await user.click(strip.getByRole('button', { name: /Paso 2/ }))
    expect((within(dialog).getByRole('img', { name: /Paso 2/ }) as HTMLImageElement).src).toBe(png('a.png'))
    // A step with no screenshot says so instead of a stale picture.
    await user.click(within(dialog).getByRole('button', { name: /Abrir \/checkout/ }))
    expect(within(dialog).queryByRole('img')).toBeNull()
    expect(within(dialog).getByText('Sin captura de este paso')).toBeTruthy()

    // Escape closes it and focus returns to the button that opened it.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(how)

    // «Cerrar» too; a passing criterion marks no step as failing.
    await user.click(within(rowOf('W1')).getByRole('button', { name: 'Ver cómo' }))
    const pass1 = await screen.findByRole('dialog', { name: /W1/ })
    expect(pass1.textContent).not.toContain('Falló aquí')
    await user.click(within(pass1).getAllByRole('button', { name: 'Cerrar' }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('a failed criterion becomes a bug', async () => {
    const jira = { saved: true, account: 'Pau', site: 'https://x.atlassian.net', board: { id: 1, name: 'SHOP' } }
    const { api, user } = await open({ jira })
    await screen.findByText(W1)

    // Only a failed criterion offers it.
    expect(within(rowOf('W1')).queryByRole('button', { name: 'Marcar como bug' })).toBeNull()
    expect(within(rowOf('W3')).queryByRole('button', { name: 'Marcar como bug' })).toBeNull()
    const open1 = within(rowOf('W2')).getByRole('button', { name: 'Marcar como bug' })
    await user.click(open1)
    const form = await screen.findByRole('dialog', { name: 'Marcar como bug' })

    // Prefilled: title, steps, environment, criterion; all of it editable.
    const title = within(form).getByLabelText('Título') as HTMLInputElement
    expect(title.value).toBe('QA feat/pf-1: esperaba sábado 14, sale viernes 13')
    const steps = within(form).getByLabelText('Pasos') as HTMLTextAreaElement
    expect(steps.value).toBe('1. Abrir /checkout\n2. Elegir la provincia Madrid\n3. Comprobar: sábado 14, sale viernes 13')
    expect((within(form).getByLabelText('Entorno') as HTMLInputElement).value).toBe('Chrome · feat/pf-1 · a41f9c2')
    expect((within(form).getByLabelText('Criterio') as HTMLTextAreaElement).value).toBe(`W2: ${W2}`)
    await user.clear(title)
    await user.type(title, 'QA: la fecha sale mal')

    // «Crear en Jira»: one issue with the edited title and the rest as the description; «Creada {KEY}».
    await user.click(await within(form).findByRole('button', { name: 'Crear en Jira' }))
    expect(api.qaApi.bug).toHaveBeenCalledTimes(1)
    expect(api.qaApi.bug).toHaveBeenCalledWith(A, {
      to: 'jira',
      title: 'QA: la fecha sale mal',
      body: `Criterio: W2: ${W2}\n\nPasos:\n${steps.value}\n\nEntorno: Chrome · feat/pf-1 · a41f9c2`
    })
    expect((await within(form).findByRole('status')).textContent).toBe('Creada QA-1')
    expect((within(form).getByRole('button', { name: 'Crear en Jira' }) as HTMLButtonElement).disabled).toBe(true)

    // «Cerrar» closes the form and focus returns to the button that opened it.
    await user.click(within(form).getAllByRole('button', { name: 'Cerrar' })[0]!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(open1)
  })

  it('a bug reaches the agent or says why not', async () => {
    const { api, user } = await open({ jira: { saved: true }, qaBug: { error: 'Jira respondió 400.' } })
    await screen.findByText(W1)
    await user.click(within(rowOf('W2')).getByRole('button', { name: 'Marcar como bug' }))
    const form = await screen.findByRole('dialog', { name: 'Marcar como bug' })

    // No board saved: no Jira button.
    await settle(0)
    expect(within(form).queryByRole('button', { name: 'Crear en Jira' })).toBeNull()

    // The agent: refused, the error shows and the form stays open.
    await user.click(within(form).getByRole('button', { name: 'Pasar al agente del trabajo' }))
    expect(api.qaApi.bug).toHaveBeenCalledWith(A, expect.objectContaining({ to: 'agent' }))
    expect((await within(form).findByRole('alert')).textContent).toBe('Jira respondió 400.')
    expect(screen.getByRole('dialog', { name: 'Marcar como bug' })).toBe(form)
    expect((within(form).getByRole('button', { name: 'Pasar al agente del trabajo' }) as HTMLButtonElement).disabled).toBe(false)

    // Sent: «Enviado al agente», and it cannot go twice.
    vi.mocked(api.qaApi.bug).mockResolvedValue({ ok: true })
    await user.click(within(form).getByRole('button', { name: 'Pasar al agente del trabajo' }))
    expect((await within(form).findByRole('status')).textContent).toBe('Enviado al agente')
    expect((within(form).getByRole('button', { name: 'Pasar al agente del trabajo' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.qaApi.bug).toHaveBeenCalledTimes(2)
  })

  it('testing a criterion reads Probando until the report answers', async () => {
    const { api, user } = await open()
    await screen.findByText(W1)

    // «Probar este»: main is asked for just that criterion, and it reads «Probando…» instead of its status.
    await user.click(within(rowOf('W3')).getByRole('button', { name: 'Probar este' }))
    expect(api.qaApi.retest).toHaveBeenCalledWith(A, 'W3')
    expect(within(rowOf('W3')).getByText('Probando…')).toBeTruthy()
    expect(within(rowOf('W3')).queryByText('Sin probar')).toBeNull()
    expect(within(rowOf('W1')).getByText('Pasa')).toBeTruthy()

    // It outlives a visit to another screen.
    await user.click(screen.getByRole('button', { name: 'Trabajo' }))
    await user.click(screen.getByRole('button', { name: 'QA' }))
    expect(await within(rowOf('W3')).findByText('Probando…')).toBeTruthy()

    // The report brings an entry written after the request: it ends, repeated status or not.
    await settle(3000)
    expect(within(rowOf('W3')).getByText('Probando…')).toBeTruthy()
    api.setReport(A, report({ entries: [pass, fail, { id: 'W3', status: 'untested', note: 'sin correo', steps: [] }], at: Date.now() + 10 }))
    await settle(3000)
    await waitFor(() => expect(within(rowOf('W3')).queryByText('Probando…')).toBeNull())
    expect(within(rowOf('W3')).getByText('Sin probar')).toBeTruthy()

    // «Reprobar todo»: every criterion reads «Probando…».
    api.setReport(A, report())
    await user.click(screen.getByRole('button', { name: 'Reprobar todo' }))
    expect(api.qaApi.retest).toHaveBeenLastCalledWith(A, null)
    for (const id of ['W1', 'W2', 'W3']) expect(within(rowOf(id)).getByText('Probando…')).toBeTruthy()

    // Nothing answers for 5 minutes: back to the previous status.
    api.setQa(A, status(true))
    await settle(3000)
    await settle(5 * 60 * 1000)
    await waitFor(() => expect(within(rowOf('W1')).getByText('Pasa')).toBeTruthy())
    expect(within(rowOf('W2')).getByText('Falla')).toBeTruthy()
  })

  it('a refused test shows why and nothing reads Probando', async () => {
    const { user } = await open({ qaRetest: { error: 'Para probar en vivo falta: adb' } })
    await screen.findByText(W1)
    await user.click(within(rowOf('W3')).getByRole('button', { name: 'Probar este' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/adb/)
    expect(screen.queryByText('Probando…')).toBeNull()
  })

  it('the QA pane dying ends Probando', async () => {
    const { api, user } = await open()
    api.setQa(A, status(true))
    await settle(3000)
    await screen.findByText(W1)
    await user.click(within(rowOf('W3')).getByRole('button', { name: 'Probar este' }))
    await settle(3000)
    expect(within(rowOf('W3')).getByText('Probando…')).toBeTruthy()
    api.setQa(A, status(false))
    await settle(3000)
    await waitFor(() => expect(within(rowOf('W3')).queryByText('Probando…')).toBeNull())
    expect(within(rowOf('W3')).getByText('Sin probar')).toBeTruthy()
  })
  it('targets show as tabs remembered per repo', async () => {
    const MONO = [tg('chrome', 'apps/web'), tg('safari', 'apps/web'), tg('android', 'apps/mobile', 'detected', 'Hay un app.json de Expo')]
    const NOTE = '.atril/qa.json no se entiende: uso lo que detecto'
    const { api, user } = await open({
      qaReports: { [A]: report({ target: MONO[0]!, targets: MONO, note: NOTE }), aaaaaaa2: report({ target: MONO[0]!, targets: MONO }), aaaaaaa3: report({ target: null, targets: [] }) }
    })
    await screen.findByText(W1)
    const tabs = (): HTMLElement[] => within(screen.getByRole('group', { name: 'Objetivos' })).getAllByRole('button')

    // One tab per target, the folder after «·»; the chosen one pressed; its reason and W121's line under them.
    expect(tabs().map((b) => b.textContent)).toEqual(['Chrome · apps/web', 'Safari · apps/web', 'Android · apps/mobile'])
    expect(tabs().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
    expect(screen.getByText(WHY)).toBeTruthy()
    expect(screen.getByText(NOTE)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull()

    // Pressing a tab saves it for the repo; «Probar en vivo» launches that one.
    await user.click(screen.getByRole('button', { name: 'Android · apps/mobile' }))
    expect(api.qaApi.choose).toHaveBeenCalledWith(A, 'android:apps/mobile')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Android · apps/mobile' }).getAttribute('aria-pressed')).toBe('true'))
    expect(screen.getByText('Hay un app.json de Expo')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Probar en vivo' }))
    expect(api.qaApi.launch).toHaveBeenLastCalledWith(A, 'android:apps/mobile')

    // A later card of the same repo opens on it.
    await user.click(within(screen.getByRole('group', { name: 'Trabajos' })).getByRole('button', { name: /pf-2/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Android · apps/mobile' }).getAttribute('aria-pressed')).toBe('true'))

    // «Elegir a mano»: refused with main's sentence, then saved as one more tab with «Quitar».
    await user.click(screen.getByRole('button', { name: 'Elegir a mano' }))
    const form = screen.getByRole('form', { name: 'Elegir a mano' })
    await user.selectOptions(within(form).getByLabelText('Plataforma'), 'safari')
    await user.type(within(form).getByLabelText('Carpeta'), 'apps/nope')
    await user.type(within(form).getByLabelText('Comando'), 'pnpm dev')
    vi.mocked(api.qaApi.manual).mockResolvedValueOnce({ error: 'La carpeta apps/nope no existe en este trabajo' })
    await user.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(api.qaApi.manual).toHaveBeenCalledWith('aaaaaaa2', { platform: 'safari', dir: 'apps/nope', command: 'pnpm dev' })
    expect((await within(form).findByRole('alert')).textContent).toBe('La carpeta apps/nope no existe en este trabajo')
    await user.clear(within(form).getByLabelText('Carpeta'))
    await user.type(within(form).getByLabelText('Carpeta'), 'apps/admin')
    await user.click(within(form).getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Safari · apps/admin' }))
    expect(screen.queryByRole('form', { name: 'Elegir a mano' })).toBeNull()
    expect(await screen.findByText('Lo elegiste a mano')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(api.qaApi.unmanual).toHaveBeenCalledWith('aaaaaaa2', 'safari:apps/admin')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Safari · apps/admin' })).toBeNull())
  })

  it('a launch problem shows its fix and detail folded', async () => {
    const problem = { what: 'No tienes ningún emulador de Android', cant: 'No puedes probar en Android hasta que crees uno', fix: 'create-avd' as const, detail: 'emulator -list-avds no devolvió ninguno' }
    const { api, user } = await open({ qaLaunch: { error: problem.what, problem } })
    await screen.findByText(W1)

    // What happened and what cannot be done, in words; a button with the fix; the detail folded.
    await user.click(screen.getByRole('button', { name: 'Probar en vivo' }))
    const box = (await screen.findByText(problem.what)).closest('.problem') as HTMLElement
    expect(box.textContent).toContain(problem.cant)
    const details = box.querySelector('details')!
    expect(details.open).toBe(false)
    expect(within(details).getByText('Ver detalle')).toBeTruthy()
    expect(details.textContent).toContain(problem.detail)
    expect(document.querySelectorAll('.qa-err')).toHaveLength(0)
    expect(screen.getAllByText(problem.what)).toHaveLength(1)

    // The fix goes to main by name only.
    await user.click(within(box).getByRole('button', { name: 'Crear un Pixel 8' }))
    expect(api.qaApi.fix).toHaveBeenCalledWith(A, 'create-avd')

    // «Ver el otro QA» opens the workspace main answers.
    vi.mocked(api.qaApi.launch).mockResolvedValueOnce({ error: 'x', problem: { ...problem, fix: 'open-workspace' } })
    vi.mocked(api.qaApi.fix).mockResolvedValueOnce({ ok: true, open: 'aaaaaaa2' })
    await user.click(screen.getByRole('button', { name: 'Probar en vivo' }))
    await user.click(await screen.findByRole('button', { name: 'Ver el otro QA' }))
    const cards = within(screen.getByRole('group', { name: 'Trabajos' }))
    await waitFor(() => expect(cards.getByRole('button', { name: /pf-2/ }).getAttribute('aria-pressed')).toBe('true'))

    // «Elegir a mano» is the window's own: it opens the form and main is not asked.
    await user.click(cards.getByRole('button', { name: /pf-1/ }))
    await screen.findByText(W1)
    vi.mocked(api.qaApi.launch).mockResolvedValueOnce({ error: 'x', problem: { ...problem, fix: 'pick-manual' } })
    await user.click(screen.getByRole('button', { name: 'Probar en vivo' }))
    const fixes = vi.mocked(api.qaApi.fix).mock.calls.length
    await user.click(within((await screen.findByText(problem.what)).closest('.problem') as HTMLElement).getByRole('button', { name: 'Elegir a mano' }))
    expect(screen.getByRole('form', { name: 'Elegir a mano' })).toBeTruthy()
    expect(api.qaApi.fix).toHaveBeenCalledTimes(fixes)

    // No target: the sentence, where it looked, and «Elegir a mano», yet its report and screenshots still show.
    await user.click(cards.getByRole('button', { name: /pf-3/ }))
    api.setReport('aaaaaaa3', report({ target: null, targets: [] }))
    api.setQa('aaaaaaa3', { target: null, live: false, shots: [shot('c.png', 3)] })
    await settle(3000)
    await screen.findByText('No sé cómo abrir este proyecto')
    expect(screen.getByText('Busqué package.json con dev, start o preview, app.json de Expo, pubspec.yaml, settings.gradle, .xcodeproj o Package.swift, en la raíz y dos niveles')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Elegir a mano' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Probar en vivo' })).toBeNull()
    await waitFor(() => expect(within(rowOf('W2')).getByText('Falla')).toBeTruthy())
    expect(within(rowOf('W2')).getByRole('button', { name: 'Ver cómo' })).toBeTruthy()
    expect(within(rowOf('W2')).getByRole('button', { name: 'Marcar como bug' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Todas las capturas' })).getAllByRole('img')).toHaveLength(1)
  })
})
