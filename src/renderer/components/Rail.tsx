export type Screen = 'work' | 'tasks' | 'settings'

const ITEMS: { id: Screen; icon: string; label: string }[] = [
  { id: 'work', icon: '⌂', label: 'Trabajo' },
  { id: 'tasks', icon: '☑', label: 'Tareas' },
  { id: 'settings', icon: '⚙', label: 'Ajustes' }
]

export function Rail({ screen, onChange }: { screen: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="rail" aria-label="Pantallas">
      {ITEMS.map((i) => (
        <button
          key={i.id}
          className={`ri${screen === i.id ? ' on' : ''}${i.id === 'settings' ? ' last' : ''}`}
          aria-current={screen === i.id ? 'page' : undefined}
          onClick={() => onChange(i.id)}
        >
          <span className="ic" aria-hidden>
            {i.icon}
          </span>
          {i.label}
        </button>
      ))}
    </nav>
  )
}
