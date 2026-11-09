import { useT } from '../ui'

/** W61: Manual stops at the spec and plan; Automático goes on to build. */
export function ModePicker({ auto, onChange, disabled }: { auto: boolean; onChange: (auto: boolean) => void; disabled?: boolean }) {
  const t = useT()
  return (
    <>
      <div className="f">
        <span className="lbl">{t('Modo')}</span>
        <span className="modes" role="radiogroup" aria-label={t('Modo')}>
          {[false, true].map((value) => (
            <label key={String(value)}>
              <input type="radio" name="start-mode" checked={auto === value} disabled={disabled} onChange={() => onChange(value)} />{' '}
              {value ? t('Automático') : t('Manual')}
            </label>
          ))}
        </span>
      </div>
      <div className="f-note">{t('Automático: sin parar en spec y plan; antes de subir te pregunta')}</div>
    </>
  )
}
