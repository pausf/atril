import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { QaCriterion, QaEntry, QaReport, QaShot, QaStatus, WorkspaceView } from '../../preload/api'
import { useLocale, useT } from '../ui'
import { useModalKeys } from '../flow/modalKeys'
import { QaBug } from './QaBug'
import { QaHow } from './QaHow'
import { kindLabel } from './kinds'
import { settled, TESTING_MS, type QaPending } from './pending'

const POLL_MS = 3000

/** W113: the QA screen; it asks main only while it is shown. «Probando…» lives in the App (`pending`), so it survives a visit elsewhere. */
export function QaScreen({ workspaces, selected, pending, setPending }: { workspaces: WorkspaceView[]; selected: string | null; pending: Record<string, QaPending>; setPending: Dispatch<SetStateAction<Record<string, QaPending>>> }) {
  const t = useT()
  const list = workspaces.filter((w) => w.mode !== 'review')
  const [picked, setPicked] = useState<string | null>(null)
  const id = [picked, selected].find((c) => c !== null && list.some((w) => w.id === c)) ?? list[0]?.id ?? null
  const [reports, setReports] = useState<Record<string, QaReport | null>>({})
  const [statuses, setStatuses] = useState<Record<string, QaStatus | null>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [big, setBig] = useState<QaShot | null>(null)
  const [how, setHow] = useState<string | null>(null)
  const [bug, setBug] = useState<{ id: string; fromHow: boolean } | null>(null)
  const mounted = useRef(true)
  const asked = useRef(new Set<string>())
  const idsKey = list.map((w) => w.id).join(',')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // An answer is kept even when the person has moved on: a slow one must never be dropped.
  const load = useCallback(async (ws: string): Promise<void> => {
    const [r, s] = await Promise.all([window.atril.qa.report(ws), window.atril.qa.status(ws)])
    if (!mounted.current) return
    setReports((m) => ({ ...m, [ws]: r }))
    setStatuses((m) => ({ ...m, [ws]: s }))
    setPending((p) => settled(p, ws, r, s, Date.now()))
  }, [setPending])

  // The picked workspace every 3 s, the next ask only after the last answer.
  useEffect(() => {
    if (id === null) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async (): Promise<void> => {
      await load(id).catch(() => undefined)
      if (live) timer = setTimeout(() => void tick(), POLL_MS)
    }
    void tick()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [id, load])

  // The other cards only need their kind: once.
  useEffect(() => {
    for (const w of workspaces) {
      if (w.mode === 'review' || w.id === id || asked.current.has(w.id)) continue
      asked.current.add(w.id)
      void window.atril.qa.report(w.id).then((r) => mounted.current && setReports((m) => ({ ...m, [w.id]: r })), () => undefined)
    }
  }, [idsKey, id])

  useEffect(() => {
    setError(null)
    setBig(null)
    setHow(null)
    setBug(null)
  }, [id])

  const ws = list.find((w) => w.id === id)
  const report = id ? reports[id] ?? null : null
  const status = id ? statuses[id] ?? null : null
  const shots = new Map((status?.shots ?? []).map((s) => [s.name, s.src]))
  const entryOf = (cid: string): QaEntry | undefined => report?.entries.find((e) => e.id === cid)
  const testing = (cid: string): boolean => {
    const p = pending[`${id}:${cid}`]
    return p !== undefined && Date.now() - p.since < TESTING_MS
  }

  const press = async (): Promise<void> => {
    if (id === null || !status) return
    setBusy(true)
    setError(null)
    const r = await (status.live ? window.atril.qa.stop(id) : window.atril.qa.launch(id))
    setBusy(false)
    if ('error' in r) setError(r.error)
    // Ask at once instead of waiting for the next tick, so the button follows the press.
    void load(id)
  }

  const retest = async (cid: string | null): Promise<void> => {
    if (id === null || !report) return
    setBusy(true)
    setError(null)
    const since = Date.now()
    const r = await window.atril.qa.retest(id, cid)
    setBusy(false)
    if ('error' in r) return setError(r.error)
    const ids = cid === null ? report.criteria.map((c) => c.id) : [cid]
    setPending((p) => ({ ...p, ...Object.fromEntries(ids.map((c) => [`${id}:${c}`, { since, live: false }])) }))
    void load(id)
  }

  const crit = (cid: string | null): QaCriterion | undefined => report?.criteria.find((c) => c.id === cid)
  const closeBug = (): void => {
    const was = bug
    setBug(null)
    // Opened from «Ver cómo», whose button is gone: focus goes back to the row's own.
    if (was?.fromHow) setTimeout(() => document.querySelector<HTMLElement>(`[data-qa="${was.id}-bug"]`)?.focus(), 0)
  }

  return (
    <section className="tasks-screen qa-screen" data-tour="qa">
      <div className="lbw">
        <h1>{t('QA')}</h1>
        <p className="lead">{t('Prueba en vivo lo que construye cada trabajo, en un navegador o emulador.')}</p>
        {list.length === 0 && <div className="empty">{t('Abre un trabajo para probarlo.')}</div>}
        {list.length > 0 && (
          <div className="qa-cards" role="group" aria-label={t('Trabajos')}>
            {list.map((w) => (
              <button key={w.id} type="button" className={`qa-card${reports[w.id] && !reports[w.id]!.kind ? ' off' : ''}`} aria-pressed={w.id === id} onClick={() => setPicked(w.id)}>
                <b>{w.jiraKey ?? w.branch}</b> <span>{w.id in reports ? kindLabel(t, reports[w.id]?.kind ?? null) : ''}</span>
              </button>
            ))}
          </div>
        )}
        {ws && report && !report.kind && <div className="empty">{t('Atril no sabe abrir este proyecto: QA no puede probarlo.')}</div>}
        {ws && report && report.kind && (
          <>
            <div className="qa-bar">
              <div className="qa-grow">
                <b>{kindLabel(t, report.kind)}</b>
                <span>{report.change ? t('Cambio: {change}', { change: report.change }) : t('Sin cambio abierto')}</span>
              </div>
              {status?.live && <span className="qa-live">● {t('en vivo')}</span>}
              <button type="button" className="btn" disabled={busy || report.criteria.length === 0} onClick={() => void retest(null)}>
                {t('Reprobar todo')}
              </button>
              {status && (
                <button type="button" className={status.live ? 'btn' : 'btn p'} disabled={busy} onClick={() => void press()}>
                  {status.live ? t('Detener QA') : t('Probar en vivo')}
                </button>
              )}
            </div>
            {error && (
              <p className="qa-err" role="alert">
                {error}
              </p>
            )}
            {report.criteria.length === 0 ? (
              <div className="empty">{t('Este trabajo no tiene criterios que probar')}</div>
            ) : (
              <>
                <Summary report={report} />
                <ul className="qa-crits">
                  {report.criteria.map((c) => (
                    <Row
                      key={c.id}
                      c={c}
                      entry={entryOf(c.id)}
                      testing={testing(c.id)}
                      shots={shots}
                      onHow={() => setHow(c.id)}
                      onBug={() => setBug({ id: c.id, fromHow: false })}
                      onTest={() => void retest(c.id)}
                      busy={busy}
                    />
                  ))}
                </ul>
              </>
            )}
            <section className="qa-all" aria-labelledby="qa-all-h">
              <h2 id="qa-all-h">{t('Todas las capturas')}</h2>
              {status && status.shots.length > 0 ? (
                <ul className="qa-shots">
                  {status.shots.map((s) => (
                    <li key={s.name}>
                      <button type="button" title={s.name} aria-label={t('Ver {name} en grande', { name: s.name })} onClick={() => setBig(s)}>
                        <img src={s.src} alt={s.name} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fmeta">{t('Sin capturas todavía')}</p>
              )}
            </section>
          </>
        )}
      </div>
      {big && <ShotModal shot={big} onClose={() => setBig(null)} />}
      {how && crit(how) && entryOf(how) && (
        <QaHow
          criterion={crit(how)!}
          entry={entryOf(how)!}
          shots={shots}
          onClose={() => setHow(null)}
          onBug={() => {
            setBug({ id: how, fromHow: true })
            setHow(null)
          }}
        />
      )}
      {bug && id && report && crit(bug.id) && entryOf(bug.id) && <QaBug workspaceId={id} report={report} criterion={crit(bug.id)!} entry={entryOf(bug.id)!} onClose={closeBug} />}
    </section>
  )
}

function Summary({ report }: { report: QaReport }) {
  const t = useT()
  const n = (s: QaEntry['status']): number => report.entries.filter((e) => e.status === s).length
  const p = n('pass')
  const f = n('fail')
  return (
    <p className="qa-sum">
      <span className="qa-tag pass">{t('{n} pasan', { n: p })}</span>
      <i> · </i>
      <span className="qa-tag fail">{t('{n} fallan', { n: f })}</span>
      <i> · </i>
      <span className="qa-tag">{t('{n} sin probar', { n: report.criteria.length - p - f })}</span>
    </p>
  )
}

function Row({ c, entry, testing, shots, onHow, onBug, onTest, busy }: { c: QaCriterion; entry: QaEntry | undefined; testing: boolean; shots: Map<string, string>; onHow: () => void; onBug: () => void; onTest: () => void; busy: boolean }) {
  const t = useT()
  const locale = useLocale()
  const status = entry && entry.status !== 'untested' ? entry.status : 'untested'
  const first = entry?.steps.find((s) => s.shot && shots.has(s.shot))
  const total = entry && entry.steps.length > 0 && entry.steps.every((s) => s.ms !== undefined) ? entry.steps.reduce((a, s) => a + s.ms!, 0) : null
  const summary = entry && entry.steps.length > 0 ? [t('{n} pasos', { n: entry.steps.length }), total !== null && t('{n} s', { n: (total / 1000).toLocaleString(locale, { maximumFractionDigits: 0 }) })].filter(Boolean).join(' · ') : ''
  return (
    <li className="qa-crit">
      <span className="qa-id">{c.id}</span>
      <span className="qa-text">{c.text}</span>
      {testing ? (
        <span className="qa-tag run">
          <i className="qa-dot" aria-hidden />
          {t('Probando…')}
        </span>
      ) : (
        <span className={`qa-tag ${status}`}>{status === 'pass' ? t('Pasa') : status === 'fail' ? t('Falla') : t('Sin probar')}</span>
      )}
      <div className="qa-ev">
        {!testing && first && (
          // A pointer shortcut to «Ver cómo», which is the keyboard and screen-reader way in.
          <button type="button" className={`qa-thumb${status === 'fail' ? ' bad' : ''}`} tabIndex={-1} aria-hidden onClick={onHow}>
            <img src={shots.get(first.shot!)} alt="" />
          </button>
        )}
        <span className="qa-note">{testing ? '' : [entry?.note || (entry ? '' : t('Aún no probado.')), summary].filter(Boolean).join(' · ')}</span>
        <span className="qa-sp" />
        {!testing && status === 'fail' && (
          <button type="button" className="btn" data-qa={`${c.id}-bug`} onClick={onBug}>
            {t('Marcar como bug')}
          </button>
        )}
        {!testing && entry && entry.steps.length > 0 && (
          <button type="button" className="btn" data-qa={`${c.id}-how`} onClick={onHow}>
            {t('Ver cómo')}
          </button>
        )}
        {!testing && (
          <button type="button" className="btn" disabled={busy} data-qa={`${c.id}-try`} onClick={onTest}>
            {t('Probar este')}
          </button>
        )}
      </div>
    </li>
  )
}

function ShotModal({ shot, onClose }: { shot: QaShot; onClose: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const keys = useModalKeys(dialog, onClose)
  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg edmodal qamodal" role="dialog" aria-modal="true" aria-labelledby="qa-title" ref={dialog} tabIndex={-1}>
        <div className="edhead">
          <h3 id="qa-title">{shot.name}</h3>
          <span className="sp" />
          <button type="button" className="btn" onClick={onClose}>
            {t('Cerrar')}
          </button>
        </div>
        <div className="qa-big">
          <img src={shot.src} alt={shot.name} />
        </div>
      </div>
    </div>
  )
}
