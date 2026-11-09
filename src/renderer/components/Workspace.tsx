export function Workspace() {
  return (
    <main className="col center">
      <div className="whead">
        <div>
          <div className="m">Ningún trabajo abierto</div>
          <h1>Elige un trabajo</h1>
        </div>
      </div>
      <div className="panes">
        <div className="pane">
          <div className="ph">
            <b>terminal</b>
          </div>
          <div className="term">
            <div className="s">Aquí saldrá la terminal de tu agente, dentro de tmux.</div>
          </div>
        </div>
      </div>
      <div className="hint">
        <span>Escribe en la terminal como siempre: será tu Claude Code.</span>
      </div>
    </main>
  )
}
