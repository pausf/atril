import { useEffect, useRef } from 'react'
import { useT } from '../ui'

/** K24: leaving the editor with unsaved text asks first; Escape keeps editing. */
export function SkillLeaveDialog({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  const t = useT()
  const no = useRef<HTMLButtonElement>(null)
  useEffect(() => no.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onNo()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onNo])
  return (
    <div className="skw-back">
      <div className="skw" role="dialog" aria-modal="true" aria-label={t('You have unsaved changes. Discard them?')}>
        <h2>{t('You have unsaved changes. Discard them?')}</h2>
        <div className="skw-act">
          <button type="button" className="btn" onClick={onYes}>
            {t('Discard changes')}
          </button>
          <button ref={no} type="button" className="btn primary" onClick={onNo}>
            {t('Keep editing')}
          </button>
        </div>
      </div>
    </div>
  )
}
