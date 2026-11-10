import { useEffect, useRef, useState } from 'react'
import type { SubagentEntry } from '../preload/api'

/** One map per workspace: loaded with `get`, then following `changed`. */
export function useSubagents(ids: string[]): Record<string, SubagentEntry[]> {
  const [map, setMap] = useState<Record<string, SubagentEntry[]>>({})
  const key = ids.join(',')
  const pushed = useRef(new Set<string>())

  useEffect(() => {
    let live = true
    pushed.current.clear()
    for (const id of key ? key.split(',') : [])
      // A change that arrived while `get` was in flight is newer than its answer.
      void window.atril.subagents.get(id).then((e) => live && !pushed.current.has(id) && setMap((m) => ({ ...m, [id]: e })))
    const off = window.atril.subagents.onChange((id, e) => {
      pushed.current.add(id)
      setMap((m) => ({ ...m, [id]: e }))
    })
    return () => {
      live = false
      off()
    }
  }, [key])
  return map
}

export const runningCount = (entries: SubagentEntry[] | undefined): number => (entries ?? []).filter((e) => e.endedAt === undefined).length
