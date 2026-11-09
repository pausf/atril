import { useCallback, useEffect, useRef, useState } from 'react'
import type { InboxResult, JiraIssue } from '../../preload/api'

const REFRESH_MS = 5 * 60_000

export function Inbox() {
  const [result, setResult] = useState<InboxResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    // One scan hits every Jira project; never overlap two.
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      setResult(await window.atril.jira.inbox())
    } catch (err) {
      setResult({ error: 'failed', message: String(err) })
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(t)
  }, [refresh])

  const issues = result && 'issues' in result ? result.issues : []

  return (
    <section>
      <h2>
        Mis Jira <span className="n">{issues.length}</span>
        <button className="refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </h2>
      <p className="lead">Asignadas a ti en el sprint activo.</p>
      <Body result={result} issues={issues} />
    </section>
  )
}

function Body({ result, issues }: { result: InboxResult | null; issues: JiraIssue[] }) {
  if (!result) return <div className="empty">Cargando tus Jira…</div>
  if ('error' in result) {
    return (
      <div className="empty" role="alert">
        {result.error === 'missing' ? (
          <>
            Falta la herramienta <b>jira</b>. Instálala con <code>{result.install}</code>
          </>
        ) : result.error === 'unconfigured' ? (
          <>
            Jira no está configurado. Ejecuta <code>jira init</code> en tu terminal.
          </>
        ) : (
          <>No se pudo leer Jira: {result.message}</>
        )}
      </div>
    )
  }
  if (issues.length === 0) return <div className="empty">No tienes tareas abiertas en el sprint activo.</div>
  return (
    <>
      {issues.map((i) => (
        <article className="task" key={i.key}>
          <div className="k">
            {i.key} <span className={`tag${/bug/i.test(i.type) ? ' bug' : ''}`}>{i.type}</span>
          </div>
          <div className="s">{i.summary}</div>
          <div className="row">
            <button className="go" disabled title="llega en la casilla 11">
              Empezar ▸
            </button>
            <span className="tag">{i.status}</span>
          </div>
        </article>
      ))}
    </>
  )
}
