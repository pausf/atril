import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { NextItem, WorkspaceView } from '../../preload/api'
import { localiseActivity } from '../../preload/activity-i18n'
import { overviewOrder, stateOf, useAgentStates, useFlows, useLatestActivity } from '../agents'
import { ago } from '../flow/ActivityFeed'
import { stagesOf } from '../flow/stages'
import { runningCount, useSubagents } from '../subagents'
import { useT } from '../ui'
import { Icon } from './Icon'
import { StateLabel } from './StateLabel'
import { AgentCard, useAsking } from './AgentCard'

interface Props {
  workspaces: WorkspaceView[]
  next: NextItem[]
  /** The «Uno · Todos» switch, in this view's header. */
  switcher: ReactNode
  /** W82: shows that workspace in «Uno». */
  onOpen: (id: string) => void
}

/** W81: «Todos», one card per workspace in place of the terminal. */
export function AgentsOverview({ workspaces, next, switcher, onOpen }: Props) {
  const t = useT()
  const STAGES = stagesOf(t)
  const ids = workspaces.map((w) => w.id)
  const states = useAgentStates()
  const latest = useLatestActivity()
  const [asking, markAsking] = useAsking()
  const subs = useSubagents(ids)
  const flows = useFlows(ids)
  const [now, setNow] = useState(Date.now())
  const mains = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const ordered = overviewOrder(workspaces, states, latest, next)
  const onKey = (e: KeyboardEvent, i: number): void => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    const to = mains.current[i + step]
    if (!step || !to) return
    e.preventDefault()
    to.focus()
  }

  return (
    <section className="col center overview" aria-label={t('All agents')}>
      <div className="whead">
        <div>
          <div className="m">{t('{n} workspaces', { n: workspaces.length })}</div>
          <h1>{t('All agents')}</h1>
        </div>
        <span className="sp" />
        {switcher}
      </div>
      <div className="ov-grid">
        {ordered.map((w, i) => {
          const state = stateOf(states, w)
          const flow = flows[w.id]
          const stage = STAGES.find((s) => s.name === flow?.stage)
          const act = latest[w.id]
          const running = runningCount(subs[w.id])
          return (
            <div className={`ov-card ${state}`} key={w.id}>
              <button
                type="button"
                className="ov-main"
                ref={(el) => {
                  mains.current[i] = el
                }}
                onKeyDown={(e) => onKey(e, i)}
                onClick={() => onOpen(w.id)}
              >
                <span className="ov-top">
                  <span className="ov-branch">{w.branch}</span>
                  <StateLabel state={state} merged={w.merged} />
                </span>
                <span className="ov-meta">{w.repoId}</span>
                {flow?.stage === 'sin-libretto' ? (
                  <span className="ov-stage none">{t('no Libretto')}</span>
                ) : (
                  stage && (
                    <span className="ov-stage">
                      <Icon name={stage.icon} size={14} /> {stage.label}
                      {flow?.checklist && <span className="ov-check">{t('{closed}/{total}', { closed: flow.checklist.closed, total: flow.checklist.total })}</span>}
                    </span>
                  )
                )}
                {!asking.has(w.id) && (
                  <span className="ov-act">
                    {act ? (
                      <>
                        <span className="ov-act-text">{localiseActivity(act.text, t)}</span>
                        <span className="ov-ago">{ago(t, act.at, now)}</span>
                      </>
                    ) : (
                      <span className="ov-act-text">{t('no activity')}</span>
                    )}
                  </span>
                )}
                {running > 0 && <span className="ov-subs">{running === 1 ? t('1 subagent') : t('{n} subagents', { n: running })}</span>}
              </button>
              {/* Outside the card's button: answering must not open it (W82). */}
              {state === 'needs-you' && (
                <AgentCard workspaceId={w.id} activityAt={act?.at} onShown={(shown) => markAsking(w.id, shown)} skipMultiSelect />
              )}
              {(state === 'working' || state === 'paused') && <PauseButton workspaceId={w.id} paused={state === 'paused'} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** W86/W87 on a card: outside the card's button, so pressing it never opens the workspace. */
function PauseButton({ workspaceId, paused }: { workspaceId: string; paused: boolean }) {
  const t = useT()
  const [error, setError] = useState('')
  const press = (): void => {
    setError('')
    void (paused ? window.atril.status.resume : window.atril.status.pause)(workspaceId).then((r) => setError('error' in r ? r.error : ''))
  }
  return (
    <div className="quick-replies">
      <button type="button" className="quick-reply" onClick={press}>
        {paused ? t('Resume') : t('Pause')}
      </button>
      {error && <span className="bad">{error}</span>}
    </div>
  )
}
