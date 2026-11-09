import type { LangChoice } from '../../preload/i18n'
import { useT, useUi } from '../ui'

/** S14: each language under its own name; Sistema follows the Mac. */
export function Language() {
  const { ui, setLanguage } = useUi()
  const t = useT()
  const current = ui?.language ?? 'system'
  const choices: ReadonlyArray<{ value: LangChoice; label: string }> = [
    { value: 'es', label: 'Español' }, // i18n-ignore
    { value: 'en', label: 'English' },
    { value: 'system', label: t('Sistema') }
  ]
  return (
    <section className="scard" aria-labelledby="language-h">
      <h3 id="language-h">{t('Idioma')}</h3>
      <p className="hint2">{t('Sistema sigue el idioma de tu Mac.')}</p>
      <div className="seg" role="group" aria-label={t('Idioma')}>
        {choices.map((c) => (
          <button key={c.value} type="button" aria-pressed={current === c.value} onClick={() => setLanguage(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  )
}
