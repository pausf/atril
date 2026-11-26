import { useRef, useState } from 'react'
import type { SubagentEntry, SubagentLine } from '../../preload/api'
import { useT } from '../ui'
import { duration } from './Subagents'

export interface SubView {
  workspaceId: string
  entries: SubagentEntry[]
  /** The panel's clock, in ms. */
  now: number
  /** «trabajando · {d}» or «terminado · {d}». */
  state: (e: SubagentEntry) => string
  open: (id: string) => void
}

/** F41: the last non-empty line of a log, or null; a thinking line reads as the caller's «Pensando…». */
function lastLine(log: SubagentLine[]): string | 'thinking' | null {
  for (const l of [...log].reverse()) {
    if (l.kind === 'thinking') return 'thinking'
    const line = l.text.split('\n').findLast((r) => r.trim() !== '')
    if (line) return line
  }
  return null
}

/** F27/F41: the subagents as branches of a box; on hover or focus the description gives way to the last thing each did. */
export function Branches({ view }: { view: SubView }) {
  const t = useT()
  const [peek, setPeek] = useState<{ id: string; text: string } | null>(null)
  const asked = useRef(0)
  // Hover then focus (a click) is one entry, not two asks.
  const inside = useRef<string | null>(null)

  const enter = (id: string): void => {
    if (inside.current === id) return
    inside.current = id
    const n = ++asked.current
    setPeek(null)
    void window.atril.subagents.log(view.workspaceId, id).then((log) => {
      if (asked.current !== n) return
      const line = lastLine(log)
      setPeek(line ? { id, text: line === 'thinking' ? t('Thinking…') : line } : null)
    })
  }
  const leave = (): void => {
    inside.current = null
    asked.current++
    setPeek(null)
  }

  return (
    <ul className="sbr-list" aria-label={t('Subagents')} data-tour="flow-subagents">
      {[...view.entries]
        .sort((a, b) => b.startedAt - a.startedAt)
        .map((e) => {
          const title = e.description || e.type
          const ended = e.endedAt !== undefined
          const last = peek?.id === e.id ? peek.text : null
          const secs = ended ? e.endedAt! - e.startedAt : view.now / 1000 - e.startedAt
          return (
            <li key={e.id}>
              <button
                type="button"
                className="sbr"
                aria-label={`${title}${e.description ? `, ${e.type}` : ''}, ${view.state(e)}`}
                onClick={() => view.open(e.id)}
                onMouseEnter={() => enter(e.id)}
                onMouseLeave={leave}
                onFocus={() => enter(e.id)}
                onBlur={leave}
              >
                {ended ? <span className="sbr-ok" aria-hidden="true">✓</span> : <i className="sbr-dot" aria-hidden="true" />}
                <span className="sbr-body">
                  <b>{e.description ? e.type : title}</b>
                  {last ? <span className="sbr-act">{last}</span> : e.description && <span className="sbr-d">{e.description}</span>}
                </span>
                <span className="sbr-tm">{duration(t, secs)}</span>
              </button>
            </li>
          )
        })}
    </ul>
  )
}
