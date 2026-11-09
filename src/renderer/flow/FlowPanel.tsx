import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { FileChange, FlowStage, StageName } from '../../preload/api'
import { Icon, type IconName } from '../components/Icon'
import { ActivityFeed } from './ActivityFeed'
import { DocModal } from './DocModal'
import { DiffModal } from './DiffModal'
import type { Part } from './highlight'
import { WARN_AT } from './warn'

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
  const [doc, setDoc] = useState<Part | null>(null)
  const [changes, setChanges] = useState<FileChange[]>([])
  const [diffOf, setDiffOf] = useState<string | null>(null)
  const building = flow !== null && BUILDING.includes(flow.stage)

  // F22: the list is asked for again every 3 s from Construir on, never twice at once.
  useEffect(() => {
    setChanges([])
    setDiffOf(null)
    if (!workspaceId || !building) return
    let live = true
    let busy = false
    const load = (): void => {
      if (busy) return
      busy = true
      void window.atril.flow.changes(workspaceId).then((c) => {
        busy = false
        if (live) setChanges(c)
      })
    }
    load()
    const t = setInterval(load, 3000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [workspaceId, building])
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({})

  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=activity photographs the Actividad tab; doc-plan opens the Plan; diff the first change.
  useEffect(() => {
    void window.atril.snapshotView().then((v) => v === 'activity' && setTab('activity'))
  }, [])
  useEffect(() => {
    if (workspaceId) void window.atril.snapshotView().then((v) => v === 'doc-plan' && setDoc('plan'))
  }, [workspaceId])
  useEffect(() => {
    if (changes[0]) void window.atril.snapshotView().then((v) => v === 'diff' && setDiffOf((d) => d ?? changes[0]!.path))
  }, [changes])

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
    setDoc(null)
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
        {tab === 'activity' ? <ActivityFeed workspaceId={workspaceId} /> : <LibrettoFlow flow={flow} onOpen={setDoc} changes={changes} onDiff={setDiffOf} />}
      </div>
      {diffOf && workspaceId && <DiffModal workspaceId={workspaceId} files={changes} start={diffOf} onClose={() => setDiffOf(null)} />}
      {doc && workspaceId && <DocModal workspaceId={workspaceId} part={doc} onClose={() => setDoc(null)} />}
    </aside>
  )
}

// F13: a stage opens its document once the flow has reached it.
const DOC_OF: Partial<Record<StageName, Part>> = { spec: 'spec', plan: 'plan' }
const BUILDING: StageName[] = ['construir', 'terminado', 'aterrizado']

interface FlowProps {
  flow: FlowStage | null
  onOpen: (p: Part) => void
  changes: FileChange[]
  onDiff: (path: string) => void
}

function LibrettoFlow({ flow, onOpen, changes, onDiff }: FlowProps) {
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
            {STAGES.map((s, i) => {
              const cls = `stg ${i < current ? 'd' : i === current ? 'c' : 'p'}`
              const body = (
                <>
                  <Icon name={s.icon} size={22} />
                  <span>
                    {s.label} <small>{i < current ? 'hecho' : i === current ? 'ahora' : 'pendiente'}</small>
                  </span>
                </>
              )
              const part = DOC_OF[s.name]
              if (s.name === 'construir' && i <= current && changes.length > 0)
                return (
                  <button type="button" className={`${cls} stgbtn`} key={s.name} onClick={() => onDiff(changes[0]!.path)} title="Ver los cambios de código">
                    <Icon name={s.icon} size={22} />
                    <span>
                      {s.label} <small>ver {changes.length} archivos</small>
                    </span>
                  </button>
                )
              return part && i <= current && flow?.change ? (
                <button type="button" className={`${cls} stgbtn`} key={s.name} onClick={() => onOpen(part)} title="Ver y editar lo que ha escrito Claude">
                  {body}
                </button>
              ) : (
                <div className={cls} key={s.name}>
                  {body}
                </div>
              )
            })}
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
              <button type="button" className="btn" onClick={() => onOpen('checklist')}>
                Ver checklist
              </button>
            </div>
          )}
          {changes.length > 0 && (
            <section className="sec" aria-labelledby="changes-h">
              <h2 id="changes-h">
                Cambios <span className="n">{changes.length}</span>
              </h2>
              <ChangeTotal lines={changes.reduce((n, f) => n + f.added + f.removed, 0)} />
              <ul className="fchanges">
                {changes.map((f) => {
                  const slash = f.path.lastIndexOf('/')
                  const total = f.added + f.removed || 1
                  return (
                    <li key={f.path}>
                      <button type="button" onClick={() => onDiff(f.path)} title={`Ver el diff de ${f.path}`}>
                        <span className={`fst ${f.status}`}>{f.status}</span>
                        <span className="fpath">
                          <span className="fdir">{f.path.slice(0, slash + 1)}</span>
                          <b>{f.path.slice(slash + 1)}</b>
                        </span>
                        <span className="fnum">
                          <span className="fa">+{f.added}</span> <span className="fd">−{f.removed}</span>
                        </span>
                        <span className="fbar" aria-hidden="true">
                          <i className="fa" style={{ width: `${(f.added / total) * 100}%` }} />
                          <i className="fd" style={{ width: `${(f.removed / total) * 100}%` }} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
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

/** F25: past the hook's threshold the total turns into a warning that says what Atril already did. */
function ChangeTotal({ lines }: { lines: number }) {
  if (lines <= WARN_AT) return <p className="fmeta">{lines} líneas</p>
  return (
    <p className="fbig" role="status">
      ⚠ {lines} líneas: rama grande (más de {WARN_AT}). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.
    </p>
  )
}
