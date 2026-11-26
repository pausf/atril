import { useRef, useState } from 'react'
import type { QaCriterion, QaEntry } from '../../preload/api'
import { useLocale, useT } from '../ui'
import { useModalKeys } from '../flow/modalKeys'

/** W115: how the agent tested one criterion: its steps, the failing one marked, its screenshots in a strip and the chosen one large. */
export function QaHow({ criterion, entry, shots, onClose, onBug }: { criterion: QaCriterion; entry: QaEntry; shots: Map<string, string>; onClose: () => void; onBug?: () => void }) {
  const t = useT()
  const locale = useLocale()
  const dialog = useRef<HTMLDivElement>(null)
  const keys = useModalKeys(dialog, onClose)
  // The failing step is the last one the agent took.
  const failing = entry.status === 'fail' ? entry.steps.length - 1 : -1
  const [sel, setSel] = useState(Math.max(failing, 0))
  const step = entry.steps[sel]
  const src = step?.shot ? shots.get(step.shot) : undefined
  const seconds = (ms: number): string => t('{n} s', { n: (ms / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) })
  const label = (i: number): string => t('Step {n}: {text}', { n: i + 1, text: entry.steps[i]!.text })
  const framed = entry.steps.flatMap((s, i) => (s.shot && shots.has(s.shot) ? [{ i, src: shots.get(s.shot)! }] : []))

  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg qa-dlg" role="dialog" aria-modal="true" aria-labelledby="qa-how-title" ref={dialog} tabIndex={-1}>
        <div className="qa-dhead">
          <h3 id="qa-how-title">{t('{id} · how the agent tested it', { id: criterion.id })}</h3>
          <button type="button" className="btn" onClick={onClose}>
            {t('Close')}
          </button>
        </div>
        <p className="qa-sub">{criterion.text}</p>
        {framed.length > 0 && (
          <div className="qa-film" role="group" aria-label={t('Screenshots')}>
            {framed.map((f) => (
              <button key={f.i} type="button" className={`qa-fr${f.i === sel ? ' on' : ''}${f.i === failing ? ' bad' : ''}`} aria-pressed={f.i === sel} aria-label={label(f.i)} onClick={() => setSel(f.i)}>
                <img src={f.src} alt="" />
              </button>
            ))}
          </div>
        )}
        <div className={`qa-stage${sel === failing ? ' bad' : ''}`}>
          {src ? <img src={src} alt={label(sel)} /> : <span>{t('No screenshot for this step')}</span>}
        </div>
        <ol className="qa-acts">
          {entry.steps.map((s, i) => (
            <li key={i}>
              <button type="button" className={`${i === sel ? 'on' : ''}${i === failing ? ' bad' : ''}`} aria-current={i === sel ? 'step' : undefined} onClick={() => setSel(i)}>
                <span className="qa-n">{i + 1}</span>
                <span className="qa-t">
                  {s.text}
                  {i === failing && <b className="qa-flag"> {t('Failed here')}</b>}
                </span>
                <span className="qa-d">{s.ms !== undefined ? seconds(s.ms) : ''}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="btns">
          {onBug && entry.status === 'fail' && (
            <button type="button" className="btn" onClick={onBug}>
              {t('Mark as bug')}
            </button>
          )}
          <button type="button" className="btn p" onClick={onClose}>
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  )
}
