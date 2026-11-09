const STAGES = ['Entrada', 'Spec', 'Plan', 'Construir', 'Terminado', 'Aterrizado']

export function FlowPanel() {
  return (
    <aside className="col right">
      <h2>Flujo de Libretto</h2>
      <p className="lead">Dónde va cada trabajo, leído de sus archivos.</p>
      <div className="stages">
        {STAGES.map((s) => (
          <div className="stg" key={s}>
            <i />
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className="sec">
        <h2>Checklist</h2>
        <p className="lead">Aparece cuando Libretto trocea el trabajo.</p>
      </div>
    </aside>
  )
}
