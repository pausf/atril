import { useCallback, useEffect, useRef, useState } from 'react'
import type { MrLists } from '../../preload/api'

const REFRESH_MS = 5 * 60_000

export interface MrsState {
  result: MrLists | null
  loading: boolean
  refresh: () => Promise<void>
}

// One reader for the whole app (M9): the rail counter and the MR screen share it.
export function useMrs(): MrsState {
  const [result, setResult] = useState<MrLists | null>(null)
  const [loading, setLoading] = useState(false)
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

  return { result, loading, refresh }
}
