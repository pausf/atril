import { useEffect, useState } from 'react'
import type { RadarHit } from '../preload/api'

/** W168: the radar, asked now and every 10 s. */
export function useRadar(): Record<string, RadarHit[]> {
  const [hits, setHits] = useState<Record<string, RadarHit[]>>({})
  useEffect(() => {
    let live = true
    const ask = (): void => void window.atril.radar.get().then((h) => live && setHits(h))
    ask()
    const timer = setInterval(ask, 10_000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [])
  return hits
}
