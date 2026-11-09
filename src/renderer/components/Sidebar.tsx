import type { Agent, Model, WorkspaceView } from '../../preload/api'
import { JiraSummary, type InboxState } from '../inbox/Inbox'
import { FoldSection } from './Fold'
import { Repos } from './Repos'
import { WorkspaceList } from './WorkspaceList'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
  onCreate: (repoId: string, branch: string, agent: Agent, model: Model) => Promise<string | null>
  inbox: InboxState
  onOpenTasks: () => void
}

export function Sidebar({ workspaces, selected, onSelect, onRemove, onCreate, inbox, onOpenTasks }: Props) {
  return (
    <aside className="col left">
      <JiraSummary inbox={inbox} onOpen={onOpenTasks} />
      <FoldSection id="work" title="Trabajo en marcha" count={workspaces.length} tour="workspaces">
        <p className="lead">Cada trabajo, con su agente.</p>
        <WorkspaceList workspaces={workspaces} selected={selected} onSelect={onSelect} onRemove={onRemove} />
      </FoldSection>
      <Repos onCreate={onCreate} />
    </aside>
  )
}
