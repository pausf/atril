import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EN } from './i18n-en'

// Atril's own source: tests, the catalog and the test mock are not shown to anyone.
const files = globSync('src/**/*.{ts,tsx}').filter((f) => !/\.test\.tsx?$|i18n-en\.ts$|mockApi\.ts$|test-helpers\.ts$/.test(f))
const source = files.map((f) => [f, readFileSync(f, 'utf8')] as const)
const KEY = /\b(?:t|translate)\(\s*(?:\w+,\s*)?(['"])((?:\\.|(?!\1).)*)\1/g
const unescape = (s: string): string => s.replace(/\\(.)/g, '$1')

describe('i18n catalog', () => {
  it('every text has its english', () => {
    const used = new Set<string>()
    for (const [file, text] of source) {
      expect(/\bt\(\s*`/.test(text), `${file}: a template literal as a t() key`).toBe(false)
      for (const m of text.matchAll(KEY)) used.add(unescape(m[2]!))
    }
    const missing = [...used].filter((k) => !(k in EN))
    const unused = Object.keys(EN).filter((k) => !used.has(k))
    expect(missing, 'texts with no English entry').toEqual([])
    expect(unused, 'catalog entries nothing uses').toEqual([])
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
})
