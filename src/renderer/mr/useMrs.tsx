import { useCallback, useEffect, useRef, useState } from 'react'
import type { MrLists, MrScoreState } from '../../preload/api'

const REFRESH_MS = 5 * 60_000

export interface MrsState {
  result: MrLists | null
  loading: boolean
  refresh: () => Promise<void>
  /** Per URL of Mías and Me toca revisar (M15). */
  scores: Record<string, MrScoreState>
  score: (url: string) => void
}

// One reader for the whole app (M9): the rail counter and the MR screen share it.
export function useMrs(): MrsState {
  const [result, setResult] = useState<MrLists | null>(null)
  const [loading, setLoading] = useState(false)
  const [scores, setScores] = useState<Record<string, MrScoreState>>({})
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      setResult(await window.atril.mr.list())
    } catch {
      // Main reports forge failures inside the lists; a broken call keeps the last ones.
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => window.atril.mr.onScoreChange((url, state) => setScores((s) => ({ ...s, [url]: state }))), [])

  useEffect(() => {
    if (!result) return
    let live = true
    const urls = [...result.mine, ...result.review].map((m) => m.url)
    void window.atril.mr
      .scoreOf(urls)
      .then((r) => live && setScores((s) => ({ ...s, ...r })))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [result])

  const score = useCallback((url: string) => {
    void window.atril.mr.score(url).then(
      (state) => setScores((s) => ({ ...s, [url]: state })),
      () => undefined
    )
  }, [])

  return { result, loading, refresh, scores, score }
}
