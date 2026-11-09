import { Icon, type IconName } from './Icon'

export type Screen = 'work' | 'tasks' | 'settings'

const ITEMS: { id: Screen; icon: IconName; label: string }[] = [
  { id: 'work', icon: 'work', label: 'Trabajo' },
  { id: 'tasks', icon: 'tasks', label: 'Tareas' },
  { id: 'settings', icon: 'settings', label: 'Ajustes' }
]

export function Rail({ screen, onChange }: { screen: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="rail" aria-label="Pantallas" data-tour="rail">
      {ITEMS.map((i) => (
        <button
          key={i.id}
          className={`ri${screen === i.id ? ' on' : ''}${i.id === 'settings' ? ' last' : ''}`}
          aria-current={screen === i.id ? 'page' : undefined}
          onClick={() => onChange(i.id)}
        >
          <Icon name={i.icon} size={22} />
          {i.label}
        </button>
      ))}
    </nav>
  )
}
