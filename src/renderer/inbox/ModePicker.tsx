import { useId } from 'react'
import { useT } from '../ui'

/** W61: Manual stops at the spec and plan; Automático goes on to build. Each option carries its own line. */
export function ModePicker({ auto, onChange, disabled }: { auto: boolean; onChange: (auto: boolean) => void; disabled?: boolean }) {
  const t = useT()
  const id = useId()
  const options = [
    { value: false, title: t('Manual'), line: t('Stops once the spec and plan are written and asks you') },
    { value: true, title: t('Auto'), line: t('No stop at spec and plan; asks before pushing') }
  ]
  return (
    <div className="f">
      <span className="lbl">{t('Mode')}</span>
      <span className="modes" role="radiogroup" aria-label={t('Mode')}>
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
