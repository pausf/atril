import { useEffect } from 'react'
import { useT } from '../ui'

/** K33: «Quitar» asks before it runs; nothing is removed on Cancelar or Escape. */
export function PluginRemoveDialog({ plugin, onYes, onNo }: { plugin: string; onYes: () => void; onNo: () => void }) {
  const t = useT()
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onNo()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onNo])
  return (
    <div className="skw-back">
      <div className="skw" role="dialog" aria-modal="true" aria-label={t('Quitar plugin')}>
        <h2>{t('¿Quitar {plugin}? Sus skills dejan de cargarse.', { plugin })}</h2>
        <div className="skw-act">
          <button type="button" className="btn" onClick={onNo} autoFocus>
            {t('Cancelar')}
          </button>
          <button type="button" className="btn primary" onClick={onYes}>
            {t('Quitar')}
          </button>
        </div>
      </div>
    </div>
  )
}
