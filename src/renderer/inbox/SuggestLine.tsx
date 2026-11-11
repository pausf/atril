import type { Effort, Model } from '../../preload/api'
import { effortOptions } from '../components/models'
import { useT } from '../ui'
import type { Suggestion } from './suggest'

const NAMES: Record<Model, string> = { default: '', opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' }

/** W139: shown only while the choice differs from the suggestion; «Usar» is the only way it changes anything. */
export function SuggestLine({ suggestion, model, effort, onUse }: { suggestion: Suggestion | null; model: Model; effort: Effort; onUse: (s: Suggestion) => void }) {
  const t = useT()
  if (!suggestion || (suggestion.model === model && suggestion.effort === effort)) return null
  const level = effortOptions(t).find((o) => o.value === suggestion.effort)?.label ?? suggestion.effort
  return (
    <div className="f-note">
      {t('Sugerido: {model} · {effort}', { model: NAMES[suggestion.model], effort: level })}. {suggestion.why}{' '}
      <button type="button" className="linklike" onClick={() => onUse(suggestion)}>
        {t('Usar')}
      </button>
    </div>
  )
}
