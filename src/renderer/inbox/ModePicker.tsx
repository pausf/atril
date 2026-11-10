import { useId } from 'react'
import { useT } from '../ui'

/** W61: Manual stops at the spec and plan; Automático goes on to build. Each option carries its own line. */
export function ModePicker({ auto, onChange, disabled }: { auto: boolean; onChange: (auto: boolean) => void; disabled?: boolean }) {
  const t = useT()
  const id = useId()
  const options = [
    { value: false, title: t('Manual'), line: t('Se para con la spec y el plan escritos y te pregunta') },
    { value: true, title: t('Automático'), line: t('Sin parar en spec y plan; antes de subir te pregunta') }
  ]
  return (
    <div className="f">
      <span className="lbl">{t('Modo')}</span>
      <span className="modes" role="radiogroup" aria-label={t('Modo')}>
        {options.map((o) => (
          <label key={String(o.value)} className="mode-card">
            <input
              type="radio"
              name="start-mode"
              checked={auto === o.value}
              disabled={disabled}
              aria-labelledby={`${id}-${String(o.value)}-t`}
              aria-describedby={`${id}-${String(o.value)}`}
              onChange={() => onChange(o.value)}
            />
            <b id={`${id}-${String(o.value)}-t`}>{o.title}</b>
            <span id={`${id}-${String(o.value)}`}>{o.line}</span>
          </label>
        ))}
      </span>
    </div>
  )
}
