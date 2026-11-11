import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FlowStage, RemoveResult, WorkspaceResult, WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates } from '../agents'
import { Steps } from '../flow/Steps'
import { useT } from '../ui'
import { fixLabel, Problem } from './Problem'
import { StateLabel } from './StateLabel'
import { Terminal } from './Terminal'

/** W143: why the work stopped and the way back; the refusal reuses W135's fixes. */
function Stopped({ ws, onReopened, onForget }: { ws: WorkspaceView; onReopened: (paneId: string) => Promise<void>; onForget: (id: string) => Promise<RemoveResult> }) {
  const t = useT()
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
      <b>{t('{branch} está parado: su sesión de tmux ya no existe (un reinicio o tmux cerrado).', { branch: ws.branch })}</b>
      <p>{t('Su agente no sigue hasta que lo vuelvas a abrir.')}</p>
      <button type="button" className="btn p" disabled={busy} onClick={() => reopen(false)}>
        {t('Volver a abrir')}
      </button>
      {ws.effort !== 'xhigh' && (
        <button type="button" className="btn" disabled={busy} onClick={() => reopen(true)}>
          {t('Seguir con más esfuerzo')}
        </button>
      )}
      {refusal && (
        <Problem
          what={refusal.error}
          cant={t('Su agente no sigue hasta que lo vuelvas a abrir.')}
          fix={fixLabel(t, refusal.fix)}
          onFix={() =>
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
  // The status poll says «stopped» for up to 2 s after a reopen: the pane just started is not stopped.
  const [fresh, setFresh] = useState<string | null>(null)
  const stopped = ws !== undefined && (!ws.alive || (stateOf(states, ws) === 'stopped' && `${ws.id}:${ws.paneId}` !== fresh))
  return (
    <main className="col center">
      {ws && <Steps ws={ws} flow={flow} />}
      <div className="whead">
        <div>
          <div className="m">{ws ? `${ws.repoId} · ${ws.agent}` : t('Ningún trabajo abierto')}</div>
          <div className="tline">
            <h1>{ws ? ws.branch : t('Elige un trabajo')}</h1>
            {ws && <StateLabel state={stateOf(states, ws)} />}
          </div>
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
          {ws?.alive ? (
            // The pane id changes on a reopen: a new key attaches the terminal to the new session.
            <Terminal key={`${ws.id}:${ws.paneId}`} id={ws.id} />
          ) : (
            !ws && (
              <div className="term">
                <div className="s">{t('Aquí saldrá la terminal de tu agente, dentro de tmux.')}</div>
              </div>
            )
          )}
        </div>
      </div>
      {!stopped && (
        <div className="hint">
          <span>{t('Escribe en la terminal como siempre: será tu Claude Code.')}</span>
        </div>
      )}
    </main>
  )
}
