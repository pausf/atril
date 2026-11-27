import type { AgentState } from '../../preload/api'
import { useT } from '../ui'
import { Icon } from './Icon'

/** An agent's state as text with its icon: the same in the list, the «Todos» cards and the work header. */
export function StateLabel({ state, merged }: { state: AgentState; merged?: boolean }) {
  const t = useT()
  // W309, W336: a merged work says so instead of what its agent is doing.
  if (merged)
    return (
      <span className="state done">
        <Icon name="done" size={16} /> {t('Merged')}
      </span>
    )
  const LABEL: Record<AgentState, string> = { working: t('working'), 'needs-you': t('needs you'), done: t('done@@state'), paused: t('paused'), stopped: t('stopped') }
  return (
    <span className={`state ${state}`}>
      <Icon name={state} size={16} className={state === 'working' ? 'spin' : undefined} /> {LABEL[state]}
    </span>
  )
}
