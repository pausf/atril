import type { WorkspaceView } from '../../preload/api'
import { useT } from '../ui'
import { JiraSummary, type InboxState } from '../inbox/Inbox'
import { FoldSection } from './Fold'
import { WorkspaceList } from './WorkspaceList'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
  inbox: InboxState
  onOpenTasks: () => void
  onNewWork: () => void
}

export function Sidebar({ workspaces, selected, onSelect, onRemove, inbox, onOpenTasks, onNewWork }: Props) {
  const t = useT()
  return (
    <aside className="col left">
      <button type="button" className="new-work" onClick={onNewWork}>
        {t('＋ Nuevo trabajo')}
      </button>
      <JiraSummary inbox={inbox} onOpen={onOpenTasks} />
      <FoldSection id="work" title={t('Trabajo en marcha')} count={workspaces.length} tour="workspaces">
        <p className="lead">{t('Cada trabajo, con su agente.')}</p>
        <WorkspaceList workspaces={workspaces} selected={selected} onSelect={onSelect} onRemove={onRemove} />
      </FoldSection>
    </aside>
  )
}
