import { useT } from '../ui'
import { Icon } from './Icon'
import { useState } from 'react'
import type { AgentState, WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates, useLatestActivity } from '../agents'
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
  const LABEL: Record<AgentState, string> = { working: t('trabajando'), 'needs-you': t('te necesita'), paused: t('en pausa'), stopped: t('parado') }
  const [refusal, setRefusal] = useState<{ id: string; text: string } | null>(null)
  const states = useAgentStates()
  const subs = useSubagents(workspaces.map((w) => w.id))
  const latest = useLatestActivity()

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
              {w.repoId} · {w.mode === 'review' ? `${t('Revisión')} · ` : ''}{w.agent}
              {w.model && w.model !== 'default' && ` · ${w.model}`}
              {w.auto === true && (
                <>
                  {' · '}
                  <span className="auto-badge">{t('Auto')}</span>
                </>
              )}
            </span>
            {(() => {
              const state = stateOf(states, w)
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
