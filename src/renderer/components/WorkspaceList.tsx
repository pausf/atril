import { useT } from '../ui'
import { StateLabel } from './StateLabel'
import { useState } from 'react'
import type { RemoveResult, WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates, useLatestActivity } from '../agents'
import { runningCount, useSubagents } from '../subagents'
import { localiseActivity } from '../../preload/activity-i18n'
import { QuickReplies, useAsking } from './QuickReplies'
import { Problem } from './Problem'

interface Props {
  workspaces: WorkspaceView[]
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<RemoveResult>
  onForget: (id: string) => Promise<RemoveResult>
}

export function WorkspaceList({ workspaces, selected, onSelect, onRemove, onForget }: Props) {
  const t = useT()
  const [refusal, setRefusal] = useState<{ id: string; result: Exclude<RemoveResult, { ok: true }> } | null>(null)
  // W136: a live agent is only stopped after a second, explicit «Cerrar».
  const [confirming, setConfirming] = useState<string | null>(null)
  const states = useAgentStates()
  const subs = useSubagents(workspaces.map((w) => w.id))
  const latest = useLatestActivity()
  const [asking, markAsking] = useAsking()

  const [closing, setClosing] = useState<string | null>(null)
  const close = (id: string, act: (id: string) => Promise<RemoveResult>): void => {
    setConfirming(null)
    // Closing ends tmux and runs git: seconds with no feedback invite a second click.
    setClosing(id)
    void act(id)
      .then((r) => setRefusal('error' in r ? { id, result: r } : null))
      .finally(() => setClosing(null))
  }

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
            onClick={() => (w.alive ? setConfirming(w.id) : close(w.id, onRemove))}
          >
            {t('Quitar')}
          </button>
          {confirming === w.id && (
            <div className="ws-confirm">
              <p>{t('¿Cerrar {branch}? Su agente se para y el trabajo pasa a Terminados.', { branch: w.branch })}</p>
              <button type="button" className="btn p" disabled={closing === w.id} onClick={() => close(w.id, onRemove)}>
                {closing === w.id ? t('Cerrando…') : t('Cerrar')}
              </button>
              <button type="button" className="btn" onClick={() => setConfirming(null)}>
                {t('Cancelar')}
              </button>
            </div>
          )}
          {refusal?.id === w.id && (
            <Problem
              what={refusal.result.error}
              cant={t('{branch} sigue en la lista.', { branch: w.branch })}
              fix={refusal.result.fix === 'terminal' ? t('Abrir en Terminal') : refusal.result.fix === 'forget' ? t('Quitar de la lista igualmente') : undefined}
              onFix={() => (refusal.result.fix === 'forget' ? close(w.id, onForget) : void window.atril.workspaces.terminal({ id: w.id }))}
              detail={refusal.result.detail ?? ''}
              busy={closing === w.id}
              onClose={() => setRefusal(null)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
