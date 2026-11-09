import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { JiraSettingsStatus } from '../../preload/api'

type Phase = 'idle' | 'checking'

function JiraCard() {
  const [status, setStatus] = useState<JiraSettingsStatus | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [site, setSite] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')

  const refresh = useCallback(async () => {
    try {
      setStatus(await window.atril.settings.jira.status())
    } catch (err) {
      setStatus({ saved: false })
      setError(String(err))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setPhase('checking')
    setError(null)
    try {
      const r = await window.atril.settings.jira.save({ site, email, token })
      if ('error' in r) {
        setError(r.error)
        return
      }
      setToken('')
      setReplacing(false)
      await refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setPhase('idle')
    }
  }

  const remove = async (): Promise<void> => {
    await window.atril.settings.jira.delete()
    await refresh()
  }

  const startReplacing = (): void => {
    setSite(status?.site ?? '')
    setToken('')
    setError(null)
    setReplacing(true)
  }

  const showForm = status !== null && (!status.saved || replacing)

  return (
    <section className="scard" aria-labelledby="jira-h">
      <h3 id="jira-h">Jira</h3>
      <p className="hint2">Para leer tus tareas del sprint.</p>
      {status === null && <div className="lockn">Cargando…</div>}
      {status?.saved && !replacing && (
        <>
          <div className="saved">
            <span className="lock" aria-hidden>
              🔒
            </span>
            <span>
              <b>Guardado</b> · {status.account} · {status.site?.replace(/^https:\/\//, '')}
            </span>
            <span className="sp" />
            <button className="btn" onClick={startReplacing}>
              Reemplazar
            </button>
            <button className="btn" onClick={() => void remove()}>
              Borrar
            </button>
          </div>
          <div className="lockn">
            El token no se muestra nunca. Si lo pierdes, crea uno nuevo en Atlassian y pulsa Reemplazar.
          </div>
        </>
      )}
      {showForm && (
        <form onSubmit={(e) => void save(e)}>
          <div className="srow">
            <label htmlFor="jira-site">Dirección</label>
            <input
              id="jira-site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="https://tuempresa.atlassian.net"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="srow">
            <label htmlFor="jira-email">Correo</label>
            <input
              id="jira-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="srow">
            <label htmlFor="jira-token">Token</label>
            <input
              id="jira-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && (
            <div className="serr" role="alert">
              ✕ {error}
            </div>
          )}
          <div className="sactions">
            <button type="button" className="btn" onClick={() => void window.atril.settings.openTokenPage()}>
              Crear token en Atlassian
            </button>
            <span className="sp" />
            {replacing && (
              <button type="button" className="btn" onClick={() => setReplacing(false)}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn p" disabled={phase === 'checking' || !site || !email || !token}>
              {phase === 'checking' ? 'Comprobando…' : 'Guardar y comprobar'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export function Ajustes({ children }: { children?: ReactNode }) {
  return (
    <main className="ajustes">
      <h1>Ajustes</h1>
      <p className="intro">
        Tus tokens se guardan cifrados en el Llavero de tu Mac. <b>Una vez guardados no se pueden volver a ver</b>:
        solo reemplazar o borrar. Tus agentes nunca los reciben.
      </p>
      <JiraCard />
      {children}
    </main>
  )
}
