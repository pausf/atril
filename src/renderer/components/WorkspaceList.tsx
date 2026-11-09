import { useState } from 'react'
import type { WorkspaceView } from '../../preload/api'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
}

export function WorkspaceList({ workspaces, selected, onSelect, onRemove }: Props) {
  const [refusal, setRefusal] = useState<{ id: string; text: string } | null>(null)

  if (workspaces.length === 0) {
    return <div className="empty">Aquí verás cada trabajo con su estado. Crea uno con «Nuevo trabajo» en un repo.</div>
  }
  return (
    <div className="ws-list">
      {workspaces.map((w) => (
        <div className="ws-item" key={w.id}>
          <button type="button" className="ws-row" aria-pressed={selected === w.id} onClick={() => onSelect(w.id)}>
            <span className="ws-branch">{w.branch}</span>
            <span className="ws-meta">
              {w.repoId} · {w.agent}
            </span>
            <span className={w.alive ? 'state on' : 'state off'}>
              <i /> {w.alive ? 'abierto' : 'parado'}
            </span>
          </button>
          <button
            type="button"
            className="ws-remove"
            onClick={() => void onRemove(w.id).then((text) => setRefusal(text ? { id: w.id, text } : null))}
          >
            Quitar
          </button>
          {refusal?.id === w.id && <div className="bad">{refusal.text}</div>}
        </div>
      ))}
    </div>
  )
}
