import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { localiseActivity } from './activity-i18n'
import { translate } from './i18n'
import { ES } from './i18n-es'

// Atril's own source: tests, the catalog and the test mock are not shown to anyone.
const files = globSync('src/**/*.{ts,tsx}').filter((f) => !/\.test\.tsx?$|i18n-es\.ts$|mockApi\.ts$|test-helpers\.ts$/.test(f))
const source = files.map((f) => [f, readFileSync(f, 'utf8')] as const)
const KEY = /\b(?:t|translate)\(\s*(?:\w+,\s*)?(['"])((?:\\.|(?!\1).)*)\1/g
const unescape = (s: string): string => s.replace(/\\(.)/g, '$1')

describe('i18n catalog', () => {
  it('every text has its spanish', () => {
    const used = new Set<string>()
    const templated: string[] = []
    for (const [file, text] of source) {
      if (/\bt\(\s*`/.test(text)) templated.push(file)
      for (const m of text.matchAll(KEY)) used.add(unescape(m[2]!))
    }
    const holes = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join()
    expect(templated, 'a template literal as a t() key').toEqual([])
    expect([...used].filter((k) => !(k in ES)), 'texts with no Spanish entry').toEqual([])
    expect(Object.keys(ES).filter((k) => !used.has(k)), 'catalog entries nothing uses').toEqual([])
    expect(Object.entries(ES).filter(([k, v]) => holes(k) !== holes(v)).map(([k]) => k), 'placeholders that differ').toEqual([])
  })

  it('english is the key and spanish is the catalog', () => {
    expect(translate('es', 'Back to {branch}', { branch: 'main' })).toBe('Volver a main')
    expect(translate('en', 'Back to {branch}', { branch: 'main' })).toBe('Back to main')
    expect(translate('es', 'A text nobody translated')).toBe('A text nobody translated')
    expect(translate('es', 'Not yet translated@@nav')).toBe('Not yet translated')
  })

  it('same english two spanish', () => {
    expect(translate('es', 'Back')).toBe('Volver')
    expect(translate('es', 'Back@@nav')).toBe('Atrás')
    expect(translate('en', 'Back')).toBe('Back')
    expect(translate('en', 'Back@@nav')).toBe('Back')
  })

  it('no spanish text skips t', () => {
    const SPANISH = /[áéíóúñüÁÉÍÓÚÑ¿¡«»]/
    const offenders: string[] = []
    for (const [file, text] of source) {
      text.split('\n').forEach((raw, i) => {
        if (/i18n-ignore/.test(raw)) return
        const line = raw
          .replace(KEY, '')
          .replace(/^\s*(\/\/|\*|\/\*).*$/, '')
          .replace(/\s\/\/.*$/, '')
          .replace(/\/\*.*?\*\//g, '')
        if (SPANISH.test(line)) offenders.push(`${file}:${i + 1}: ${raw.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })

  it('hook prefixes follow the language', () => {
    const en = (es: string, vars?: Record<string, string | number>): string => translate('en', es, vars)
    const cases: [string, string][] = [
      ['Claude te necesita', 'Claude needs you'],
      ['Claude ha terminado', 'Claude has finished'],
      ['Leyendo src/Ño.php', 'Reading src/Ño.php'],
      ['Editando a.ts', 'Editing a.ts'],
      ['Escribiendo b.ts', 'Writing b.ts'],
      ['Ejecutando vendor/bin/phpunit --filter Días', 'Running vendor/bin/phpunit --filter Días'],
      ['Buscando festivos', 'Searching festivos'],
      ['Lanzando un subagente: T7 festivos', 'Launching a subagent: T7 festivos'],
      ['Te pregunta: ¿Seguimos con la casilla 1?', 'Asks you: ¿Seguimos con la casilla 1?'],
      ['Claude dice: Listo, todo en verde.', 'Claude says: Listo, todo en verde.'],
      ['Le has escrito: sigue', 'You wrote: sigue'],
      ['✗ phpunit --filter X falló', '✗ phpunit --filter X failed'],
      ['✗ algo sin el final', '✗ algo sin el final'],
      ['Una línea cualquiera', 'Una línea cualquiera']
    ]
    for (const [es, out] of cases) expect(localiseActivity(es, en)).toBe(out)
    // In Spanish nothing changes.
    for (const [es] of cases) expect(localiseActivity(es, (k, v) => translate('es', k, v))).toBe(es)
  })
})
