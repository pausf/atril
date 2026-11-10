import { useContext, useEffect, useState } from 'react'
import type { MrItem, MrWork } from '../../preload/api'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'

/** M35: «Revisar en Atril», «Seguir en Atril», «Ir al trabajo» or why not, as main answers (M33). */
export function OpenInAtril({ m }: { m: MrItem }) {
  const t = useT()
  const { openSettings, openWorkspace } = useContext(NavigationContext)
  const [work, setWork] = useState<MrWork | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void window.atril.mr.workFor(m.url).then((w) => live && setWork(w))
    return () => {
      live = false
    }
  }, [m.url])

  const open = async (): Promise<void> => {
    setBusy(true)
    const r = await window.atril.mr.openWork(m.url)
    setBusy(false)
    if ('error' in r) return setError(r.error)
    setError(null)
    openWorkspace?.(r.workspace.id)
  }

  if (!work) return null
  return (
    <div className="mr-open">
      {work.kind === 'none' ? (
        <>
          <span className="f-note">{work.reason}</span>
          <button type="button" className="linklike" onClick={openSettings}>
            {t('Ajustes → Repos')}
          </button>
        </>
      ) : work.kind === 'existing' ? (
        <button type="button" className="btn" onClick={() => openWorkspace?.(work.workspaceId)}>
          {t('Ir al trabajo')}
        </button>
      ) : (
        <button type="button" className="btn" disabled={busy} onClick={() => void open()}>
          {work.kind === 'review' ? t('Revisar en Atril') : t('Seguir en Atril')}
        </button>
      )}
      {error && (
        <span className="mr-score-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
