import { useEffect, useState } from 'react'
import type { FlowBoxes, FlowStage, StageName } from '../../preload/api'

/** The selected workspace's stage; also tells main which workspace to watch. `undefined` until main answers (F49). */
export function useFlow(workspaceId: string | null): FlowStage | null | undefined {
  const [flow, setFlow] = useState<FlowStage | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setFlow(undefined)
    void window.atril.flow.get(workspaceId).then((f) => live && setFlow(f))
    const off = window.atril.flow.onChange((id, f) => id === workspaceId && setFlow(f))
    return () => {
      live = false
      off()
    }
  }, [workspaceId])
  return flow
}

export const BUILDING: StageName[] = ['construir', 'terminado', 'aterrizado']

export interface BoxesState extends FlowBoxes {
  /** Counts the answers, so a live diff knows when to ask again. */
  tick: number
}
const NONE: BoxesState = { boxes: [], total: 0, tick: 0 }

/** F38: from Construir on, the boxes asked again every 3 s, never twice at once. */
export function useBoxes(workspaceId: string | null, flow: FlowStage | null): BoxesState {
  const [state, setState] = useState<BoxesState>(NONE)
  const building = flow !== null && BUILDING.includes(flow.stage)
  useEffect(() => {
    setState(NONE)
    if (!workspaceId || !building) return
    let live = true
    let busy = false
    const load = (): void => {
      if (busy) return
      busy = true
      void window.atril.flow.boxes(workspaceId).then((b) => {
        busy = false
        if (live) setState((s) => ({ ...b, tick: s.tick + 1 }))
      })
    }
    load()
    const timer = setInterval(load, 3000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [workspaceId, building])
  return state
}
