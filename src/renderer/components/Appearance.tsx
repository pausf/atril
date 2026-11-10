import type { Palette, Theme } from '../../preload/api'
import { useT, useUi } from '../ui'

export function Appearance() {
  const { ui, setTheme, setPalette } = useUi()
  const t = useT()
  const CHOICES: ReadonlyArray<{ value: Theme; label: string }> = [
    { value: 'light', label: t('Claro') },
    { value: 'dark', label: t('Oscuro') },
    { value: 'auto', label: t('Automático') }
  ]
  const PALETTES: ReadonlyArray<{ value: Palette; label: string }> = [
    { value: 'original', label: t('Original') },
    { value: 'grafito', label: t('Grafito') }
  ]
  const current = ui?.theme ?? 'auto'
  const palette = ui?.palette ?? 'original'
  return (
    <section className="scard" aria-labelledby="appearance-h" data-tour="appearance">
      <h3 id="appearance-h">{t('Apariencia')}</h3>
      <p className="hint2">{t('Automático sigue la apariencia de tu Mac y cambia en cuanto tú la cambias.')}</p>
      <div className="seg" role="group" aria-label={t('Paleta')}>
        {PALETTES.map((c) => (
          <button key={c.value} type="button" aria-pressed={palette === c.value} onClick={() => setPalette(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label={t('Tema')}>
        {CHOICES.map((c) => (
          <button key={c.value} type="button" aria-pressed={current === c.value} onClick={() => setTheme(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  )
}
