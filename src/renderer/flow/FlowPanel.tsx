import { useEffect, useState } from 'react'
import type { FlowStage, StageName } from '../../preload/api'
import { Icon, type IconName } from '../components/Icon'

const STAGES: { name: Exclude<StageName, 'sin-libretto'>; label: string; icon: IconName }[] = [
  { name: 'entrada', label: 'Entrada', icon: 's-entrada' },
  { name: 'spec', label: 'Spec', icon: 's-spec' },
  { name: 'plan', label: 'Plan', icon: 's-plan' },
  { name: 'construir', label: 'Construir', icon: 's-build' },
  { name: 'terminado', label: 'Terminado', icon: 's-done' },
  { name: 'aterrizado', label: 'Aterrizado', icon: 's-landed' }
]

export function FlowPanel({ workspaceId }: { workspaceId: string | null }) {
  const [flow, setFlow] = useState<FlowStage | null>(null)

  useEffect(() => {
    let live = true
    setFlow(null)
    void window.atril.flow.get(workspaceId).then((f) => live && setFlow(f))
    const off = window.atril.flow.onChange((id, f) => id === workspaceId && setFlow(f))
    return () => {
      live = false
      off()
    }
  }, [workspaceId])

  const current = STAGES.findIndex((s) => s.name === flow?.stage)
  const c = flow?.checklist

  return (
    <aside className="col right">
      <h2>Flujo de Libretto</h2>
      <p className="lead">Dónde va cada trabajo, leído de sus archivos.</p>
      {flow?.stage === 'sin-libretto' ? (
        <div className="empty">sin Libretto: este trabajo no tiene carpeta .agents</div>
      ) : (
        <>
          <div className="stages">
            {STAGES.map((s, i) => (
              <div className={`stg ${i < current ? 'd' : i === current ? 'c' : 'p'}`} key={s.name}>
                <Icon name={s.icon} size={22} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          {flow?.change && (
            <p className="fmeta">
              Cambio: <b>{flow.change}</b>
            </p>
          )}
          {c && (
            <div className="sec">
              <h2>Checklist</h2>
              <p className="fmeta">
                <b>
                  {c.closed} de {c.total}
                </b>
              </p>
              <div className="prog">
                <i style={{ width: `${(c.closed / c.total) * 100}%` }} />
              </div>
              {c.firstOpen && (
                <p className="fmeta">
                  Siguiente: <b>{c.firstOpen}</b>
                </p>
              )}
              <p className="fmeta">
                Leído de <code>{c.file}</code>
              </p>
            </div>
          )}
          {flow && flow.others.length > 0 && (
            <div className="sec">
              <h2>Otros cambios</h2>
              {flow.others.map((o) => (
                <p className="fmeta" key={o}>
                  {o}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
