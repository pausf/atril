import { Fragment, useEffect, useState } from 'react'
import type { HistoryEntry } from '../../preload/api'
import { stagesOf } from '../flow/FlowPanel'
import { useT, type T } from '../ui'
import { FoldSection } from './Fold'

const SHOWN = 20

export function lasted(t: T, seconds: number): string {
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (m < 1) return t('< 1 min')
  if (h < 1) return t('{m} min', { m })
  if (h < 24) return t('{h} h {m} min', { h, m: m % 60 })
  return t('{d} d {h} h', { d: Math.floor(h / 24), h: h % 24 })
}

const day = (ms: number): number => new Date(ms).setHours(0, 0, 0, 0)

function age(t: T, closedAt: number): string {
  // Round, not floor: a day with a clock change is 23 or 25 hours long.
  const n = Math.round((day(Date.now()) - day(closedAt * 1000)) / 86_400_000)
  return n <= 0 ? t('hoy') : t('hace {n} d', { n })
}

/** W96: what was removed from Trabajo, newest first; absent until there is something. */
export function History() {
  const t = useT()

  const [entries, setEntries] = useState<HistoryEntry[]>([])
  useEffect(() => {
    let live = true
    let pushed = false
    // A push that arrives while `list` is in flight is newer than its answer.
    void window.atril.history.list().then((e) => live && !pushed && setEntries(e))
    const off = window.atril.history.onChange((e) => {
      pushed = true
      setEntries(e)
    })
    return () => {
      live = false
      off()
    }
  }, [])
  if (entries.length === 0) return null

  const stages = stagesOf(t)
  const stageLabel = (e: HistoryEntry): string | undefined =>
    e.stage === 'sin-libretto' ? t('sin Libretto') : stages.find((s) => s.name === e.stage)?.label
  return (
    <FoldSection id="history" title={t('Terminados')} count={entries.length} defaultFolded>
      <ul className="hist-list">
        {entries.slice(0, SHOWN).map((e, i) => (
          <li key={`${e.closedAt}-${e.branch}-${i}`} className="hist-row">
            <span className="hist-branch">{e.branch}</span>
            <span className="hist-meta">
              {[
                e.repoId,
                stageLabel(e),
                e.createdAt !== undefined && t('duró {d}', { d: lasted(t, e.closedAt - e.createdAt) }),
                age(t, e.closedAt)
              ]
                .filter(Boolean)
                .map((part, j) => (
                  <Fragment key={j}>
                    {j > 0 && ' · '}
                    <span>{part}</span>
                  </Fragment>
                ))}
            </span>
          </li>
        ))}
      </ul>
    </FoldSection>
  )
}
