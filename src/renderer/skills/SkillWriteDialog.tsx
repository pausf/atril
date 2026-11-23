import { useEffect, useRef, useState } from 'react'
import { useT } from '../ui'

/** K16: the first time Atril writes to Claude Code's settings it says which file, key and value. */
export function SkillWriteDialog({ file, keyName, value, onYes, onNo }: { file: string; keyName: string; value: string; onYes: (never: boolean) => void; onNo: () => void }) {
  const t = useT()
  const yes = useRef<HTMLButtonElement>(null)
  const [never, setNever] = useState(false)
  useEffect(() => yes.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onNo()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onNo])
  return (
    <div className="skw-back">
      <div className="skw" role="dialog" aria-modal="true" aria-label={t('Atril va a cambiar tus ajustes de Claude Code')}>
        <h2>{t('Atril va a cambiar tus ajustes de Claude Code')}</h2>
        <dl>
          <dt>{t('Archivo')}</dt>
          <dd>
            <code>{file}</code>
          </dd>
          <dt>{t('Clave')}</dt>
          <dd>
            <code>{keyName}</code>
          </dd>
          <dt>{t('Valor')}</dt>
          <dd>
            <code>{value}</code>
          </dd>
        </dl>
        <label>
          <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} />
          {t('No volver a preguntar')}
        </label>
        <div className="skw-act">
          <button type="button" className="btn" onClick={onNo}>
            {t('Cancelar')}
          </button>
          <button ref={yes} type="button" className="btn primary" onClick={() => onYes(never)}>
            {t('Cambiar')}
          </button>
        </div>
      </div>
    </div>
  )
}
