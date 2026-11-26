import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useModalKeys } from '../flow/modalKeys'
import { useT } from '../ui'

/** M42: the in-app question before merging; focus starts on «Cancelar» and Escape cancels it alone (M43). */
export function MergeConfirm({ title, target, busy, onYes, onNo }: { title: string; target: string; busy: boolean; onYes: () => void; onNo: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const keys = useModalKeys(dialog, onNo)
  useEffect(() => cancel.current?.focus(), [])
  return (
    <div className="modal" onKeyDown={(e: KeyboardEvent) => void keys(e)}>
      <div className="dlg mr-confirm" role="dialog" aria-modal="true" aria-labelledby="mr-confirm-title" ref={dialog} tabIndex={-1}>
        <h3 id="mr-confirm-title">{t('Merge «{title}» into {target}?', { title, target })}</h3>
        <div className="mr-confirm-actions">
          <button ref={cancel} type="button" className="btn" onClick={onNo}>
            {t('Cancel')}
          </button>
          <button type="button" className="btn p" disabled={busy} onClick={onYes}>
            {t('Merge')}
          </button>
        </div>
      </div>
    </div>
  )
}
