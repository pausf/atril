import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ForgeId, ForgeStatus } from '../../preload/api'
import { useT } from '../ui'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

/** S20, S25: like Jira's card — the token goes in once and is never shown again. */
export function ForgeCard({ forge }: { forge: ForgeId }) {
  const t = useT()
  const name = NAME[forge]
  const [status, setStatus] = useState<ForgeStatus | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [site, setSite] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const refresh = useCallback(async () => setStatus(await window.atril.settings.forge.status(forge)), [forge])
  useEffect(() => void refresh(), [refresh])

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setChecking(true)
    setError(null)
    const r = await window.atril.settings.forge.save(forge, { token, ...(forge === 'gitlab' && { site: site || 'https://gitlab.com' }) })
    setChecking(false)
    setToken('')
    if ('error' in r) return setError(r.error)
    setReplacing(false)
    await refresh()
  }

  const remove = async (): Promise<void> => {
    await window.atril.settings.forge.delete(forge)
    await refresh()
  }

  const id = `forge-${forge}`
  const showForm = status !== null && (!status.saved || replacing)
  return (
    <section className="scard" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>{name}</h3>
      <p className="hint2">{t('Para crear repos desde Atril.')}</p>
      {status === null && <div className="lockn">{t('Cargando…')}</div>}
      {status?.saved && !replacing && (
        <>
          <div className="saved">
            <span className="lock" aria-hidden>
              🔒
            </span>
            <span>
              <b>{t('Guardado')}</b> · {status.account} · {status.site?.replace(/^https:\/\//, '')}
            </span>
            <span className="sp" />
            <button className="btn" onClick={() => setReplacing(true)}>
              {t('Reemplazar')}
            </button>
            <button className="btn" onClick={() => void remove()}>
              {t('Borrar')}
            </button>
          </div>
          <div className="lockn">{t('El token no se muestra nunca. Si lo pierdes, crea uno nuevo y pulsa Reemplazar.')}</div>
        </>
      )}
      {showForm && (
        <form onSubmit={(e) => void save(e)}>
          {forge === 'gitlab' && (
            <div className="srow">
              <label htmlFor={`${id}-site`}>{t('Dirección')}</label>
              <input id={`${id}-site`} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://gitlab.com" autoComplete="off" spellCheck={false} />
            </div>
          )}
          <div className="srow">
            <label htmlFor={`${id}-token`}>{t('Token')}</label>
            <input id={`${id}-token`} type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          </div>
          {error && (
            <div className="serr" role="alert">
              ✕ {error}
            </div>
          )}
          <div className="sactions">
            <button type="button" className="btn" onClick={() => void window.atril.settings.forge.openTokenPage(forge, site || undefined)}>
              {t('Crear token en {forge}', { forge: name })}
            </button>
            <span className="sp" />
            {replacing && (
              <button type="button" className="btn" onClick={() => setReplacing(false)}>
                {t('Cancelar')}
              </button>
            )}
            <button type="submit" className="btn p" disabled={checking || !token}>
              {checking ? t('Comprobando…') : t('Guardar y comprobar')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
