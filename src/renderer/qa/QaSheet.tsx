import { useRef } from 'react'
import type { QaCriterion, QaPictureReason, QaPictureRow, QaPublishResult } from '../../preload/api'
import { fixLabel, Problem } from '../components/Problem'
import { useModalKeys } from '../flow/modalKeys'
import { useT } from '../ui'

type Fail = Exclude<QaPublishResult, { url: string }>
type T = ReturnType<typeof useT>

const reasonText = (t: T, r: QaPictureReason | undefined): string =>
  ({
    'not-png': t('no es una imagen PNG'),
    'too-big': t('pesa más de 5 MB'),
    'too-many': t('pasa de 20 imágenes'),
    unreadable: t('no se ha podido leer'),
    token: t('muestra algo que parece un token'),
    email: t('muestra un correo'),
    host: t('muestra una dirección de servidor'),
    path: t('muestra una ruta de tu disco'),
    machine: t('muestra el nombre de tu Mac o de tu usuario')
  })[r ?? 'unreadable']

/** W251: every picture exactly as it would leave, the blocked ones with why; nothing goes until «Enviar». */
export function QaSheet({ rows, criteria, busy, fail, onSend, onFix, onClose }: { rows: QaPictureRow[]; criteria: QaCriterion[]; busy: boolean; fail: Fail | null; onSend: () => void; onFix: () => void; onClose: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const keys = useModalKeys(dialog, onClose)
  const n = rows.filter((r) => r.verdict === 'send').length
  const send = n === 0 ? t('Publicar sin imágenes') : n === 1 ? t('Enviar 1 imagen') : t('Enviar {n} imágenes', { n })

  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg qa-dlg" role="dialog" aria-modal="true" aria-labelledby="qa-sheet-title" ref={dialog} tabIndex={-1}>
        <div className="qa-dhead">
          <h3 id="qa-sheet-title">{t('Lo que irá a la MR')}</h3>
          <button type="button" className="btn" onClick={onClose}>
            {t('Cerrar')}
          </button>
        </div>
        <p className="qa-sub">{t('Atril ha leído cada captura en tu Mac. Mira que ninguna muestre datos reales antes de enviar.')}</p>
        <ul className="qa-sheet">
          {rows.map((r) => (
            <li key={r.id} className={r.verdict === 'send' ? '' : 'off'}>
              <div className="qa-sheet-t">
                <b>{r.id}</b> {criteria.find((c) => c.id === r.id)?.text ?? ''}
              </div>
              {r.src && <img src={r.src} alt={r.id} />}
              <span className="qa-sheet-v">{r.verdict === 'send' ? t('Se envía') : t('No se envía: {reason}', { reason: reasonText(t, r.reason) })}</span>
            </li>
          ))}
        </ul>
        {fail && <Problem what={fail.error} cant={t('La QA no ha llegado a la MR.')} fix={fail.fix === 'recheck' ? t('Revisar otra vez') : fixLabel(t, fail.fix)} busy={busy} onFix={onFix} detail={fail.detail ?? ''} />}
        <div className="btns">
          <button type="button" className="btn p" disabled={busy} onClick={onSend}>
            {send}
          </button>
        </div>
      </div>
    </div>
  )
}
