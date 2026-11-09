import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { FlowStage, StageName } from '../../preload/api'
import { Icon, type IconName } from '../components/Icon'
import { ActivityFeed } from './ActivityFeed'

const TABS = [
  { id: 'libretto', label: 'Libretto', title: 'Flujo de Libretto' },
  { id: 'activity', label: 'Actividad', title: 'Actividad' }
] as const
type TabId = (typeof TABS)[number]['id']

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
  const [tab, setTab] = useState<TabId>('libretto')
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({})

  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=activity photographs the Actividad tab.
  useEffect(() => {
    void window.atril.snapshotView().then((v) => v === 'activity' && setTab('activity'))
  }, [])

  const onTabKey = (e: KeyboardEvent): void => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + step + TABS.length) % TABS.length]!
    setTab(next.id)
    tabs.current[next.id]?.focus()
  }

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

  return (
    <aside className="col right" data-tour="flow">
      <h2 tabIndex={-1}>{TABS.find((t) => t.id === tab)?.title}</h2>
      <div className="tabs" role="tablist" aria-label="Panel derecho" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            type="button"
            role="tab"
            key={t.id}
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            ref={(el) => {
              tabs.current[t.id] = el
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'activity' ? <ActivityFeed workspaceId={workspaceId} /> : <LibrettoFlow flow={flow} />}
      </div>
    </aside>
  )
}

function LibrettoFlow({ flow }: { flow: FlowStage | null }) {
  const current = STAGES.findIndex((s) => s.name === flow?.stage)
  const c = flow?.checklist
  return (
    <>
      <p className="lead">Dónde va cada trabajo, leído de sus archivos.</p>
      {flow?.stage === 'sin-libretto' ? (
        <div className="empty">sin Libretto: este trabajo no tiene carpeta .agents</div>
      ) : (
        <>
          <div className="stages">
            {STAGES.map((s, i) => (
              <div className={`stg ${i < current ? 'd' : i === current ? 'c' : 'p'}`} key={s.name}>
                <Icon name={s.icon} size={22} />
                <span>
                  {s.label} <small>{i < current ? 'hecho' : i === current ? 'ahora' : 'pendiente'}</small>
                </span>
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
    </>
  )
}
