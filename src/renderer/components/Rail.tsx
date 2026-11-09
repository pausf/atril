import { useT } from '../ui'
import { Icon, type IconName } from './Icon'

export type Screen = 'work' | 'tasks' | 'settings'

export function Rail({ screen, onChange }: { screen: Screen; onChange: (s: Screen) => void }) {
  const t = useT()
  const ITEMS: { id: Screen; icon: IconName; label: string }[] = [
    { id: 'work', icon: 'work', label: t('Trabajo') },
    { id: 'tasks', icon: 'tasks', label: t('Tareas') },
    { id: 'settings', icon: 'settings', label: t('Ajustes') }
  ]
  return (
    <nav className="rail" aria-label={t('Pantallas')} data-tour="rail">
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
