import { useEffect, useState } from 'react'
import type { FlowStage, StageName, WorkspaceView } from '../../preload/api'
import { Icon } from '../components/Icon'
import { useT } from '../ui'
import { DocModal } from './DocModal'
import type { Part } from './highlight'

// F13: a stage opens its document once the flow has reached it.
const DOC_OF: Partial<Record<StageName, Part>> = { spec: 'spec', plan: 'plan' }

/** F29: the six steps above the work, each named; Spec and Plan open their documents. */
export function Steps({ ws, flow }: { ws: WorkspaceView; flow: FlowStage | null }) {
  const t = useT()
  const [doc, setDoc] = useState<Part | null>(null)
  useEffect(() => setDoc(null), [ws.id])
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=doc-plan opens the Plan for a photo.
  useEffect(() => {
    void window.atril.snapshotView().then((v) => v === 'doc-plan' && setDoc('plan'))
  }, [ws.id])
  if (!flow?.change) return null

  const steps: { name: Exclude<StageName, 'sin-libretto'>; label: string }[] = [
    { name: 'entrada', label: t('Entrada') },
    { name: 'spec', label: t('Spec') },
    { name: 'plan', label: t('Plan') },
    { name: 'construir', label: t('Construir') },
    { name: 'terminado', label: t('Revisar') },
    { name: 'aterrizado', label: t('Aterrizar') }
  ]
  const current = steps.findIndex((s) => s.name === flow.stage)
  const c = flow.checklist
  return (
    <>
      <div className="seg6" role="group" aria-label={t('Pasos de Libretto')} data-tour="stages">
        {steps.map((s, i) => {
          const now = i === current
          const counting = now && s.name === 'construir' && c !== undefined && c.total > 0
          const fill = i < current ? 100 : counting ? (c.closed / c.total) * 100 : now ? 100 : 0
          const part = DOC_OF[s.name]
          return (
            <div className={`seg ${i < current ? 'd' : now ? 'c' : 'p'}`} key={s.name} aria-current={now ? 'step' : undefined}>
              {part && i <= current ? (
                <button type="button" className="dk" title={t('Ver y editar lo que ha escrito Claude')} onClick={() => setDoc(part)}>
                  <Icon name="s-spec" size={11} />
                  {s.label}
                </button>
              ) : (
                <span className="seg-n">{counting ? `${s.label} ${t('{closed}/{total}', { closed: c.closed, total: c.total })}` : s.label}</span>
              )}
              <span className="sr-only"> {i < current ? t('hecho') : now ? t('ahora') : t('pendiente')}</span>
              <i className="bar">
                <b style={{ width: `${fill}%` }} />
              </i>
            </div>
          )
        })}
      </div>
      {doc && <DocModal workspaceId={ws.id} auto={ws.auto === true} part={doc} onClose={() => setDoc(null)} />}
    </>
  )
}
