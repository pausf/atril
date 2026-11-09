import type { Agent, WorkspaceView } from '../../preload/api'
import { Repos } from './Repos'
import { WorkspaceList } from './WorkspaceList'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
  onCreate: (repoId: string, branch: string, agent: Agent) => Promise<string | null>
}

export function Sidebar({ workspaces, selected, onSelect, onRemove, onCreate }: Props) {
  return (
    <aside className="col left">
      <section>
        <h2>
          Mis Jira <span className="n">0</span>
        </h2>
        <p className="lead">Asignadas a ti en el sprint activo.</p>
        <div className="empty">
          Aquí saldrán tus Jira. Pulsa «Empezar» en una y Atril creará la rama y lanzará al agente.
        </div>
      </section>
      <section className="sec">
        <h2>
          Trabajo en marcha <span className="n">{workspaces.length}</span>
        </h2>
        <p className="lead">Cada trabajo, con su agente.</p>
        <WorkspaceList workspaces={workspaces} selected={selected} onSelect={onSelect} onRemove={onRemove} />
        <Repos onCreate={onCreate} />
      </section>
    </aside>
  )
}
