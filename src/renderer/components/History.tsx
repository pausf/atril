import { Fragment, useEffect, useState } from 'react'
import type { HistoryEntry, HistorySteps } from '../../preload/api'
import { stagesOf } from '../flow/stages'
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

/** W173: one unit, rounded down. */
function short(t: T, seconds: number): string {
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (m < 1) return t('<1 min')
  if (h < 1) return t('{m} min', { m })
  if (h < 24) return t('{n} h', { n: h })
  return t('{n} d', { n: Math.floor(h / 24) })
}

const STEPS: (keyof HistorySteps)[] = ['spec', 'plan', 'construir', 'cierre']
const stepLabel = (t: T, k: keyof HistorySteps): string =>
  ({ spec: t('Spec'), plan: t('Plan'), construir: t('Build'), cierre: t('Wrap-up') })[k]

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2
}

/** W173: the step with the highest median over the newest entries; null under three with steps. Ties keep the earlier step. */
function slowest(entries: HistoryEntry[]): { step: keyof HistorySteps; median: number } | null {
  const withSteps = entries.flatMap((e) => (e.steps ? [e.steps] : []))
  if (withSteps.length < 3) return null
  let best: { step: keyof HistorySteps; median: number } | null = null
  for (const step of STEPS) {
    const values = withSteps.flatMap((s) => (s[step] === undefined ? [] : [s[step]]))
    if (values.length === 0) continue
    const m = median(values)
    if (!best || m > best.median) best = { step, median: m }
  }
  return best
}

const day = (ms: number): number => new Date(ms).setHours(0, 0, 0, 0)

function age(t: T, closedAt: number): string {
  // Round, not floor: a day with a clock change is 23 or 25 hours long.
  const n = Math.round((day(Date.now()) - day(closedAt * 1000)) / 86_400_000)
  return n <= 0 ? t('today') : t('{n} d ago', { n })
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
    e.stage === 'sin-libretto' ? t('no Libretto') : stages.find((s) => s.name === e.stage)?.label
  const shown = entries.slice(0, SHOWN)
  const top = slowest(shown)
  return (
    <FoldSection id="history" title={t('Finished')} count={entries.length} defaultFolded>
      {top && (
        <p className="hist-slowest">
          {t('Where most time goes: {step} (median {d})', { step: stepLabel(t, top.step), d: short(t, top.median) })}
        </p>
      )}
      <ul className="hist-list">
        {shown.map((e, i) => (
          <li key={`${e.closedAt}-${e.branch}-${i}`} className="hist-row">
            <span className="hist-branch">{e.branch}</span>
            <span className="hist-meta">
              {[
                e.repoId,
                stageLabel(e),
                e.createdAt !== undefined && t('took {d}', { d: lasted(t, e.closedAt - e.createdAt) }),
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
            {e.steps && STEPS.some((k) => e.steps?.[k] !== undefined) && (
              <span className="hist-steps">
                {STEPS.flatMap((k) => (e.steps?.[k] === undefined ? [] : [`${stepLabel(t, k)} ${short(t, e.steps[k])}`])).join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </FoldSection>
  )
}
