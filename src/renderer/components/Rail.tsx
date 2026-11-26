import { useT } from '../ui'
import { Icon, type IconName } from './Icon'

export type Screen = 'work' | 'tasks' | 'mr' | 'libretto' | 'qa' | 'avisos' | 'skills' | 'settings'

/** `reviews`: MRs waiting for your review in the latest load (M9); `unread`: unread notices. Each shown when not zero. */
export function Rail({ screen, onChange, reviews = 0, unread = 0 }: { screen: Screen; onChange: (s: Screen) => void; reviews?: number; unread?: number }) {
  const t = useT()
  const ITEMS: { id: Screen; icon: IconName; label: string }[] = [
    { id: 'work', icon: 'work', label: t('Work') },
    { id: 'tasks', icon: 'tasks', label: t('Tasks') },
    { id: 'mr', icon: 'mr', label: t('MR') },
    { id: 'libretto', icon: 'libretto', label: t('Libretto') },
    { id: 'qa', icon: 'qa', label: t('QA') },
    { id: 'avisos', icon: 'avisos', label: t('Notices') },
    { id: 'skills', icon: 'skills', label: t('Skills') },
    { id: 'settings', icon: 'settings', label: t('Settings') }
  ]
  const badge: Partial<Record<Screen, { n: number; name: string }>> = {
    mr: { n: reviews, name: t('MR: {n} to review', { n: reviews }) },
    avisos: { n: unread, name: t('Notices: {n} unread', { n: unread }) }
  }
  return (
    <nav className="rail" aria-label={t('Screens')} data-tour="rail">
      {ITEMS.map((i) => {
        const b = badge[i.id]
        return (
          <button
            key={i.id}
            className={`ri${screen === i.id ? ' on' : ''}${i.id === 'settings' ? ' last' : ''}`}
            aria-current={screen === i.id ? 'page' : undefined}
            onClick={() => onChange(i.id)}
            aria-label={b && b.n > 0 ? b.name : undefined}
          >
            <Icon name={i.icon} size={22} />
            {i.label}
            {b && b.n > 0 && <span className="rbadge">{b.n}</span>}
          </button>
        )
      })}
    </nav>
  )
}
