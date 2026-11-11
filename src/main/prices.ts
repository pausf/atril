/** The Claude API's published prices, cached on this date; they change, so this file carries it. */
export const PRICES_AT = '2026-11-11'

/** Dollars per million tokens. Without a published cache read, it is 0.1× input. */
export interface Price {
  input: number
  output: number
  cacheRead?: number
  /** For a message whose input, cache write and cache read add up to more than LONG_PROMPT tokens. */
  long?: Price
}

export const LONG_PROMPT = 100_000

const PRICES = new Map<string, Price>(Object.entries({
  'claude-fable-5-2': { input: 8, output: 40, cacheRead: 0.2 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, long: { input: 0.5, output: 2.5, cacheRead: 0.05 } }
}))

/** The exact id, or the id with a trailing date (`claude-sonnet-5-20261001`); anything else is unknown. */
export function priceOf(model: string): Price | undefined {
  return PRICES.get(model) ?? PRICES.get(model.replace(/-\d{8}$/, ''))
}
