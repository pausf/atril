import { useT } from '../ui'
import { StateLabel } from './StateLabel'
import { useState } from 'react'
import type { WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates, useLatestActivity } from '../agents'
import { runningCount, useSubagents } from '../subagents'
import { localiseActivity } from '../../preload/activity-i18n'
import { QuickReplies, useAsking } from './QuickReplies'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<string | null>
}

export function WorkspaceList({ workspaces, selected, onSelect, onRemove }: Props) {
  const t = useT()
  const [refusal, setRefusal] = useState<{ id: string; text: string } | null>(null)
  const states = useAgentStates()
  const subs = useSubagents(workspaces.map((w) => w.id))
  const latest = useLatestActivity()
  const [asking, markAsking] = useAsking()

  if (workspaces.length === 0) {
    return <div className="empty">{t('Aquí verás cada trabajo con su estado. Crea uno con «＋ Nuevo trabajo», arriba.')}</div>
  }
  return (
    <div className="ws-list">
      {workspaces.map((w) => (
        <div className={asking.has(w.id) ? 'ws-item asks' : 'ws-item'} key={w.id}>
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
            <StateLabel state={stateOf(states, w)} />
            {runningCount(subs[w.id]) > 0 && <span className="ws-subs">{runningCount(subs[w.id]) === 1 ? t('1 subagente') : t('{n} subagentes', { n: runningCount(subs[w.id]) })}</span>}
            {latest[w.id] && !asking.has(w.id) && (
              <span className="ws-act" title={latest[w.id] && localiseActivity(latest[w.id]!.text, t)}>
                {latest[w.id] && localiseActivity(latest[w.id]!.text, t)}
              </span>
            )}
          </button>
          {states[w.id] === 'needs-you' && (
            <QuickReplies
              workspaceId={w.id}
              activityAt={latest[w.id]?.at}
              question={latest[w.id] && localiseActivity(latest[w.id]!.text, t)}
              onShown={(shown) => markAsking(w.id, shown)}
            />
          )}
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
