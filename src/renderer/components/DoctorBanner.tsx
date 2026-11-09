import type { ToolReport } from '../../preload/api'

export function DoctorBanner({ problems }: { problems: ToolReport[] }) {
  if (problems.length === 0) return null
  return (
    <section className="doctor" role="alert" aria-label="Herramientas que faltan">
      {problems.map((p) => (
        <div className="doctor-item" key={p.tool}>
          <b>{p.tool}</b>
          <span className="doctor-problem">{p.problem}</span>
          {p.install && <code>{p.install}</code>}
        </div>
      ))}
    </section>
  )
}
