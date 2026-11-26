import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useT } from '../ui'
import { Repos } from './Repos'
import { Fallos } from '../crash/Fallos'
import { Appearance } from '../components/Appearance'
import { ForgeCard } from './Forges'
import { ConnectSteps, ConnectionRow, Field, Manage, useConnectionState } from './Connection'
import type { BoardSearchResult, JiraBoard, JiraSettingsStatus } from '../../preload/api'

type Phase = 'idle' | 'checking'

const MIN_LETTERS = 2
const DEBOUNCE_MS = 300

function BoardField({ board, onPicked }: { board?: JiraBoard; onPicked: () => Promise<void> }) {
  const t = useT()
  const [changing, setChanging] = useState(!board)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<BoardSearchResult | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_LETTERS) {
      setFound(null)
      return
    }
    let live = true
    const timer = setTimeout(() => {
      window.atril.settings.jira.searchBoards(q).then(
        (r) => live && setFound(r),
        () => live && setFound({ error: t('Could not search boards.') })
      )
    }, DEBOUNCE_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [query, t])

  const pick = async (b: JiraBoard): Promise<void> => {
    const r = await window.atril.settings.jira.pickBoard({ id: b.id, name: b.name })
    if ('error' in r) {
      setFound(r)
      return
    }
    setChanging(false)
    setQuery('')
    setFound(null)
    await onPicked()
  }

  if (board && !changing)
    return (
      <div className="board-field">
        <span>{t('Board: {name}', { name: board.name })}</span>
        <button className="btn" onClick={() => setChanging(true)}>
          {t('Change')}
        </button>
      </div>
    )
  return (
    <div className="board-field">
      <div className="srow">
        <label htmlFor="jira-board">{t('Board')}</label>
        <input
          id="jira-board"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search by name')}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {found && 'error' in found && (
        <div className="serr" role="alert">
          ✕ {found.error}
        </div>
      )}
      {found && Array.isArray(found) && found.length === 0 && <div className="lockn">{t('No board matches')}</div>}
      {found && Array.isArray(found) && found.length > 0 && (
        <ul className="board-list">
          {found.map((b) => (
            <li key={b.id}>
              <button onClick={() => void pick(b)}>{b.name}</button> <span className="lockn">{b.type}</span>
            </li>
          ))}
        </ul>
      )}
      {board && (
        <button className="btn" onClick={() => setChanging(false)}>
          {t('Keep {name}', { name: board.name })}
        </button>
      )}
    </div>
  )
}

function JiraCard() {
  const t = useT()
  const [status, setStatus] = useState<JiraSettingsStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | undefined>()
  const [tried, setTried] = useState(false)
  const [site, setSite] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const state = useConnectionState(status, true)

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
    setError(null)
    setTried(true)
    if (!site || !email || !token) return
    setPhase('checking')
    try {
      const r = await window.atril.settings.jira.save({ site, email, token })
      if ('error' in r) {
        setError(r.error)
        setDetail(r.detail)
        return
      }
      setToken('')
      setTried(false)
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
    setOpen(false)
    await refresh()
  }

  const startReplacing = (): void => {
    setSite(status?.site ?? '')
    setToken('')
    setError(null)
    setTried(false)
    setReplacing(true)
  }

  const need = (value: string, text: string): string | undefined => (tried && !value ? text : undefined)

  return (
    <ConnectionRow
      id="jira"
      name="Jira"
      purpose={t('Your tasks, and starting workspaces')}
      state={state}
      saved={status && status.saved}
      open={open}
      onToggle={() => {
        setOpen(!open)
        setReplacing(false)
      }}
    >
      {status?.saved && !replacing ? (
        <Manage note={t('The token is never shown. If you lose it, create a new one in Atlassian and press Replace.')} onReplace={startReplacing} onRemove={() => void remove()}>
          <BoardField key={status.board?.id ?? 'none'} board={status.board} onPicked={refresh} />
        </Manage>
      ) : (
        <ConnectSteps
          createLabel={t('Create token in Atlassian')}
          createNote={t('an Atlassian API token')}
          onCreate={() => void window.atril.settings.openTokenPage()}
          fields={
            <>
              <Field id="jira-site" label={t('Address')} value={site} onChange={(e) => setSite(e.target.value)} placeholder={t('https://yourcompany.atlassian.net')} error={need(site, t('The address is missing.'))} />
              <Field id="jira-email" label={t('Email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={need(email, t('The email is missing.'))} />
              <Field id="jira-token" label={t('Token')} type="password" value={token} onChange={(e) => setToken(e.target.value)} error={need(token, t('The token is missing.'))} />
            </>
          }
          error={error}
          detail={detail}
          checking={phase === 'checking'}
          onCancel={replacing ? () => setReplacing(false) : undefined}
          onSubmit={(e) => void save(e)}
        />
      )}
    </ConnectionRow>
  )
}

export function Ajustes({ children }: { children?: ReactNode }) {
  const t = useT()
  return (
    <main className="ajustes">
      <header className="ajustes-head">
        <h1>{t('Settings')}</h1>
        <p className="intro">
          {t("Your tokens are stored encrypted in your Mac's Keychain.")} <b>{t('Once saved they cannot be seen again')}</b>
          {t(': only replace or delete. Your agents never receive them.')}
        </p>
      </header>
      <div className="ajustes-col">
        <section className="scard conns" aria-labelledby="conns-h" data-tour="connections">
          <h3 id="conns-h">{t('Connections')}</h3>
          <JiraCard />
          <ForgeCard forge="github" />
          <ForgeCard forge="gitlab" />
        </section>
        <Repos />
        <Fallos />
      </div>
      <div className="ajustes-col">
        <Appearance />
        {children}
      </div>
    </main>
  )
}
