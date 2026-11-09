import { useCallback, useEffect, useRef, useState } from 'react'
import type { InboxResult, JiraIssue } from '../../preload/api'
import { ConnectInSettings } from '../settings/ConnectInSettings'

const REFRESH_MS = 5 * 60_000

export interface InboxState {
  result: InboxResult | null
  issues: JiraIssue[]
  loading: boolean
  refresh: () => Promise<void>
}

// One reader for the whole app: the sidebar summary and the Tareas screen share it.
export function useInbox(): InboxState {
  const [result, setResult] = useState<InboxResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
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

  return { result, issues: result && 'issues' in result ? result.issues : [], loading, refresh }
}

export function Inbox({ inbox }: { inbox: InboxState }) {
  const { result, issues, loading, refresh } = inbox
  return (
    <section className="tasks-screen">
      <h1>
        Tareas <span className="n">{issues.length}</span>
        <button className="refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </h1>
      <p className="lead">Tus tareas abiertas de Jira en todos los proyectos.</p>
      <Body result={result} issues={issues} />
    </section>
  )
}

export function JiraSummary({ inbox, onOpen }: { inbox: InboxState; onOpen: () => void }) {
  const count = (g: JiraIssue['group']): number => inbox.issues.filter((i) => i.group === g).length
  const label = !inbox.result
    ? 'Jira: cargando…'
    : 'error' in inbox.result
      ? 'Jira: sin conectar'
      : `Jira: ${count('doing')} en curso · ${count('todo')} por empezar`
  return (
    <button className="jira-summary" onClick={onOpen}>
      {label} <span aria-hidden>→</span>
    </button>
  )
}

function Body({ result, issues }: { result: InboxResult | null; issues: JiraIssue[] }) {
  if (!result) return <div className="empty">Cargando tus Jira…</div>
  if ('error' in result) {
    return (
      <div className="empty" role="alert">
        {result.error === 'unconfigured' ? (
          <>
            {result.message && <p>{result.message}</p>}
            <ConnectInSettings service="Jira" />
          </>
        ) : (
          <>No se pudo leer Jira: {result.message}</>
        )}
      </div>
    )
  }
  if (issues.length === 0) return <div className="empty">No tienes tareas abiertas.</div>
  return (
    <>
      {GROUPS.map(([group, title, folded]) => {
        const list = issues.filter((i) => i.group === group)
        return list.length === 0 ? null : (
          <details key={group} className="tgroup" open={!folded}>
            <summary>
              {title} <span className="n">{list.length}</span>
            </summary>
            {list.map((i) => <Task key={i.key} i={i} />)}
          </details>
        )
      })}
    </>
  )
}

const GROUPS: ReadonlyArray<[JiraIssue['group'], string, boolean]> = [
  ['todo', 'Por empezar', false],
  ['doing', 'En curso', false],
  ['review', 'En revisión y despliegue', true]
]

function Task({ i }: { i: JiraIssue }) {
  return (
    <article className="task">
      <div className="k">
        {i.key} <span className={`tag${/bug/i.test(i.type) ? ' bug' : ''}`}>{i.type}</span>
      </div>
      <div className="s">{i.summary}</div>
      <div className="row">
        <button className="go" disabled title="llega con la casilla de Empezar">
          Empezar ▸
        </button>
        <span className="tag">{i.status}</span>
      </div>
    </article>
  )
}
