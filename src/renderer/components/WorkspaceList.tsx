import { useT } from '../ui'
import { StateLabel } from './StateLabel'
import { useContext, useEffect, useState } from 'react'
import type { RadarHit, RemoveResult, StateProblem, WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates, useLatestActivity } from '../agents'
import { runningCount, useSubagents } from '../subagents'
import { localiseActivity } from '../../preload/activity-i18n'
import { QuickReplies, useAsking } from './QuickReplies'
import { fixLabel, Problem, sharedFix } from './Problem'
import { NavigationContext } from '../settings/navigation'
import { useRadar } from '../radar'

/** W168: the first collision, how many files more, and every one of them on hover. */
function RadarLine({ hits = [] }: { hits?: RadarHit[] }) {
  const t = useT()
  const first = hits[0]
  if (!first?.files[0]) return null
  const vars = { branch: first.branch, file: first.files[0], n: hits.reduce((n, h) => n + h.files.length, 0) - 1 }
  return (
    <span className="ws-radar" title={hits.flatMap((h) => h.files.map((f) => `${h.branch}: ${f}`)).join('\n')}>
      {vars.n > 0 ? t('Choca con {branch} en {file} y {n} más', vars) : t('Choca con {branch} en {file}', vars)}
    </span>
  )
}

interface Props {
  workspaces: WorkspaceView[]
  /** W145: workspaces.json is damaged; shown instead of the empty state. */
  problem?: StateProblem | null
  selected: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => Promise<RemoveResult>
  onForget: (id: string) => Promise<RemoveResult>
}

// W187: «Cerrar su trabajo» from the Mac opens this list's own confirmation (W136).
let pendingClose: string | null = null
const closeAsks = new Set<(id: string) => void>()
export const askClose = (id: string): void => {
  pendingClose = id
  closeAsks.forEach((f) => f(id))
}

export function WorkspaceList({ workspaces, problem, selected, onSelect, onRemove, onForget }: Props) {
  const t = useT()
  const { openSettings } = useContext(NavigationContext)
  const [refusal, setRefusal] = useState<{ id: string; result: Exclude<RemoveResult, { ok: true }> } | null>(null)
  // W136: a live agent is only stopped after a second, explicit «Cerrar».
  const [confirming, setConfirming] = useState<string | null>(null)
  useEffect(() => {
    const take = (id: string): void => {
      pendingClose = null
      setConfirming(id)
    }
    if (pendingClose) take(pendingClose)
    closeAsks.add(take)
    return () => void closeAsks.delete(take)
  }, [])
  const states = useAgentStates()
  const subs = useSubagents(workspaces.map((w) => w.id))
  const latest = useLatestActivity()
  const [asking, markAsking] = useAsking()
  const radar = useRadar()

  const [closing, setClosing] = useState<string | null>(null)
  const close = (id: string, act: (id: string) => Promise<RemoveResult>): void => {
    setConfirming(null)
    // Closing ends tmux and runs git: seconds with no feedback invite a second click.
    setClosing(id)
    void act(id)
      .then((r) => setRefusal('error' in r ? { id, result: r } : null))
      .finally(() => setClosing(null))
  }

  const damaged = problem && (
    <Problem
      what={problem.error}
      cant={t('Tus agentes siguen en tmux, pero no puedo enseñártelos.')}
      fix={fixLabel(t, 'reveal')}
      onFix={() => void window.atril.revealState(problem.file)}
      detail={problem.detail}
    />
  )
  if (workspaces.length === 0) {
    if (damaged) return damaged
    return <div className="empty">{t('Aquí verás cada trabajo con su estado. Crea uno con «＋ Nuevo trabajo», arriba.')}</div>
  }
  return (
    <div className="ws-list">
      {damaged}
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
            <RadarLine hits={radar[w.id]} />
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
              fix={fixLabel(t, refusal.result.fix)}
              onFix={() =>
                sharedFix(refusal.result.fix, openSettings) ||
                (refusal.result.fix === 'forget'
                  ? close(w.id, onForget)
                  : refusal.result.fix === 'reveal'
                    ? void window.atril.revealState(refusal.result.file ?? 'workspaces')
                    : void window.atril.workspaces.terminal({ id: w.id }))
              }
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
