import { useEffect, useRef, useState } from 'react'
import type { WorkCost } from '../preload/api'
import type { T } from './ui'

/** One total per workspace: loaded with `get`, then following `changed`. */
export function useCosts(ids: string[]): Record<string, WorkCost | null> {
  const [map, setMap] = useState<Record<string, WorkCost | null>>({})
  const key = ids.join(',')
  const pushed = useRef(new Set<string>())

  useEffect(() => {
    let live = true
    pushed.current.clear()
    for (const id of key ? key.split(',') : [])
      // A push that arrived while `get` was in flight is newer than its answer.
      void window.atril.cost.get(id).then((c) => live && !pushed.current.has(id) && setMap((m) => ({ ...m, [id]: c })))
    const off = window.atril.cost.onChange((id, c) => {
      pushed.current.add(id)
      setMap((m) => ({ ...m, [id]: c }))
    })
    return () => {
      live = false
      off()
    }
  }, [key])
  return map
}

const fixed = (locale: string, n: number, digits: number): string =>
  n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false })

/** W94: «≈ 0,42 $ · 12,3 k tokens · estimado a precio de API»; null when there is nothing to say. */
export function costText(t: T, locale: string, cost: WorkCost | null | undefined): string | null {
  if (!cost || cost.tokens <= 0) return null
  const n = cost.tokens
  const tokens = n < 1000 ? String(n) : n < 1e6 ? `${(n / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} k` : `${(n / 1e6).toLocaleString(locale, { maximumFractionDigits: 1 })} M`
  const usd = cost.usd === null ? null : fixed(locale, cost.usd, 2)
  // Under a cent the bound already says it is approximate: no «≈» in front of «<».
  const line =
    usd === null
      ? t('{tokens} tokens', { tokens })
      : cost.usd !== null && cost.usd < 0.01
        ? t('< {cost} $ · {tokens} tokens', { cost: fixed(locale, 0.01, 2), tokens })
        : t('≈ {cost} $ · {tokens} tokens', { cost: usd, tokens })
  const unpriced = cost.unpriced.length ? ` ${t('(sin precio para {model})', { model: cost.unpriced.map((m) => m || '?').join(', ') })}` : ''
  return `${line}${unpriced} · ${t('estimado a precio de API')}`
}
