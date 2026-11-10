import type { ReactNode } from 'react'
import type { WorkspaceView } from '../../preload/api'
import { stateOf, useAgentStates } from '../agents'
import { useT } from '../ui'
import { StateLabel } from './StateLabel'
import { Terminal } from './Terminal'

export function Workspace({ ws, switcher }: { ws: WorkspaceView | undefined; switcher?: ReactNode }) {
  const t = useT()
  const states = useAgentStates()
  return (
    <main className="col center">
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
      <div className="panes">
        <div className="pane" data-tour="terminal">
          <div className="ph">
            <b>terminal</b>
            {ws && <span>tmux · {ws.session}</span>}
          </div>
          {ws?.alive ? (
            <Terminal key={ws.id} id={ws.id} />
          ) : (
            <div className="term">
              <div className="s">
                {ws
                  ? t('Este trabajo está parado: su sesión de tmux ya no existe.')
                  : t('Aquí saldrá la terminal de tu agente, dentro de tmux.')}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="hint">
        <span>{t('Escribe en la terminal como siempre: será tu Claude Code.')}</span>
      </div>
    </main>
  )
}
