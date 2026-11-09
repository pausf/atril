import { useT } from '../ui'
import { Icon, type IconName } from './Icon'

export type Screen = 'work' | 'tasks' | 'mr' | 'settings'

/** `reviews`: MRs waiting for your review in the latest load; shown when not zero (M9). */
export function Rail({ screen, onChange, reviews = 0 }: { screen: Screen; onChange: (s: Screen) => void; reviews?: number }) {
  const t = useT()
  const ITEMS: { id: Screen; icon: IconName; label: string }[] = [
    { id: 'work', icon: 'work', label: t('Trabajo') },
    { id: 'tasks', icon: 'tasks', label: t('Tareas') },
    { id: 'mr', icon: 'mr', label: t('MR') },
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
          aria-label={i.id === 'mr' && reviews > 0 ? t('MR: {n} por revisar', { n: reviews }) : undefined}
        >
          <Icon name={i.icon} size={22} />
          {i.label}
          {i.id === 'mr' && reviews > 0 && <span className="rbadge">{reviews}</span>}
        </button>
      ))}
    </nav>
  )
}
