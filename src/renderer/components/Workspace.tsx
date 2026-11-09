import type { WorkspaceView } from '../../preload/api'
import { Terminal } from './Terminal'

export function Workspace({ ws }: { ws: WorkspaceView | undefined }) {
  return (
    <main className="col center">
      <div className="whead">
        <div>
          <div className="m">{ws ? `${ws.repoId} · ${ws.agent}` : 'Ningún trabajo abierto'}</div>
          <h1>{ws ? ws.branch : 'Elige un trabajo'}</h1>
        </div>
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
                  ? 'Este trabajo está parado: su sesión de tmux ya no existe.'
                  : 'Aquí saldrá la terminal de tu agente, dentro de tmux.'}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="hint">
        <span>Escribe en la terminal como siempre: será tu Claude Code.</span>
      </div>
    </main>
  )
}
