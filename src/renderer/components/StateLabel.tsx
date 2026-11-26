import type { AgentState } from '../../preload/api'
import { useT } from '../ui'
import { Icon } from './Icon'

/** An agent's state as text with its icon: the same in the list, the «Todos» cards and the work header. */
export function StateLabel({ state }: { state: AgentState }) {
  const t = useT()
  const LABEL: Record<AgentState, string> = { working: t('working'), 'needs-you': t('needs you'), done: t('done@@state'), paused: t('paused'), stopped: t('stopped') }
  return (
    <span className={`state ${state}`}>
      <Icon name={state} size={16} className={state === 'working' ? 'spin' : undefined} /> {LABEL[state]}
    </span>
  )
}
