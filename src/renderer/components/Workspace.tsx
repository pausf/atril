import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Carried, CarryFail, FlowStage, RemoveResult, WorkspaceResult, WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates, useLatestActivity } from '../agents'
import { Steps } from '../flow/Steps'
import { useT } from '../ui'
import { fixLabel, Problem, sharedFix } from './Problem'
import { NavigationContext } from '../settings/navigation'
import { StateLabel } from './StateLabel'
import { Terminal } from './Terminal'
import { AgentCard } from './AgentCard'
import { Composer } from './Composer'

/** W143: why the work stopped and the way back; the refusal reuses W135's fixes. */
function Stopped({ ws, onReopened, onForget }: { ws: WorkspaceView; onReopened: (paneId: string) => Promise<void>; onForget: (id: string) => Promise<RemoveResult> }) {
  const t = useT()
  const { openSettings } = useContext(NavigationContext)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<Exclude<WorkspaceResult, { workspace: WorkspaceView }> | null>(null)
  const reopen = (more: boolean): void => {
    setBusy(true)
    setRefusal(null)
    void window.atril.workspaces
      .reopen(ws.id, more)
      .then(async (r) => ('error' in r ? setRefusal(r) : onReopened(r.workspace.paneId)))
      .finally(() => setBusy(false))
  }
  return (
    <div className="ws-stopped">
      <b>{t('{branch} is stopped: its tmux session no longer exists (a restart or tmux closed).', { branch: ws.branch })}</b>
      <p>{t('Its agent does not go on until you reopen it.')}</p>
      <button type="button" className="btn p" disabled={busy} onClick={() => reopen(false)}>
        {t('Reopen')}
      </button>
      {ws.effort !== 'xhigh' && (
        <button type="button" className="btn" disabled={busy} onClick={() => reopen(true)}>
          {t('Go on with more effort')}
        </button>
      )}
      {refusal && (
        <Problem
          what={refusal.error}
          cant={t('Its agent does not go on until you reopen it.')}
          fix={fixLabel(t, refusal.fix)}
          onFix={() =>
            sharedFix(refusal.fix, openSettings) ||
            void (refusal.fix === 'forget'
              ? onForget(ws.id)
              : refusal.fix === 'reveal'
                ? window.atril.revealState(refusal.file ?? 'workspaces')
                : window.atril.workspaces.terminal({ id: ws.id }))
          }
          detail={refusal.detail ?? ''}
          busy={busy}
          onClose={() => setRefusal(null)}
        />
      )}
    </div>
  )
}

/** W487: names and reasons only; a carried file's contents never reach the window. */
function CarriedLines({ carried }: { carried: Carried }) {
  const t = useT()
  const reason: Record<CarryFail, string> = {
    missing: t('not found'),
    'not-a-file': t('not a regular file'),
    outside: t('outside the repo'),
    exists: t('already there'),
    'not-ignored': t('not ignored by git'),
    failed: t('could not copy')
  }
  return (
    <div className="m carried">
      {carried.copied.length > 0 && <div>{t('Copied: {files}', { files: carried.copied.join(', ') })}</div>}
      {carried.failed.length > 0 && (
        <div className="bad">{t('Not copied: {files}', { files: carried.failed.map((f) => `${f.file} (${reason[f.why]})`).join(', ') })}</div>
      )}
    </div>
  )
}

export function Workspace({
  ws,
  flow,
  big,
  switcher,
  onReopened = async () => undefined,
  onForget = (id) => window.atril.workspaces.forget(id)
}: {
  ws: WorkspaceView | undefined
  flow: FlowStage | null
  /** F39: the enlarged code, shown in place of the terminal. */
  big?: ReactNode
  switcher?: ReactNode
  /** W143: re-lists the works after a reopen, so `alive` flips and the terminal attaches. */
  onReopened?: () => Promise<void>
  onForget?: (id: string) => Promise<RemoveResult>
}) {
  const t = useT()
  const panes = useRef<HTMLDivElement>(null)
  const wasBig = useRef(false)
  // F39: the terminal stays mounted while the code is large; closing it gives the terminal its focus back.
  useEffect(() => {
    if (wasBig.current && !big) panes.current?.querySelector<HTMLElement>('.xterm-helper-textarea')?.focus()
    wasBig.current = Boolean(big)
  }, [big])
  const states = useAgentStates()
  const latest = useLatestActivity()
  // The status poll says «stopped» for up to 2 s after a reopen: the pane just started is not stopped.
  const [fresh, setFresh] = useState<string | null>(null)
  const stopped = ws !== undefined && (!ws.alive || (stateOf(states, ws) === 'stopped' && `${ws.id}:${ws.paneId}` !== fresh))
  return (
    <main className="col center">
      {ws && <Steps ws={ws} flow={flow} />}
      <div className="whead">
        <div>
          <div className="m">{ws ? `${ws.repoId} · ${ws.agent}` : t('No work open')}</div>
          <div className="tline">
            <h1>{ws ? ws.branch : t('Pick a workspace')}</h1>
            {ws && <StateLabel state={stateOf(states, ws)} merged={ws.merged} />}
          </div>
          {ws?.carried && <CarriedLines carried={ws.carried} />}
        </div>
        <span className="sp" />
        {switcher && <span className="wtools">{switcher}</span>}
      </div>
      {big}
      <div className="panes" hidden={Boolean(big)} ref={panes}>
        <div className="pane" data-tour="terminal">
          <div className="ph">
            <b>terminal</b>
            {ws && <span>tmux · {ws.session}</span>}
          </div>
          {stopped && (
            <Stopped
              key={ws.id}
              ws={ws}
              onReopened={async (paneId) => {
                setFresh(`${ws.id}:${paneId}`)
                await onReopened()
              }}
              onForget={onForget}
            />
          )}
          {ws && stateOf(states, ws) === 'needs-you' && (
            <div className="term-ask">
              <AgentCard key={ws.id} workspaceId={ws.id} activityAt={latest[ws.id]?.at} focusComposer />
            </div>
          )}
          {ws?.alive ? (
            // The pane id changes on a reopen: a new key attaches the terminal to the new session.
            <Terminal key={`${ws.id}:${ws.paneId}`} id={ws.id} />
          ) : (
            !ws && (
              <div className="term">
                <div className="s">{t("Your agent's terminal will show up here, inside tmux.")}</div>
              </div>
            )
          )}
        </div>
      </div>
      {ws && !big && <Composer key={ws.id} workspaceId={ws.id} stopped={stopped} />}
    </main>
  )
}
