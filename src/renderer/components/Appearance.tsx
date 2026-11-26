import type { Palette, Theme } from '../../preload/api'
import { useT, useUi } from '../ui'

export function Appearance() {
  const { ui, setTheme, setPalette } = useUi()
  const t = useT()
  const CHOICES: ReadonlyArray<{ value: Theme; label: string }> = [
    { value: 'light', label: t('Light') },
    { value: 'dark', label: t('Dark') },
    { value: 'auto', label: t('Auto') }
  ]
  const PALETTES: ReadonlyArray<{ value: Palette; label: string }> = [
    { value: 'original', label: t('Original') },
    { value: 'grafito', label: t('Graphite') }
  ]
  const current = ui?.theme ?? 'auto'
  const palette = ui?.palette ?? 'original'
  return (
    <section className="scard" aria-labelledby="appearance-h" data-tour="appearance">
      <h3 id="appearance-h">{t('Appearance')}</h3>
      <p className="hint2">{t("Auto follows your Mac's appearance and changes as soon as you change it.")}</p>
      <div className="arow">
        <span className="alabel" aria-hidden>
          {t('Palette')}
        </span>
        <div className="seg" role="group" aria-label={t('Palette')}>
          {PALETTES.map((c) => (
            <button key={c.value} type="button" aria-pressed={palette === c.value} onClick={() => setPalette(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="arow">
        <span className="alabel" aria-hidden>
          {t('Theme')}
        </span>
        <div className="seg" role="group" aria-label={t('Theme')}>
          {CHOICES.map((c) => (
            <button key={c.value} type="button" aria-pressed={current === c.value} onClick={() => setTheme(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
