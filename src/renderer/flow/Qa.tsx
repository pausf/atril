import { useEffect, useRef, useState } from 'react'
import type { QaShot, QaStatus } from '../../preload/api'
import { FoldSection } from '../components/Fold'
import { useT } from '../ui'
import { useModalKeys } from './modalKeys'

/** F33: asked again every 3 s while the section shows; an unclassified workspace stops asking and shows nothing. */
export function Qa({ workspaceId }: { workspaceId: string | null }) {
  const t = useT()
  const [qa, setQa] = useState<QaStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [big, setBig] = useState<QaShot | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setQa(null)
    setError(null)
    setBig(null)
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = (): void =>
      void window.atril.qa.status(workspaceId).then((s) => {
        if (!live) return
        setQa(s)
        if (s) timer = setTimeout(load, 3000)
      })
    load()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [workspaceId, tick])

  if (!workspaceId || !qa) return null
  const press = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const r = await (qa.live ? window.atril.qa.stop(workspaceId) : window.atril.qa.launch(workspaceId))
    setBusy(false)
    if ('error' in r) setError(r.error)
    // Ask at once instead of waiting for the next tick, so the button follows the press.
    setTick((n) => n + 1)
  }

  return (
    <>
      <FoldSection id="flow-qa" title={t('QA')} count={qa.shots.length} className="flow-fold" tour="flow-qa">
        <p className="fmeta crow">
          <span>{t('App {kind}', { kind: qa.kind })}</span>
          <button type="button" className={qa.live ? 'btn' : 'btn p'} disabled={busy} onClick={() => void press()}>
            {qa.live ? t('Detener QA') : t('Probar en vivo')}
          </button>
        </p>
        {error && (
          <p className="qa-err" role="alert">
            {error}
          </p>
        )}
        {qa.shots.length > 0 ? (
          <ul className="qa-shots">
            {qa.shots.map((s) => (
              <li key={s.name}>
                <button type="button" title={s.name} aria-label={t('Ver {name} en grande', { name: s.name })} onClick={() => setBig(s)}>
                  <img src={s.src} alt={s.name} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fmeta">{t('Sin capturas todavía')}</p>
        )}
      </FoldSection>
      {big && <ShotModal shot={big} onClose={() => setBig(null)} />}
    </>
  )
}

function ShotModal({ shot, onClose }: { shot: QaShot; onClose: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const keys = useModalKeys(dialog, onClose)
  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg edmodal qamodal" role="dialog" aria-modal="true" aria-labelledby="qa-title" ref={dialog} tabIndex={-1}>
        <div className="edhead">
          <h3 id="qa-title">{shot.name}</h3>
          <span className="sp" />
          <button type="button" className="btn" onClick={onClose}>
            {t('Cerrar')}
          </button>
        </div>
        <div className="qa-big">
          <img src={shot.src} alt={shot.name} />
        </div>
      </div>
    </div>
  )
}
