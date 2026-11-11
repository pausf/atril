import { useEffect, useState, type ReactNode } from 'react'
import type { SubagentEntry } from '../../preload/api'
import { runningCount, useSubagents } from '../subagents'
import { useT, type T } from '../ui'
import type { SubView } from './Branches'
import { SubagentModal } from './SubagentModal'

/** F27: «45 s» under a minute, «1 min 20 s» from there. */
export function duration(t: T, seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return s < 60 ? t('{n} s', { n: s }) : t('{m} min {s} s', { m: Math.floor(s / 60), s: s % 60 })
}

/** The selected workspace's subagents, the 1 s clock that ticks while any runs (F27) and F28's modal. */
export function useSubagentView(workspaceId: string | null): { view: SubView | null; modal: ReactNode } {
  const t = useT()
  const entries = useSubagents(workspaceId ? [workspaceId] : [])[workspaceId ?? ''] ?? []
  const running = runningCount(entries) > 0
  const [now, setNow] = useState(() => Date.now())
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=subagent-log opens the first running subagent for a photo.
  const firstRunning = entries.find((e) => e.endedAt === undefined)?.id
  useEffect(() => {
    if (firstRunning) void window.atril.snapshotView().then((v) => v === 'subagent-log' && setOpen((o) => o ?? firstRunning))
  }, [firstRunning])

  const state = (e: SubagentEntry): string =>
    e.endedAt === undefined ? t('trabajando · {d}', { d: duration(t, now / 1000 - e.startedAt) }) : t('terminado · {d}', { d: duration(t, e.endedAt - e.startedAt) })
  // An entry that left the list (W64) takes its modal with it.
  const shown = entries.find((e) => e.id === open)
  return {
    view: workspaceId && entries.length > 0 ? { workspaceId, entries, now, state, open: setOpen } : null,
    modal: workspaceId && shown ? <SubagentModal workspaceId={workspaceId} entry={shown} state={state(shown)} onClose={() => setOpen(null)} /> : null
  }
}
