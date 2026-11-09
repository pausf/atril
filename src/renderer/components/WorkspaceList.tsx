import { useEffect, useState } from 'react'
import type { AgentState, WorkspaceView } from '../../preload/api'

const LABEL: Record<AgentState, string> = { working: 'trabajando', 'needs-you': 'te necesita', stopped: 'parado' }

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
}

export function WorkspaceList({ workspaces, selected, onSelect, onRemove }: Props) {
  const [refusal, setRefusal] = useState<{ id: string; text: string } | null>(null)
  const [states, setStates] = useState<Record<string, AgentState>>({})

  useEffect(() => {
    void window.atril.status.list().then(setStates)
    return window.atril.status.onChange((id, state) => setStates((s) => ({ ...s, [id]: state })))
  }, [])

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
            {(() => {
              const state = states[w.id] ?? (w.alive ? 'working' : 'stopped')
              return (
                <span className={`state ${state}`}>
                  <i /> {LABEL[state]}
                </span>
              )
            })()}
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
