import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { FileChange, FlowStage, StageName } from '../../preload/api'
import { FoldSection } from '../components/Fold'
import { Icon, type IconName } from '../components/Icon'
import { useT, type T } from '../ui'
import { ActivityFeed } from './ActivityFeed'
import { DocModal } from './DocModal'
import { DiffModal } from './DiffModal'
import { Subagents } from './Subagents'
import type { Part } from './highlight'
import { WARN_AT } from './warn'

const tabsOf = (t: T) =>
  [
    { id: 'libretto', label: 'Libretto', title: t('Flujo de Libretto') },
    { id: 'activity', label: t('Actividad'), title: t('Actividad') }
  ] as const
type TabId = ReturnType<typeof tabsOf>[number]['id']

const stagesOf = (t: T): { name: Exclude<StageName, 'sin-libretto'>; label: string; icon: IconName }[] => [
  { name: 'entrada', label: t('Entrada'), icon: 's-entrada' },
  { name: 'spec', label: t('Spec'), icon: 's-spec' },
  { name: 'plan', label: t('Plan'), icon: 's-plan' },
  { name: 'construir', label: t('Construir'), icon: 's-build' },
  { name: 'terminado', label: t('Terminado'), icon: 's-done' },
  { name: 'aterrizado', label: t('Aterrizado'), icon: 's-landed' }
]

export function FlowPanel({ workspaceId, auto = false }: { workspaceId: string | null; auto?: boolean }) {
  const t = useT()
  const TABS = tabsOf(t)
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
    const timer = setInterval(load, 3000)
    return () => {
      live = false
      clearInterval(timer)
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
    const next = TABS[(TABS.findIndex((x) => x.id === tab) + step + TABS.length) % TABS.length]!
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
      <h2 tabIndex={-1}>{TABS.find((x) => x.id === tab)?.title}</h2>
      <div className="tabs" role="tablist" aria-label={t('Panel derecho')} onKeyDown={onTabKey}>
        {TABS.map((x) => (
          <button
            type="button"
            role="tab"
            key={x.id}
            id={`tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`panel-${x.id}`}
            ref={(el) => {
              tabs.current[x.id] = el
            }}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'activity' ? (
          <ActivityFeed workspaceId={workspaceId} />
        ) : (
          <>
            <LibrettoFlow flow={flow} onOpen={setDoc} changes={changes} onDiff={setDiffOf} />
            <Subagents workspaceId={workspaceId} />
          </>
        )}
      </div>
      {diffOf && workspaceId && <DiffModal workspaceId={workspaceId} files={changes} start={diffOf} onClose={() => setDiffOf(null)} />}
      {doc && workspaceId && <DocModal workspaceId={workspaceId} auto={auto} part={doc} onClose={() => setDoc(null)} />}
    </aside>
  )
}

// F13: a stage opens its document once the flow has reached it.
const DOC_OF: Partial<Record<StageName, Part>> = { spec: 'spec', plan: 'plan' }
const BUILDING: StageName[] = ['construir', 'terminado', 'aterrizado']
// F31: past this, the rest of the list lives in the diff modal.
const MAX_FILES = 8

interface FlowProps {
  flow: FlowStage | null
  onOpen: (p: Part) => void
  changes: FileChange[]
  onDiff: (path: string) => void
}

function LibrettoFlow({ flow, onOpen, changes, onDiff }: FlowProps) {
  const t = useT()
  const STAGES = stagesOf(t)
  const current = STAGES.findIndex((s) => s.name === flow?.stage)
  const c = flow?.checklist
  return (
    <>
      {flow?.stage === 'sin-libretto' ? (
        <div className="empty">{t('sin Libretto: este trabajo no tiene carpeta .agents')}</div>
      ) : (
        <>
          <div className="stages">
            {STAGES.map((s, i) => {
              const now = i === current
              const cls = `stg ${i < current ? 'd' : now ? 'c' : 'p'}`
              const building = s.name === 'construir' && i <= current && changes.length > 0
              const part = DOC_OF[s.name]
              const opens = part && i <= current && flow?.change
              // F29: only the current stage shows its name; the rest keep it as visually hidden text,
              // F20 Construir names its files instead of its state.
              const state = building ? `· ${t('ver {n} archivos', { n: changes.length })}` : i < current ? t('hecho') : now ? t('ahora') : t('pendiente')
              const name = `${s.label} ${state}`
              const body = (
                <>
                  <Icon name={s.icon} size={16} />
                  <span className={now ? 'stg-t' : 'stg-t sr-only'}>
                    {s.label} <small className={now ? 'sr-only' : undefined}>{state}</small>
                  </span>
                </>
              )
              if (building)
                return (
                  <button type="button" className={`${cls} stgbtn`} key={s.name} onClick={() => onDiff(changes[0]!.path)} title={`${name} — ${t('Ver los cambios de código')}`}>
                    {body}
                  </button>
                )
              return opens ? (
                <button type="button" className={`${cls} stgbtn`} key={s.name} onClick={() => onOpen(part)} title={`${name} — ${t('Ver y editar lo que ha escrito Claude')}`}>
                  {body}
                </button>
              ) : (
                <div className={cls} key={s.name} title={name}>
                  {body}
                </div>
              )
            })}
          </div>
          {flow?.change && (
            <p className="fmeta">
              {t('Cambio:')} <b>{flow.change}</b>
            </p>
          )}
          {c && (
            <FoldSection id="flow-checklist" title={t('Checklist')} count={t('{closed}/{total}', { closed: c.closed, total: c.total })} className="flow-fold">
              <div className="prog">
                <i style={{ width: `${(c.closed / c.total) * 100}%` }} />
              </div>
              {c.firstOpen && (
                <p className="fmeta">
                  {t('Siguiente:')} <b>{c.firstOpen}</b>
                </p>
              )}
              <p className="fmeta">
                {t('Leído de')} <code>{c.file}</code>
              </p>
              <button type="button" className="btn" onClick={() => onOpen('checklist')}>
                {t('Ver checklist')}
              </button>
            </FoldSection>
          )}
          {changes.length > 0 && (
            <FoldSection id="flow-changes" title={t('Cambios')} count={changes.length} className="flow-fold">
              <ChangeTotal lines={changes.reduce((n, f) => n + f.added + f.removed, 0)} />
              <ul className="fchanges">
                {changes.slice(0, MAX_FILES).map((f) => {
                  const slash = f.path.lastIndexOf('/')
                  const total = f.added + f.removed || 1
                  return (
                    <li key={f.path}>
                      <button type="button" onClick={() => onDiff(f.path)} title={t('Ver el diff de {path}', { path: f.path })}>
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
              {changes.length > MAX_FILES && (
                <button type="button" className="fmore" onClick={() => onDiff(changes[MAX_FILES]!.path)}>
                  {t('+{n} más', { n: changes.length - MAX_FILES })}
                </button>
              )}
            </FoldSection>
          )}
          {flow && flow.others.length > 0 && (
            <FoldSection id="flow-others" title={t('Otros cambios')} count={flow.others.length} defaultFolded className="flow-fold">
              {flow.others.map((o) => (
                <p className="fmeta" key={o}>
                  {o}
                </p>
              ))}
            </FoldSection>
          )}
        </>
      )}
    </>
  )
}

/** F25: past the hook's threshold the total turns into a warning that says what Atril already did. */
function ChangeTotal({ lines }: { lines: number }) {
  const t = useT()
  if (lines <= WARN_AT) return <p className="fmeta">{t('{lines} líneas', { lines })}</p>
  return (
    <p className="fbig" role="status">
      {t('⚠ {lines} líneas: rama grande (más de {max}). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.', { lines, max: WARN_AT })}
    </p>
  )
}
