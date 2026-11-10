import { useEffect, useState } from 'react'
import type { SubagentEntry } from '../../preload/api'
import { runningCount, useSubagents } from '../subagents'
import { useT, type T } from '../ui'

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

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  if (entries.length === 0) return null
  return (
    <section className="sec" aria-labelledby="subagents-h">
      <h2 id="subagents-h">
        {t('Subagentes')}
      </h2>
      <ul className="subs" aria-label={t('Subagentes')}>
        {[...entries].sort(newest).map((e) => (
          <li className={`sub ${e.endedAt === undefined ? 'run' : 'end'}`} key={e.id}>
            <span className="sub-text">{e.description || e.type}</span>
            {e.description && <span className="sub-type">{e.type}</span>}
            <span className="sub-state">
              {e.endedAt === undefined
                ? t('trabajando · {d}', { d: duration(t, now / 1000 - e.startedAt) })
                : t('terminado · {d}', { d: duration(t, e.endedAt - e.startedAt) })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
