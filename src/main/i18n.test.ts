import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLang, translate } from '../preload/i18n'
import { cleanTmp, tmp } from './test-helpers'

vi.mock('electron', () => ({ Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() } }))

afterEach(cleanTmp)

describe('main language', () => {
  it('the language choice survives a restart', async () => {
    process.env['ATRIL_HOME'] = tmp()
    const { patchUi, readUi } = await import('./ui')
    expect((await readUi()).language).toBe('system')
    for (const choice of ['en', 'es', 'system'] as const) {
      await patchUi({ language: choice })
      expect((await readUi()).language).toBe(choice)
    }
    await patchUi({ language: 'fr' })
    expect((await readUi()).language).toBe('system')
  })

  it('main speaks the chosen language', async () => {
    expect(resolveLang('system', 'es-ES')).toBe('es')
    expect(resolveLang('system', 'en-GB')).toBe('en')
    expect(resolveLang('system', 'ca-ES')).toBe('en')
    expect(resolveLang('en', 'es-ES')).toBe('en')

    const { setLang } = await import('./lang')
    const { menuTemplate } = await import('./menu')
    const { replyGone, replyPlaceholder } = await import('./status')
    const deps = { selected: 'x', count: 2, nextEnabled: true, split: () => undefined, send: () => undefined }
    const labels = (): string[] => menuTemplate(deps).flatMap((m) => [m.label ?? '', ...((m.submenu as { label?: string }[] | undefined) ?? []).map((s) => s.label ?? '')]).filter(Boolean)

    setLang('en')
    expect(labels()).toEqual(expect.arrayContaining(['Edit', 'Work', 'Split right', 'Next', 'Work 1', 'Tutorial']))
    expect(labels().some((l) => /[áéíóúñ]|Dividir|Trabajo/.test(l))).toBe(false)
    expect(replyGone()).toBe('Could not send: that workspace is gone')
    expect(replyPlaceholder()).toBe('Reply to Claude…')
    // Foreign text rides in {detail} untouched.
    expect(translate('en', 'No se pudo enviar: ese trabajo ya no está', { detail: 'fatal: ruta inválida' })).toBe('Could not send: that workspace is gone')

    setLang('es')
    expect(labels()).toEqual(expect.arrayContaining(['Edición', 'Trabajo', 'Dividir a la derecha']))
    expect(replyGone()).toBe('No se pudo enviar: ese trabajo ya no está')
  })

  it('the notification body speaks the language', async () => {
    const home = tmp()
    process.env['ATRIL_HOME'] = home
    mkdirSync(join(home, 'state'), { recursive: true })
    writeFileSync(join(home, 'state', 'atril-n1.json'), JSON.stringify({ state: 'needs-you', at: 1, text: 'Te pregunta: ¿Seguimos?' }))
    const { setLang } = await import('./lang')
    const { notificationBody } = await import('./status')
    const ws = { session: 'atril-n1', branch: 'WEB-1' } as Parameters<typeof notificationBody>[0]
    setLang('en')
    expect(await notificationBody(ws)).toBe('Asks you: ¿Seguimos?')
    setLang('es')
    expect(await notificationBody(ws)).toBe('Te pregunta: ¿Seguimos?')
  })
})
