// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('quick replies', () => {
  it('the question card reads in every theme', () => {
    const css = readFileSync(join(__dirname, 'styles.css'), 'utf8')
    const block = (selector: string): Record<string, string> => {
      const start = css.indexOf(`${selector} {`)
      const body = css.slice(start, css.indexOf('}', start))
      return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
    }
    const light = block(':root')
    const dark = block("[data-theme='dark']")
    const grafito = block("[data-palette='grafito']")
    const grafitoDark = block("[data-palette='grafito'][data-theme='dark']")
    const sets = {
      'original light': light,
      'original dark': { ...light, ...dark },
      'grafito light': { ...light, ...grafito },
      'grafito dark': { ...light, ...dark, ...grafito, ...grafitoDark }
    }
    const channel = (v: number): number => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const lum = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16)
      return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
    }
    const ratio = (a: string, b: string): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
      return (hi + 0.05) / (lo + 0.05)
    }
    for (const [name, set] of Object.entries(sets)) {
      expect(set['ask-bg'], `${name} defines --ask-bg`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(ratio(set['text']!, set['ask-bg']!), `${name}: --text on --ask-bg`).toBeGreaterThanOrEqual(4.5)
    }
    // Each theme and palette block owns its own tint.
    for (const b of [light, dark, grafito, grafitoDark]) expect(b['ask-bg']).toBeTruthy()
  })
})
