import type { RemoveResult, StateProblem, WorkspaceView } from '../../preload/api'
import { useT } from '../ui'
import { JiraSummary, type InboxState } from '../inbox/Inbox'
import { FoldSection } from './Fold'
import { History } from './History'
import { WorkspaceList } from './WorkspaceList'

interface Props {
  workspaces: WorkspaceView[]
  problem: StateProblem | null
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<RemoveResult>
  onForget: (id: string) => Promise<RemoveResult>
  inbox: InboxState
  onOpenTasks: () => void
  onNewWork: () => void
}

export function Sidebar({ workspaces, problem, selected, onSelect, onRemove, onForget, inbox, onOpenTasks, onNewWork }: Props) {
  const t = useT()
  return (
    <aside className="col left">
      <button type="button" className="new-work" onClick={onNewWork} data-tour="new-work">
        {t('＋ New work')}
      </button>
      <JiraSummary inbox={inbox} onOpen={onOpenTasks} />
      <FoldSection id="work" title={t('Work in progress')} count={workspaces.length} tour="workspaces">
        <p className="lead">{t('Each workspace, with its agent.')}</p>
        <WorkspaceList workspaces={workspaces} problem={problem} selected={selected} onSelect={onSelect} onRemove={onRemove} onForget={onForget} />
      </FoldSection>
      <History />
    </aside>
  )
}
