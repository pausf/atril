import { useEffect, useState } from 'react'
import type { SubagentEntry } from '../../preload/api'
import { FoldSection } from '../components/Fold'
import { runningCount, useSubagents } from '../subagents'
import { useT, type T } from '../ui'
import { SubagentModal } from './SubagentModal'

/** F27: «45 s» under a minute, «1 min 20 s» from there. */
export function duration(t: T, seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return s < 60 ? t('{n} s', { n: s }) : t('{m} min {s} s', { m: Math.floor(s / 60), s: s % 60 })
}

const newest = (a: SubagentEntry, b: SubagentEntry): number => b.startedAt - a.startedAt

export function Subagents({ workspaceId }: { workspaceId: string | null }) {
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

  if (entries.length === 0) return null
  const state = (e: SubagentEntry): string =>
    e.endedAt === undefined ? t('trabajando · {d}', { d: duration(t, now / 1000 - e.startedAt) }) : t('terminado · {d}', { d: duration(t, e.endedAt - e.startedAt) })
  // An entry that left the list (W64) takes its modal with it.
  const shown = entries.find((e) => e.id === open)
  return (
    <>
      <FoldSection id="flow-subagents" title={t('Subagentes')} count={entries.length} className="flow-fold">
        <ul className="subs" aria-label={t('Subagentes')}>
          {[...entries].sort(newest).map((e) => (
            <li key={e.id}>
              <button type="button" className={`sub ${e.endedAt === undefined ? 'run' : 'end'}`} onClick={() => setOpen(e.id)}>
                <span className="sub-text">{e.description || e.type}</span>
                {e.description && <span className="sub-type">{e.type}</span>}
                <span className="sub-state">{state(e)}</span>
              </button>
            </li>
          ))}
        </ul>
      </FoldSection>
      {workspaceId && shown && <SubagentModal workspaceId={workspaceId} entry={shown} state={state(shown)} onClose={() => setOpen(null)} />}
    </>
  )
}
