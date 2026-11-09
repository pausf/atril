import type { Theme } from '../../preload/api'
import { useUi } from '../ui'

const CHOICES: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'auto', label: 'Automático' }
]

export function Appearance() {
  const { ui, setTheme } = useUi()
  const current = ui?.theme ?? 'auto'
  return (
    <section className="scard" aria-labelledby="appearance-h" data-tour="appearance">
      <h3 id="appearance-h">Apariencia</h3>
      <p className="hint2">Automático sigue la apariencia de tu Mac y cambia en cuanto tú la cambias.</p>
      <div className="seg" role="group" aria-label="Tema">
        {CHOICES.map((c) => (
          <button key={c.value} type="button" aria-pressed={current === c.value} onClick={() => setTheme(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  )
}
