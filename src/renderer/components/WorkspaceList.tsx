import { useT } from '../ui'
import { Icon } from './Icon'
import { useEffect, useState } from 'react'
import type { ActivityLine, AgentState, WorkspaceView } from '../../preload/api'
import { runningCount, useSubagents } from '../subagents'
import { localiseActivity } from '../../preload/activity-i18n'
import { QuickReplies } from './QuickReplies'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
}

export function WorkspaceList({ workspaces, selected, onSelect, onRemove }: Props) {
  const t = useT()
  const LABEL: Record<AgentState, string> = { working: t('trabajando'), 'needs-you': t('te necesita'), stopped: t('parado') }
  const [refusal, setRefusal] = useState<{ id: string; text: string } | null>(null)
  const [states, setStates] = useState<Record<string, AgentState>>({})

  const subs = useSubagents(workspaces.map((w) => w.id))
  const [latest, setLatest] = useState<Record<string, ActivityLine>>({})

  useEffect(() => {
    void window.atril.activity.latest().then(setLatest)
    return window.atril.activity.onChange((id, lines) =>
      setLatest((l) => {
        const next = { ...l }
        if (lines[0]) next[id] = lines[0]
        else delete next[id]
        return next
      })
    )
  }, [])

  useEffect(() => {
    void window.atril.status.list().then(setStates)
    return window.atril.status.onChange((id, state) => setStates((s) => ({ ...s, [id]: state })))
  }, [])

  if (workspaces.length === 0) {
    return <div className="empty">{t('Aquí verás cada trabajo con su estado. Crea uno con «＋ Nuevo trabajo», arriba.')}</div>
  }
  return (
    <div className="ws-list">
      {workspaces.map((w) => (
        <div className="ws-item" key={w.id}>
          <button type="button" className="ws-row" aria-pressed={selected === w.id} onClick={() => onSelect(w.id)}>
            <span className="ws-branch">{w.branch}</span>
            <span className="ws-meta">
              {w.repoId} · {w.agent}
              {w.model && w.model !== 'default' && ` · ${w.model}`}
              {w.auto === true && (
                <>
                  {' · '}
                  <span className="auto-badge">{t('Auto')}</span>
                </>
              )}
            </span>
            {(() => {
              const state = states[w.id] ?? (w.alive ? 'working' : 'stopped')
              return (
                <span className={`state ${state}`}>
                  <Icon name={state} size={16} className={state === 'working' ? 'spin' : undefined} /> {LABEL[state]}
                </span>
              )
            })()}
            {runningCount(subs[w.id]) > 0 && <span className="ws-subs">{runningCount(subs[w.id]) === 1 ? t('1 subagente') : t('{n} subagentes', { n: runningCount(subs[w.id]) })}</span>}
            {latest[w.id] && (
              <span className="ws-act" title={latest[w.id] && localiseActivity(latest[w.id]!.text, t)}>
                {latest[w.id] && localiseActivity(latest[w.id]!.text, t)}
              </span>
            )}
          </button>
          {states[w.id] === 'needs-you' && <QuickReplies workspaceId={w.id} activityAt={latest[w.id]?.at} />}
          <button
            type="button"
            className="ws-remove"
            aria-label={t('Quitar {branch}', { branch: w.branch })}
            onClick={() => void onRemove(w.id).then((text) => setRefusal(text ? { id: w.id, text } : null))}
          >
            {t('Quitar')}
          </button>
          {refusal?.id === w.id && <div className="bad">{refusal.text}</div>}
        </div>
      ))}
    </div>
  )
}
