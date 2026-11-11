import { useEffect, useId, useState } from 'react'
import type { FlowBox } from '../../preload/api'
import { useT } from '../ui'
import { diffLines } from './DiffText'

/** F38: pending boxes shown before «+{n} más». */
const PENDING_SHOWN = 3

/** The files of a box's range and the diff of the chosen one, as text. `version` asks the diff again (the live box). */
function BoxCode({ workspaceId, box, version }: { workspaceId: string; box: FlowBox; version: number }) {
  const t = useT()
  const files = box.files ?? []
  const [pick, setPick] = useState<string | null>(null)
  const file = files.find((f) => f.path === pick)?.path ?? files[0]?.path
  const [shown, setShown] = useState<{ file: string; text: string } | null>(null)

  useEffect(() => {
    if (!file) return
    let live = true
    void window.atril.flow.boxDiff(workspaceId, box.index, file).then((text) => live && setShown({ file, text }))
    return () => {
      live = false
    }
  }, [workspaceId, box.index, file, version])

  if (files.length === 0) return <p className="fx-m">{t('Sin cambios de código.')}</p>
  const diff = shown && shown.file === file ? shown.text : null
  return (
    <>
      <ul className="fchanges">
        {files.map((f) => {
          const slash = f.path.lastIndexOf('/')
          const total = f.added + f.removed || 1
          return (
            <li key={f.path}>
              <button type="button" className={f.path === file ? 'on' : undefined} aria-pressed={f.path === file} onClick={() => setPick(f.path)} title={f.path}>
                <span className={`fst ${f.status}`}>{f.status}</span>
                <span className="fpath">
                  <span className="fdir">{f.path.slice(0, slash + 1)}</span>
                  <b>{f.path.slice(slash + 1)}</b>
                </span>
                <span className="fnum">
                  <span className="fa">+{f.added}</span> <span className="fd">−{f.removed}</span>
                </span>
                <span className="fbar" aria-hidden="true">
                  <i className="fa" style={{ width: `${(f.added / total) * 100}%` }} />
                  <i className="fd" style={{ width: `${(f.removed / total) * 100}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="fx-mini">
        <pre className="hl diffview fx-diff" tabIndex={0} aria-label={t('Diff de {file}', { file: file ?? '' })}>
          {diff === null ? t('Cargando…') : diff === '' ? t('Este archivo ya no tiene cambios.') : diffLines(diff)}
        </pre>
      </div>
    </>
  )
}

function ClosedBox({ workspaceId, box }: { workspaceId: string; box: FlowBox }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const body = useId()
  return (
    <li className="fx-bx d">
      <button type="button" className="fx-bt" aria-expanded={open} aria-controls={body} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">✓ </span>
        {box.text}
        <span className="sr-only"> {t('hecho')}</span>
        {box.commit && <small className="fx-m"> {box.commit}</small>}
      </button>
      <div id={body} hidden={!open}>
        {open && <BoxCode workspaceId={workspaceId} box={box} version={0} />}
      </div>
    </li>
  )
}

/** F38: the checklist as a timeline; each box brings the code that closed it, the current one the code being written. */
export function Boxes({ workspaceId, boxes, tick }: { workspaceId: string; boxes: FlowBox[]; tick: number }) {
  const t = useT()
  const pending = boxes.filter((b) => b.state === 'pending')
  const hidden = pending.length - PENDING_SHOWN
  const shownPending = new Set(pending.slice(0, PENDING_SHOWN).map((b) => b.index))
  return (
    <ol className="fx-tl" aria-label={t('Casillas del checklist')} data-tour="flow-checklist">
      {boxes.map((b) => {
        if (b.state === 'closed') return <ClosedBox key={b.index} workspaceId={workspaceId} box={b} />
        if (b.state === 'current')
          return (
            <li className="fx-bx c" key={b.index}>
              <span className="fx-bt">
                {b.text}
                <span className="sr-only"> {t('ahora')}</span>
              </span>
              <BoxCode workspaceId={workspaceId} box={b} version={tick} />
            </li>
          )
        return shownPending.has(b.index) ? (
          <li className="fx-bx p" key={b.index}>
            <span className="fx-bt">
              {b.text}
              <span className="sr-only"> {t('pendiente')}</span>
            </span>
          </li>
        ) : null
      })}
      {hidden > 0 && <li className="fx-fold">{t('+{n} más', { n: hidden })}</li>}
    </ol>
  )
}
