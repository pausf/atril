import { useT } from '../ui'

/** «Uno · Todos» in Trabajo's header (W81). */
export function ViewSwitch({ all, onChange }: { all: boolean; onChange: (all: boolean) => void }) {
  const t = useT()
  return (
    <div className="seg view-switch" role="group" aria-label={t('Work view')} title={t('All agents (⌘⇧A)')}>
      <button type="button" aria-pressed={!all} onClick={() => onChange(false)}>
        {t('One')}
      </button>
      <button type="button" aria-pressed={all} onClick={() => onChange(true)}>
        {t('All')}
      </button>
    </div>
  )
}
