import { Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { LibrettoCounts, LibrettoState, RepoView } from '../../preload/api'
import { NavigationContext } from '../settings/navigation'
import { useT, useUi } from '../ui'

type Loaded = Exclude<LibrettoState, { error: string }>
type Mode = 'edit' | 'confirm'

const day = (iso: string): string => `${iso.slice(8)}/${iso.slice(5, 7)}`

export function Libretto() {
  const t = useT()
  const { ui, setLibrettoRepo } = useUi()
  const { openWorkspace } = useContext(NavigationContext)
  const [repos, setRepos] = useState<RepoView[] | null>(null)
  const [counts, setCounts] = useState<Record<string, LibrettoCounts>>({})
  const [jiraReady, setJiraReady] = useState(false)
  const [state, setState] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  // One row at a time is being edited or confirmed; `pending` is the one waiting for main.
  const [row, setRow] = useState<{ name: string; mode: Mode } | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [rowError, setRowError] = useState<{ name: string; error: string } | null>(null)
  const [created, setCreated] = useState<Record<string, string>>({})
  const latest = useRef(0)
  const noRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let live = true
    void window.atril.repos.list().then((l) => live && setRepos(Array.isArray(l) ? l : []), () => live && setRepos([]))
    void window.atril.settings.jira.status().then((s) => live && setJiraReady(s.saved && s.board !== undefined), () => undefined)
    return () => {
      live = false
    }
  }, [])

  // The remembered repo only counts while it is still registered.
  const repoId = ui === null || repos === null ? null : (repos.find((r) => r.id === ui.librettoRepo) ?? repos[0])?.id ?? null

  const read = useCallback(async (): Promise<void> => {
    if (repoId === null) return
    const mine = ++latest.current
    void window.atril.libretto.repos().then((c) => mine === latest.current && setCounts(c), () => undefined)
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
    setRow(null)
    setRowError(null)
    setCreated({})
    setQueueError(null)
    void read()
  }, [read])

  useEffect(() => {
    if (row?.mode === 'confirm') noRef.current?.focus()
  }, [row])

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

  // Disables the row's buttons until the answer; an error stays in the row, which keeps its mode.
  const act = async (name: string, call: () => Promise<object>): Promise<void> => {
    if (repoId === null || pending !== null) return
    setPending(name)
    setRowError(null)
    const r = await call().catch((e: unknown) => ({ error: String(e) }))
    setPending(null)
    if ('error' in r) setRowError({ name, error: String(r.error) })
    else setRow(null)
  }

  const start = (name: string): Promise<void> =>
    act(name, async () => {
      const r = await window.atril.libretto.start(repoId as string, name)
      if ('error' in r) return r
      openWorkspace?.(r.workspace.id)
      await read()
      return r
    })

  const save = (name: string): Promise<void> =>
    act(name, async () => {
      const r = await window.atril.libretto.edit(repoId as string, name, draft)
      if (!('error' in r)) await read()
      return r
    })

  const drop = (name: string): Promise<void> =>
    act(name, async () => {
      const r = await window.atril.libretto.drop(repoId as string, name)
      if (!('error' in r)) await read()
      return r
    })

  const toJira = (name: string): Promise<void> =>
    act(name, async () => {
      const r = await window.atril.libretto.jira(repoId as string, name)
      if ('key' in r) setCreated((c) => ({ ...c, [name]: r.key }))
      await read()
      return r.error === undefined ? {} : { error: r.error }
    })

  return (
    <section className="tasks-screen libretto" data-tour="libretto">
      <div className="lbw">
        <h1>
          {t('Libretto')}
          <button className="refresh" onClick={() => void read()} disabled={repoId === null}>
            {t('Refresh')}
          </button>
        </h1>
        <p className="lead">{t('The idea queue and what is in flight in each repo, read from its .agents folder.')}</p>
        {repos !== null && repos.length === 0 && <div className="empty">{t('Add a repo in Settings to see its Libretto.')}</div>}
        {repoId !== null && repos !== null && (
          <div className="lbrepos" role="group" aria-label={t('Repo')}>
            {repos.map((r) => {
              const c = counts[r.id]
              return (
                <button key={r.id} type="button" className={`lbrepo${c?.none ? ' off' : ''}`} aria-pressed={r.id === repoId} onClick={() => setLibrettoRepo(r.id)}>
                  <b>{r.id}</b>
                  {c !== undefined && <span>{c.none ? t('no Libretto') : [c.queued > 0 && t('{n} queued', { n: c.queued }), c.inFlight > 0 && t('{n} in flight', { n: c.inFlight })].filter(Boolean).join(' · ') || t('nothing going on')}</span>}
                </button>
              )
            })}
          </div>
        )}
        {loadError !== null && (
          <p className="notice" role="alert">
            {loadError}
          </p>
        )}
        {state !== null && 'none' in state && <div className="empty">{t('This repo does not use Libretto')}</div>}
        {state !== null && 'queued' in state && (
          <>
            <div className="lbcomp">
              <textarea
                aria-label={t('New idea')}
                placeholder={t('Jot down an idea… it is saved exactly as you write it')}
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void queue()
                }}
              />
              <button type="button" className="refresh" disabled={text.trim() === '' || busy} onClick={() => void queue()}>
                {t('Queue')}
              </button>
            </div>
            {queueError !== null && (
              <p className="notice" role="alert">
                {queueError}
              </p>
            )}
            <h2 className="lbh">
              {t('Queued')}
              <span className="n">{state.queued.length}</span>
            </h2>
            {state.queued.length === 0 && <div className="empty">{t('Nothing queued.')}</div>}
            <ul className="lb-list" aria-label={t('Queued')}>
              {state.queued.map((q) => {
                const mine = row?.name === q.name ? row.mode : null
                const wait = pending === q.name
                const key = created[q.name]
                return (
                  <li key={q.name} className="lbr">
                    <div>
                      <b>{q.name}</b>
                      {mine === 'edit' ? (
                        <textarea className="lb-edit" aria-label={t('Edit request')} rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
                      ) : (
                        <span>{q.reading !== undefined ? `${day(q.date)} · ${q.reading}` : day(q.date)}</span>
                      )}
                    </div>
                    <span className="lbact">
                      {q.started ? (
                        <span className="k">{t('Started · {branch}', { branch: `feat/${q.name}` })}</span>
                      ) : mine === 'edit' ? (
                        <Fragment key="edit">
                          <button type="button" className="lnk" disabled={wait || draft.trim() === ''} onClick={() => void save(q.name)}>
                            {t('Save')}
                          </button>
                          <button type="button" className="lnk" disabled={wait} onClick={() => setRow(null)}>
                            {t('Cancel')}
                          </button>
                        </Fragment>
                      ) : mine === 'confirm' ? (
                        <Fragment key="confirm">
                          <span className="k">{t('Delete {name}?', { name: q.name })}</span>
                          <button type="button" className="lnk" disabled={wait} onClick={() => void drop(q.name)}>
                            {t('Yes')}
                          </button>
                          <button type="button" className="lnk" ref={noRef} disabled={wait} onClick={() => setRow(null)}>
                            {t('No')}
                          </button>
                        </Fragment>
                      ) : (
                        <Fragment key="idle">
                          {key !== undefined && <span className="k">{t('Created {key}', { key })}</span>}
                          <button
                            type="button"
                            className="lnk"
                            disabled={wait}
                            onClick={() => {
                              setDraft(q.ask)
                              setRowError(null)
                              setRow({ name: q.name, mode: 'edit' })
                            }}
                          >
                            {t('Edit@@action')}
                          </button>
                          <button
                            type="button"
                            className="lnk"
                            disabled={wait}
                            onClick={() => {
                              setRowError(null)
                              setRow({ name: q.name, mode: 'confirm' })
                            }}
                          >
                            {t('Delete')}
                          </button>
                          {jiraReady && key === undefined && (
                            <button type="button" className="lnk" disabled={wait} onClick={() => void toJira(q.name)}>
                              {t('Send to Jira')}
                            </button>
                          )}
                          <button type="button" className="refresh" disabled={wait} onClick={() => void start(q.name)}>
                            {t('Start')}
                          </button>
                        </Fragment>
                      )}
                    </span>
                    {rowError?.name === q.name && (
                      <p className="notice lb-err" role="alert">
                        {rowError.error}
                      </p>
                    )}
                  </li>
                )
              })}
              {Object.entries(created)
                .filter(([name]) => !state.queued.some((q) => q.name === name))
                .map(([name, key]) => (
                  <li key={name} className="lbr">
                    <div>
                      <b>{name}</b>
                      <span>{t('Created {key}', { key })}</span>
                    </div>
                  </li>
                ))}
            </ul>
            <h2 className="lbh">
              {t('In progress')}
              <span className="n">{state.inFlight.length}</span>
            </h2>
            {state.inFlight.length === 0 && <div className="empty">{t('Nothing in flight.')}</div>}
            <ul className="lb-list" aria-label={t('In progress')}>
              {state.inFlight.map((f) => (
                <li key={f.name} className="lbr">
                  <div>
                    <b>{f.name}</b>
                    <span>{f.total === 0 ? t('No checklist') : f.closed === f.total ? t('Ready to land') : `${t('Next:')} ${f.firstOpen ?? ''}`}</span>
                  </div>
                  {f.total > 0 && <span className="k">{`${f.closed}/${f.total}`}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
