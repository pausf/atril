import { Repos } from './Repos'

export function Sidebar() {
  return (
    <aside className="col left">
      <section>
        <h2>
          Mis Jira <span className="n">0</span>
        </h2>
        <p className="lead">Asignadas a ti en el sprint activo.</p>
        <div className="empty">
          Aquí saldrán tus Jira. Pulsa «Empezar» en una y Atril creará la rama y lanzará al agente.
        </div>
      </section>
      <section className="sec">
        <h2>
          Trabajo en marcha <span className="n">0</span>
        </h2>
        <p className="lead">Cada trabajo, con su agente.</p>
        <div className="empty">
          Aquí verás cada trabajo con su estado: trabajando, te necesita o parado.
        </div>
        <Repos />
      </section>
    </aside>
  )
}
