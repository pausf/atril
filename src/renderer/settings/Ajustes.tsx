import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useT } from '../ui'
import { Repos } from './Repos'
import { ForgeCard } from './Forges'
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
        () => live && setFound({ error: t('No se pudo buscar tableros.') })
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
        <span>{t('Tablero: {name}', { name: board.name })}</span>
        <button className="btn" onClick={() => setChanging(true)}>
          {t('Cambiar')}
        </button>
      </div>
    )
  return (
    <div className="board-field">
      <div className="srow">
        <label htmlFor="jira-board">{t('Tablero')}</label>
        <input
          id="jira-board"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Busca por nombre')}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {found && 'error' in found && (
        <div className="serr" role="alert">
          ✕ {found.error}
        </div>
      )}
      {found && Array.isArray(found) && found.length === 0 && <div className="lockn">{t('Ningún tablero coincide')}</div>}
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
          {t('Mantener {name}', { name: board.name })}
        </button>
      )}
    </div>
  )
}

function JiraCard() {
  const t = useT()
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
    <section className="scard" aria-labelledby="jira-h" data-tour="connections">
      <h3 id="jira-h">Jira</h3>
      <p className="hint2">{t('Para leer tus tareas del sprint.')}</p>
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
            <button className="btn" onClick={startReplacing}>
              {t('Reemplazar')}
            </button>
            <button className="btn" onClick={() => void remove()}>
              {t('Borrar')}
            </button>
          </div>
          <div className="lockn">
            {t('El token no se muestra nunca. Si lo pierdes, crea uno nuevo en Atlassian y pulsa Reemplazar.')}
          </div>
          <BoardField key={status.board?.id ?? 'none'} board={status.board} onPicked={refresh} />
        </>
      )}
      {showForm && (
        <form onSubmit={(e) => void save(e)}>
          <div className="srow">
            <label htmlFor="jira-site">{t('Dirección')}</label>
            <input
              id="jira-site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder={t('https://tuempresa.atlassian.net')}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="srow">
            <label htmlFor="jira-email">{t('Correo')}</label>
            <input
              id="jira-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="srow">
            <label htmlFor="jira-token">{t('Token')}</label>
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
              {t('Crear token en Atlassian')}
            </button>
            <span className="sp" />
            {replacing && (
              <button type="button" className="btn" onClick={() => setReplacing(false)}>
                {t('Cancelar')}
              </button>
            )}
            <button type="submit" className="btn p" disabled={phase === 'checking' || !site || !email || !token}>
              {phase === 'checking' ? t('Comprobando…') : t('Guardar y comprobar')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export function Ajustes({ children }: { children?: ReactNode }) {
  const t = useT()
  return (
    <main className="ajustes">
      <h1>{t('Ajustes')}</h1>
      <p className="intro">
        {t('Tus tokens se guardan cifrados en el Llavero de tu Mac.')} <b>{t('Una vez guardados no se pueden volver a ver')}</b>
        {t(': solo reemplazar o borrar. Tus agentes nunca los reciben.')}
      </p>
      <JiraCard />
      <ForgeCard forge="github" />
      <ForgeCard forge="gitlab" />
      <Repos />
      {children}
    </main>
  )
}
