import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanTmp, tmp } from './test-helpers'
import { patchUi, readUi } from './ui'

beforeEach(() => {
  process.env['ATRIL_HOME'] = tmp()
})
afterEach(() => {
  cleanTmp()
  delete process.env['ATRIL_HOME']
})

describe('ui store', () => {
  it('starts with the tutorial pending and the automatic theme', async () => {
    expect(await readUi()).toEqual({ tutorialSeen: false, theme: 'auto', folded: {}, language: 'system', palette: 'original' })
  })

  it('persists patches and merges folded sections key by key', async () => {
    await patchUi({ theme: 'dark', folded: { repos: true } })
    await Promise.all([patchUi({ folded: { work: true } }), patchUi({ tutorialSeen: true })])
    expect(await readUi()).toEqual({ tutorialSeen: true, theme: 'dark', folded: { repos: true, work: true }, language: 'system', palette: 'original' })
    await patchUi({ folded: { repos: false } })
    expect((await readUi()).folded).toEqual({ repos: false, work: true })
  })

  it('drops invalid values and survives a corrupt file', async () => {
    await patchUi({ theme: 'neon', tutorialSeen: 'yes', folded: { a: 1 } })
    expect(await readUi()).toEqual({ tutorialSeen: false, theme: 'auto', folded: {}, language: 'system', palette: 'original' })
    writeFileSync(join(process.env['ATRIL_HOME']!, 'ui.json'), '{nope')
    expect((await readUi()).theme).toBe('auto')
  })
  it('keeps the palette and reads an unknown one as the original', async () => {
    await patchUi({ palette: 'grafito' })
    expect((await readUi()).palette).toBe('grafito')
    writeFileSync(join(process.env['ATRIL_HOME']!, 'ui.json'), JSON.stringify({ palette: 'neon' }))
    expect((await readUi()).palette).toBe('original')
  })

  it('remembers «Ya lo tengo» and drops anything but true', async () => {
    await patchUi({ setupDismissed: 'yes' })
    expect((await readUi()).setupDismissed).toBeUndefined()
    await patchUi({ setupDismissed: true })
    await patchUi({ theme: 'dark' })
    expect((await readUi()).setupDismissed).toBe(true)
  })
})
