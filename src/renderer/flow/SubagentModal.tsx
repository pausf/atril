import { useEffect, useRef, useState } from 'react'
import type { SubagentEntry, SubagentLine } from '../../preload/api'
import { useT } from '../ui'
import { useModalKeys } from './modalKeys'

interface Props {
  workspaceId: string
  entry: SubagentEntry
  /** «trabajando · {d}» as the row shows it, so both tick on the panel's clock. */
  state: string
  onClose: () => void
}

const PREFIX: Record<SubagentLine['kind'], string> = { prompt: '> ', text: '⏺ ', tool: '⏺ ', result: '⎿ ', thinking: '✻ ' }

/** F28: a subagent's own transcript, read-only and Claude Code style; asked again every second while it runs. */
export function SubagentModal({ workspaceId, entry, state, onClose }: Props) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<SubagentLine[] | null>(null)
  const keys = useModalKeys(dialog, onClose)
  const ended = entry.endedAt !== undefined

  // A flip to ended reruns this once more and leaves no timer behind.
  useEffect(() => {
    let live = true
    const load = (): void => void window.atril.subagents.log(workspaceId, entry.id).then((l) => live && setLines(l))
    load()
    const timer = ended ? undefined : setInterval(load, 1000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [workspaceId, entry.id, ended])

  const title = entry.description || entry.type
  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg edmodal submodal" role="dialog" aria-modal="true" aria-labelledby="sub-title" ref={dialog} tabIndex={-1}>
        <div className="edhead">
          <h3 id="sub-title">{title}</h3>
          <span className="docchange">
            {entry.type} · {state}
          </span>
          <span className="sp" />
          <button type="button" className="btn" onClick={onClose}>
            {t('Close')}
          </button>
        </div>
        <div className="term sublog" role="log" aria-label={t('Log of {name}', { name: title })} tabIndex={0}>
          {lines?.length === 0 && <div className="s">{t('No log for this subagent')}</div>}
          {lines?.flatMap((l, i) => {
            const [first = '', ...rest] = l.kind === 'thinking' ? [t('Thinking…')] : l.text.split('\n')
            return [
              <div key={i} className={`sl ${l.kind}`}>
                <span className="slp">{PREFIX[l.kind]}</span>
                {first}
              </div>,
              ...rest.map((r, j) => (
                <div key={`${i}.${j}`} className="sl cont">
                  {r}
                </div>
              )),
              ...(l.more ? [<div key={`${i}+`} className="sl cont s">{t('… +{n} lines', { n: l.more })}</div>] : [])
            ]
          })}
        </div>
      </div>
    </div>
  )
}
