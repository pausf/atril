import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { LibrettoState, RepoView } from '../../preload/api'
import { NavigationContext } from '../settings/navigation'
import { useT, useUi } from '../ui'

type Loaded = Exclude<LibrettoState, { error: string }>

export function Libretto() {
  const t = useT()
  const { ui, setLibrettoRepo } = useUi()
  const { openWorkspace } = useContext(NavigationContext)
  const [repos, setRepos] = useState<RepoView[] | null>(null)
  const [state, setState] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [startError, setStartError] = useState<{ name: string; error: string } | null>(null)
  const latest = useRef(0)

  useEffect(() => {
    let live = true
    void window.atril.repos.list().then((l) => live && setRepos(l), () => live && setRepos([]))
    return () => {
      live = false
    }
  }, [])

  // The remembered repo only counts while it is still registered.
  const repoId = ui === null || repos === null ? null : (repos.find((r) => r.id === ui.librettoRepo) ?? repos[0])?.id ?? null

  const read = useCallback(async (): Promise<void> => {
    if (repoId === null) return
    const mine = ++latest.current
    const s = await window.atril.libretto.state(repoId).catch((e: unknown) => ({ error: String(e) }))
    if (mine !== latest.current) return
    if ('error' in s) {
      setLoadError(s.error)
      setState(null)
    } else {
      setLoadError(null)
      setState(s)
    }
  }, [repoId])

  useEffect(() => {
    setState(null)
    setStartError(null)
    setQueueError(null)
    void read()
  }, [read])

  const queue = async (): Promise<void> => {
    if (repoId === null || text.trim() === '' || busy) return
    setBusy(true)
    const r = await window.atril.libretto.queue(repoId, text).catch((e: unknown) => ({ error: String(e) }))
    setBusy(false)
    if ('error' in r) return setQueueError(r.error)
    setQueueError(null)
    setText('')
    await read()
  }

  const start = async (name: string): Promise<void> => {
    if (repoId === null || busy) return
    setBusy(true)
    setStartError(null)
    const r = await window.atril.libretto.start(repoId, name).catch((e: unknown) => ({ error: String(e) }))
    setBusy(false)
    if ('error' in r) return setStartError({ name, error: r.error })
    openWorkspace?.(r.workspace.id)
    await read()
  }

  return (
    <section className="tasks-screen libretto" data-tour="libretto">
      <h1>
        {t('Libretto')}
        <button className="refresh" onClick={() => void read()} disabled={repoId === null}>
          {t('Actualizar')}
        </button>
      </h1>
      <p className="lead">{t('La cola de ideas y lo que está en curso en cada repo, leído de su carpeta .agents.')}</p>
      {repos !== null && repos.length === 0 && <div className="empty">{t('Añade un repo en Ajustes para ver su Libretto.')}</div>}
      {repoId !== null && repos !== null && (
        <label className="lb-repo">
          {t('Repo')}
          <select value={repoId} onChange={(e) => setLibrettoRepo(e.target.value)}>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </label>
      )}
      {loadError !== null && (
        <p className="notice" role="alert">
          {loadError}
        </p>
      )}
      {state !== null && 'none' in state && <div className="empty">{t('Este repo no usa Libretto')}</div>}
      {state !== null && 'queued' in state && (
        <>
          <h2 className="lb-h">{t('En cola')}</h2>
          {state.queued.length === 0 && <div className="empty">{t('Nada en cola.')}</div>}
          <ul className="lb-list" aria-label={t('En cola')}>
            {state.queued.map((q) => (
              <li key={q.name} className="lb-row">
                <div className="lb-main">
                  <span className="lb-name">{q.name}</span>
                  {q.reading !== undefined && <span className="lb-sub">{q.reading}</span>}
                </div>
                <span className="lb-meta">{q.date}</span>
                {q.started ? (
                  <span className="lb-meta">{t('Empezada · {branch}', { branch: `feat/${q.name}` })}</span>
                ) : (
                  <button type="button" className="btn" disabled={busy} onClick={() => void start(q.name)}>
                    {t('Empezar')}
                  </button>
                )}
                {startError?.name === q.name && (
                  <p className="notice lb-err" role="alert">
                    {startError.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <h2 className="lb-h">{t('En curso')}</h2>
          {state.inFlight.length === 0 && <div className="empty">{t('Nada en curso.')}</div>}
          <ul className="lb-list" aria-label={t('En curso')}>
            {state.inFlight.map((f) => (
              <li key={f.name} className="lb-row">
                <div className="lb-main">
                  <span className="lb-name">{f.name}</span>
                  <span className="lb-sub">
                    {f.total === 0 ? t('Sin checklist') : f.closed === f.total ? t('Lista para aterrizar') : `${t('Siguiente:')} ${f.firstOpen ?? ''}`}
                  </span>
                </div>
                {f.total > 0 && <span className="lb-meta">{`${f.closed}/${f.total}`}</span>}
              </li>
            ))}
          </ul>
          <h2 className="lb-h">{t('Nueva idea')}</h2>
          <textarea
            className="lb-text"
            aria-label={t('Nueva idea')}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void queue()
            }}
          />
          <div className="lb-actions">
            <button type="button" className="btn p" disabled={text.trim() === '' || busy} onClick={() => void queue()}>
              {t('Encolar')}
            </button>
          </div>
          {queueError !== null && (
            <p className="notice" role="alert">
              {queueError}
            </p>
          )}
        </>
      )}
    </section>
  )
}
