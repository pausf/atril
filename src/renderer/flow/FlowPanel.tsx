import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { FlowStage } from '../../preload/api'
import { useT, type T } from '../ui'
import { ActivityFeed } from './ActivityFeed'
import { Boxes } from './Boxes'
import { Problem } from '../components/Problem'
import { Branches, type SubView } from './Branches'
import { useSubagentView } from './Subagents'
import { BUILDING, type BoxesState } from './useFlow'
import { WARN_AT } from './warn'

const tabsOf = (t: T) =>
  [
    { id: 'libretto', label: 'Libretto', title: t('Flujo de Libretto') },
    { id: 'activity', label: t('Actividad'), title: t('Actividad') }
  ] as const
type TabId = ReturnType<typeof tabsOf>[number]['id']

interface PanelProps {
  workspaceId: string | null
  flow: FlowStage | null | undefined
  boxes: BoxesState
  /** «⤢ Ampliar» on a box's code (F39). */
  onBig: (index: number, file?: string) => void
  onOpenLibretto: () => void
}

export function FlowPanel({ workspaceId, flow, boxes, onBig, onOpenLibretto }: PanelProps) {
  const t = useT()
  const TABS = tabsOf(t)
  const [tab, setTab] = useState<TabId>('libretto')
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({})
  const { view: subs, modal } = useSubagentView(workspaceId)

  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=activity photographs the Actividad tab.
  useEffect(() => {
    void window.atril.snapshotView().then((v) => v === 'activity' && setTab('activity'))
  }, [])

  const onTabKey = (e: KeyboardEvent): void => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = TABS[(TABS.findIndex((x) => x.id === tab) + step + TABS.length) % TABS.length]!
    setTab(next.id)
    tabs.current[next.id]?.focus()
  }

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
            data-tour={x.id === 'activity' ? 'activity' : undefined}
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
            <LibrettoFlow flow={flow} workspaceId={workspaceId} boxes={boxes} subs={subs} onBig={onBig} onOpenLibretto={onOpenLibretto} />
            {modal}
          </>
        )}
      </div>
    </aside>
  )
}

function LibrettoFlow({ flow, workspaceId, boxes, subs, onBig, onOpenLibretto }: Omit<PanelProps, 'workspaceId'> & { workspaceId: string | null; subs: SubView | null }) {
  const t = useT()
  // F27: the branches hang from the current box, else from the «Cambio» line, else from a «Subagentes» line.
  const timeline = workspaceId && flow && BUILDING.includes(flow.stage) && boxes.boxes.length > 0
  const hung = timeline && boxes.boxes.some((b) => b.state === 'current')
  const lone = subs && !flow?.change
  // F49: never blank while the first answer is on its way.
  if (workspaceId && flow === undefined) return <div className="empty">{t('Leyendo el flujo de este trabajo…')}</div>
  // A review session (or a work main no longer knows) has no flow: say so instead of a blank tab.
  if (workspaceId && flow === null && !subs) return <div className="empty">{t('Este trabajo no sigue el flujo de Libretto.')}</div>
  // F50: before the checklist exists, say why there are no boxes.
  const early = flow && (['entrada', 'spec', 'plan'].includes(flow.stage) || (flow.stage === 'construir' && boxes.boxes.length === 0))
  if (flow?.stage === 'sin-libretto')
    return (
      <>
        <div className="empty">{t('sin Libretto: este trabajo no tiene carpeta .agents')}</div>
        {subs && <Branches view={subs} />}
      </>
    )
  return (
    <>
      {workspaceId && <BigWarning key={workspaceId} lines={boxes.total} workspaceId={workspaceId} />}
      {flow?.change && (
        <p className="fmeta crow">
          <span className="cname" title={flow.change}>
            {t('Cambio:')} <b>{flow.change}</b>
          </span>
        </p>
      )}
      {early && (
        <p className="fmeta">
          {flow.change ? t('Aún no hay casillas: salen cuando el plan tenga su checklist.') : t('Este trabajo aún no tiene cambio de Libretto: lo crea el primer paso.')}
        </p>
      )}
      {lone && <p className="fmeta crow">{t('Subagentes')}</p>}
      {subs && !hung && <Branches view={subs} />}
      {timeline && <Boxes workspaceId={workspaceId} boxes={boxes.boxes} tick={boxes.tick} onBig={onBig} subs={subs} />}
      {flow && flow.others.length > 0 && (
        <p className="fmeta crow">
          <span>{flow.others.length === 1 ? t('1 cambio más en este repo') : t('{n} cambios más en este repo', { n: flow.others.length })}</span>
          <button type="button" className="fmore" onClick={onOpenLibretto}>
            {t('Ver en Libretto')}
          </button>
        </p>
      )}
    </>
  )
}

const SPLIT = 'Separa esta rama en MRs encadenadas.' // i18n-ignore: words for Claude, not the person

/** F25: past the hook's threshold, on top: split it through the composer's path (W204) or leave it until the next threshold. */
function BigWarning({ lines, workspaceId }: { lines: number; workspaceId: string }) {
  const t = useT()
  const k = Math.floor((lines - 1) / WARN_AT)
  // Undefined until ui.json is read, so a dismissed warning never flashes.
  const [left, setLeft] = useState<number | undefined>()
  const [sent, setSent] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    void window.atril.ui.get().then((u) => setLeft(u.bigDismissed?.[workspaceId] ?? 0))
  }, [workspaceId])
  if (lines <= WARN_AT || left === undefined || left >= k) return null
  const split = (): void => {
    setSent('')
    setFailed(null)
    void window.atril.status.compose(workspaceId, SPLIT).then((r) => {
      setSent('ok' in r ? t('Enviado') : null)
      if (!('ok' in r)) setFailed(r.error)
    })
  }
  const leave = (): void => {
    setLeft(k)
    void window.atril.ui.set({ bigDismissed: { [workspaceId]: k } })
  }
  return (
    <div className="fbig" role="status">
      <span className="fbig-text">{t('⚠ {lines} líneas: rama grande (más de {max}).', { lines, max: WARN_AT })}</span>
      <span className="fbig-acts">
        <button type="button" className="btn" disabled={sent === ''} onClick={split}>
          {t('Separar en MRs encadenadas')}
        </button>
        <button type="button" className="btn" onClick={leave}>
          {t('Dejarla así')}
        </button>
        {sent && <span className="fbig-sent">{sent}</span>}
      </span>
      {failed && <Problem what={failed} cant={t('La rama sigue entera.')} fix={t('Volver a intentar')} onFix={split} detail="" />}
    </div>
  )
}
