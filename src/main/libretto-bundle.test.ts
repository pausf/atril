import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const bundle = join(__dirname, '../../resources/libretto')
const source = join(homedir(), 'gitrepos/libretto-automata')

describe('libretto bundle', () => {
  it('bundle carries every licence and its version', () => {
    expect(existsSync(join(bundle, 'LICENSE'))).toBe(true)
    expect(existsSync(join(bundle, 'THIRD-PARTY.md'))).toBe(true)
    // The source is the maintainer's checkout; elsewhere only the bundle's own licences are checked.
    const licences = existsSync(join(source, 'licenses')) ? readdirSync(join(source, 'licenses')) : ['LICENSE-caveman']
    expect(licences.length).toBeGreaterThan(0)
    for (const f of licences) expect(existsSync(join(bundle, 'licenses', f)), f).toBe(true)
    const plugin = JSON.parse(readFileSync(join(bundle, '.claude-plugin', 'plugin.json'), 'utf8'))
    expect(typeof plugin.version).toBe('string')
    expect(plugin.version.length).toBeGreaterThan(0)
  })
})
