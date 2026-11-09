import type { JiraIssue, NextItem, WorkspaceView } from '../../preload/api'

const MAX = 6

interface Chip {
  item: NextItem
  id: string
  label: string
  cls: 'agent' | 'task'
}

interface Props {
  items: NextItem[]
  workspaces: WorkspaceView[]
  issues: JiraIssue[]
  onOpen: (item: NextItem) => void
}

/** «Qué me toca»: the agents waiting for the person, then the tasks waiting to start. */
export function NextUpStrip({ items, workspaces, issues, onOpen }: Props) {
  const chips = items.flatMap((item): Chip[] => {
    if (item.kind === 'agent') {
      const ws = workspaces.find((w) => w.id === item.id)
      return ws ? [{ item, id: item.id, label: `${ws.branch} te necesita`, cls: 'agent' }] : []
    }
    return issues.some((i) => i.key === item.key) ? [{ item, id: item.key, label: `${item.key} por empezar`, cls: 'task' }] : []
  })
  if (chips.length === 0) return null
  return (
    <nav className="nextup" aria-label="Qué me toca">
      <b>Qué me toca</b>
      {chips.slice(0, MAX).map((c) => (
        <button key={`${c.cls}-${c.id}`} type="button" className={`nx ${c.cls}`} onClick={() => onOpen(c.item)}>
          {c.label}
        </button>
      ))}
      {chips.length > MAX && <span className="more">+{chips.length - MAX}</span>}
      <span className="hint-key">⌘↩ siguiente</span>
    </nav>
  )
}
