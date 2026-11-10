import { useT } from '../ui'

/** «Uno · Todos» in Trabajo's header (W81). */
export function ViewSwitch({ all, onChange }: { all: boolean; onChange: (all: boolean) => void }) {
  const t = useT()
  return (
    <div className="seg view-switch" role="group" aria-label={t('Vista de trabajo')} title={t('Todos los agentes (⌘⇧A)')}>
      <button type="button" aria-pressed={!all} onClick={() => onChange(false)}>
        {t('Uno')}
      </button>
      <button type="button" aria-pressed={all} onClick={() => onChange(true)}>
        {t('Todos')}
      </button>
    </div>
  )
}
