import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { InboxResult, JiraIssue } from '../../preload/api'
import { ConnectInSettings } from '../settings/ConnectInSettings'
import { NavigationContext } from '../settings/navigation'
import { FoldSection } from '../components/Fold'
import { Icon } from '../components/Icon'
import { Problem, fixLabel } from '../components/Problem'
import { useT } from '../ui'

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
  const translate = useT()
  // Read through a ref so a language change does not restart the five-minute timer.
  const tr = useRef(translate)
  tr.current = translate

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      setResult(await window.atril.jira.inbox())
    } catch (err) {
      // The bridge itself failed, not Jira: its message stays out, its name goes to the detail.
      const t = tr.current
      setResult({ error: 'failed', message: t("I can't reach {service}: are you online?", { service: 'Jira' }), detail: err instanceof Error ? err.name : 'Error', fix: 'retry' })
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { result, issues: result && 'issues' in result ? result.issues : [], loading, refresh }
}

interface InboxProps {
  inbox: InboxState
  /** Empezar: the app decides between one click and the dialog (I20, I21). */
  onStart: (issue: JiraIssue, optionClick: boolean) => void
  /** Why a one-click Start did not finish. */
  startError?: string | null
  onOpenWorkspace: (id: string) => void
  /** «Nueva tarea»: works with or without Jira (I26). */
  onNewTask: () => void
}

export function Inbox({ inbox, onStart, startError, onOpenWorkspace, onNewTask }: InboxProps) {
  const { result, issues, loading, refresh } = inbox
  const t = useT()
  // A board picked in Ajustes must show up the next time Tareas opens, not five minutes later.
  useEffect(() => void refresh(), [refresh])
  return (
    <section className="tasks-screen" data-tour="tasks">
      <h1>
        {t('Tasks')} <span className="n">{issues.length}</span>
        <button className="refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? t('Updating…') : t('Refresh')}
        </button>
        <button className="refresh" onClick={onNewTask} data-tour="new-task">
          {t('New task')}
        </button>
      </h1>
      <p className="lead">{t('Your open Jira tasks across all projects.')}</p>
      {startError && (
        <p className="notice" role="alert">
          {startError}
        </p>
      )}
      <Body result={result} issues={issues} onStart={onStart} onOpenWorkspace={onOpenWorkspace} onRetry={() => void refresh()} />
    </section>
  )
}

export function JiraSummary({ inbox, onOpen }: { inbox: InboxState; onOpen: () => void }) {
  const t = useT()
  const groups = inbox.result && 'groups' in inbox.result ? inbox.result.groups : []
  const board = groups.some((g) => g.id.startsWith('col-'))
  const count = (g: JiraIssue['group']): number => inbox.issues.filter((i) => i.group === g).length
  // With a board, its first column is "por empezar" and the other columns "en curso"; «Fuera del tablero» is neither.
  const inColumns = (first: boolean): number =>
    groups.filter((g) => g.id.startsWith('col-') && (g.id === 'col-0') === first).reduce((n, g) => n + g.keys.length, 0)
  const label = !inbox.result
    ? t('Jira: loading…')
    : 'error' in inbox.result
      ? t('Jira: not connected')
      : board
        ? t('Jira: {doing} in progress · {todo} to start', { doing: inColumns(false), todo: inColumns(true) })
        : t('Jira: {doing} in progress · {todo} to start', { doing: count('doing'), todo: count('todo') })
  return (
    <button className="jira-summary" onClick={onOpen}>
      <Icon name="ticket" size={18} />
      <span className="grow">{label}</span> <span aria-hidden>→</span>
    </button>
  )
}

interface TaskActions {
  onStart: (i: JiraIssue, optionClick: boolean) => void
  onOpenWorkspace: (id: string) => void
}

function Body({ result, issues, onStart, onOpenWorkspace, onRetry }: { result: InboxResult | null; issues: JiraIssue[]; onRetry: () => void } & TaskActions) {
  const { openSettings } = useContext(NavigationContext)
  const t = useT()
  if (!result) return <div className="empty">{t('Loading your Jira tasks…')}</div>
  if ('error' in result) {
    if (result.error === 'failed')
      return (
        <Problem
          what={result.message}
          cant={t("I can't show you your tasks.")}
          fix={fixLabel(t, result.fix)}
          onFix={result.fix === 'settings' ? openSettings : onRetry}
          detail={result.detail}
        />
      )
    return (
      <div className="empty" role="alert">
        <ConnectInSettings service="Jira" />
      </div>
    )
  }
  if (issues.length === 0) return <div className="empty">{t('You have no open tasks.')}</div>
  const byKey = new Map(issues.map((i) => [i.key, i]))
  return (
    <>
      {result.notice && (
        <p className="notice" role="status">
          {result.notice.text}
          {result.notice.detail && (
            <details>
              <summary>{t('Show detail')}</summary>
              <code>{result.notice.detail}</code>
            </details>
          )}
          {result.notice.settings && (
            <>
              {' '}
              <button className="linklike" onClick={openSettings}>
                {t('Settings')}
              </button>
            </>
          )}
        </p>
      )}
      {result.groups.map((g) => (
        <FoldSection key={g.id} id={`tasks-${g.id}`} title={g.title} count={g.keys.length} defaultFolded={g.folded} className="tgroup">
          {g.keys.map((k) => byKey.get(k)).filter((i): i is JiraIssue => !!i).map((i) => <Task key={i.key} i={i} onStart={onStart} onOpenWorkspace={onOpenWorkspace} />)}
        </FoldSection>
      ))}
    </>
  )
}

function Task({ i, onStart, onOpenWorkspace }: { i: JiraIssue } & TaskActions) {
  const t = useT()
  return (
    <article className="task">
      <span className="k">{i.key}</span>
      <span className={`tag${/bug/i.test(i.type) ? ' bug' : ''}`}>{i.type}</span>
      <span className="s" title={i.summary}>
        {i.summary}
      </span>
      <span className="tag">{i.status}</span>
      {i.workspaceId ? (
        <button className="go" aria-label={t('Open work for {key}', { key: i.key })} onClick={() => onOpenWorkspace(i.workspaceId!)}>
          {t('Open work ▸')}
        </button>
      ) : (
        <button className="go" aria-label={t('Start {key}', { key: i.key })} onClick={(e) => onStart(i, e.altKey)}>
          {t('Start ▸')}
        </button>
      )}
    </article>
  )
}
