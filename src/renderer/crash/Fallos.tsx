import { useEffect, useRef, useState } from 'react'
import type { CrashLast } from '../../preload/api'
import { Problem } from '../components/Problem'
import { ago } from '../flow/ActivityFeed'
import { useT } from '../ui'

function ConsentDialog({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  const t = useT()
  const yes = useRef<HTMLButtonElement>(null)
  useEffect(() => yes.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onNo()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onNo])
  return (
    <div className="skw-back">
      <div className="skw" role="dialog" aria-modal="true" aria-label={t('¿Enviar los fallos a GitHub?')}>
        <h2>{t('¿Enviar los fallos a GitHub?')}</h2>
        <p>{t('Se envía: el error, su traza, la versión de Atril y de macOS. Se quitan tus rutas, tokens, correos, direcciones de servidores, claves de Jira y lo que va entre comillas; la limpieza es automática y puede dejarse algo. Va con tu cuenta de GitHub a pausf/atril, que es privado.')}</p>
        <div className="skw-act">
          <button type="button" className="btn" onClick={onNo}>
            {t('Cancelar')}
          </button>
          <button ref={yes} type="button" className="btn primary" onClick={onYes}>
            {t('Activar')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** crash R6: off by default; turning it on says what leaves the Mac first. */
export function Fallos() {
  const t = useT()
  const [on, setOn] = useState(false)
  const [last, setLast] = useState<CrashLast | undefined>()
  const [github, setGithub] = useState<boolean | null>(null)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    let live = true
    void window.atril.ui.get().then((u) => {
      if (!live) return
      setOn(u.crashReports === 'on')
      setLast(u.crashLast)
    })
    void window.atril.settings.forge.status('github').then((s) => live && setGithub(s.saved))
    // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=ajustes-fallos opens the consent dialog for a photo.
    void window.atril.snapshotView().then((v) => live && v === 'ajustes-fallos' && setAsking(true))
    return () => {
      live = false
    }
  }, [])

  const save = (next: boolean): void => {
    setOn(next)
    setAsking(false)
    void window.atril.ui.set({ crashReports: next ? 'on' : undefined })
  }

  return (
    <section className="scard" aria-labelledby="fallos-h">
      <h3 id="fallos-h">{t('Fallos')}</h3>
      <p className="hint2">{t('Si Atril falla de una forma que no esperaba, puede abrir un PR en el proyecto con el error, sin tus datos.')}</p>
      <div className="arow">
        <span id="fallos-sw">{t('Enviar los fallos a GitHub como PR')}</span>
        <button type="button" role="switch" className="sw" aria-checked={on} aria-labelledby="fallos-sw" onClick={() => (on ? save(false) : setAsking(true))} />
      </div>
      {github === false && <p className="hint2">{t('Conecta GitHub en Conexiones para enviarlos.')}</p>}
      {last && 'url' in last && (
        <p className="hint2">
          <button type="button" className="linklike" onClick={() => void window.atril.crash.openLast()}>
            {t('Último fallo enviado: {hace}', { hace: ago(t, last.at / 1000, Date.now()) })}
          </button>
        </p>
      )}
      {last && 'error' in last && <Problem what={t('No he podido enviar el último fallo: {error}.', { error: last.error })} detail="" />}
      {asking && <ConsentDialog onYes={() => save(true)} onNo={() => setAsking(false)} />}
    </section>
  )
}
