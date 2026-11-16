import { useCallback, useContext, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { ForgeId, MrDraft, MrItem, MrListName, MrMergeResult, MrPage as PageData, MrScoreState, MrThread, MrThreads, MrWork } from '../../preload/api'
import { Problem, fixLabel } from '../components/Problem'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'
import { CodeView, place } from './CodeView'
import { Draft, LensDrafts, useDrafts } from './LensDrafts'
import { MergeConfirm } from './MergeConfirm'
import { RevisarMenu, type Level } from './RevisarMenu'
import { SideCards } from './SideCards'
import { Thread, type ReplyState } from './Thread'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

type Loaded = PageData | { rejected: true }

/**
 * M43: one MR as a page beside the inbox: its line, title and header, Código and Conversación, and the side cards.
 * `dirty` tells the screen a reply box holds text; `escape` closes the page's own top layer and says whether it did.
 */
export function MrPage({ m, list, score, onScore, onLeave, onMerged, onRelist, dirty, escape }: { m: MrItem; list: MrListName; score: MrScoreState; onScore: () => void; onLeave: () => void; onMerged: (r: Extract<MrMergeResult, { merged: true }>) => void; onRelist: () => void; dirty: MutableRefObject<boolean>; escape: MutableRefObject<(() => boolean) | null> }) {
  const t = useT()
  const { openSettings, openWorkspace } = useContext(NavigationContext)
  const [work, setWork] = useState<MrWork | null>(null)
  const [opening, setOpening] = useState(false)
  const [workError, setWorkError] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const closeMenu = useRef<(() => void) | null>(null)
  const [asking, setAsking] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<Exclude<MrMergeResult, { merged: true }> | null>(null)
  const [data, setData] = useState<Loaded | null>(null)
  const [threads, setThreads] = useState<MrThreads | null>(null)
  const [tab, setTab] = useState<'code' | 'talk'>('code')
  const [replies, setReplies] = useState<Record<string, ReplyState>>({})
  const lens = useDrafts(m)

  const load = useCallback(() => {
    setData(null)
    return window.atril.mr.page(m.url).then(
      (d) => d,
      (): Loaded => ({ rejected: true })
    )
  }, [m.url])

  useEffect(() => {
    let live = true
    setTab('code')
    setReplies({})
    void load().then((d) => live && setData(d))
    void window.atril.mr.threads(m.url).then((d) => live && setThreads(d))
    void window.atril.mr.workFor(m.url).then((w) => live && setWork(w))
    // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-thread photographs the Conversación tab.
    void window.atril.snapshotView().then((v) => live && v === 'mr-thread' && setTab('talk'))
    return () => {
      live = false
    }
  }, [m.url, load])

  useEffect(() => {
    dirty.current = Object.values(replies).some((r) => r.text.trim())
  }, [replies, dirty])
  useEffect(() => {
    // M43: the menu is the top layer while open.
    escape.current = () => {
      if (!closeMenu.current) return false
      closeMenu.current()
      return true
    }
    return () => {
      escape.current = null
    }
  }, [escape])

  const reply = (id: string): ReplyState => replies[id] ?? { text: '' }
  const patch = (id: string, p: Partial<ReplyState>): void => setReplies((r) => ({ ...r, [id]: { ...(r[id] ?? { text: '' }), ...p } }))
  const send = async (th: MrThread): Promise<void> => {
    const body = reply(th.id).text
    if (!body.trim()) return
    // M21: a click is a discrete event, so React disables Enviar before a second click lands.
    patch(th.id, { sending: true })
    const r = await window.atril.mr.reply(m.url, th.id, body)
    if ('error' in r) return patch(th.id, { sending: false, error: r.error })
    patch(th.id, { sending: false, error: '', text: '' })
    // The reply is yours: the last word is no longer someone else's.
    setThreads((d) => (d && 'threads' in d ? { ...d, threads: d.threads.map((x) => (x.id === th.id ? { ...x, comments: [...x.comments, r.comment], yourTurn: false } : x)) } : d))
  }

  const retry = (): void => void load().then(setData)

  // M42: once, confirmed; a refusal or a failure stays on the page with its own button.
  const merge = async (): Promise<void> => {
    setMerging(true)
    const r = await window.atril.mr.merge(m.url, true).catch((): MrMergeResult => ({ error: t('Atril no ha podido fusionar esta MR.'), fix: 'retry' }))
    setMerging(false)
    setAsking(false)
    if ('merged' in r) return onMerged(r)
    setMergeError(r)
  }

  // M34, M35: open the MR in Atril, ending on Trabajo with that workspace; an error stays on the page.
  const openWork = async (): Promise<void> => {
    setOpening(true)
    const r = await window.atril.mr.openWork(m.url)
    setOpening(false)
    if ('error' in r) return setWorkError(r.error)
    setWorkError(null)
    openWorkspace?.(r.workspace.id)
  }
  const mine = list === 'mine'
  const reviewed = lens.data?.head !== undefined
  const levels: Level[] = [
    ...(list !== 'following'
      ? [
          { label: t('Puntuar'), sub: t('nota y riesgo con sus razones'), run: onScore },
          {
            label: lens.data?.stale ? t('Comentar de nuevo') : t('Comentar'),
            sub: t('borradores por lente, en su línea'),
            ...(reviewed && !lens.data?.stale && { disabled: t('Ya comentada en este commit') }),
            run: () => void lens.review()
          }
        ]
      : []),
    ...(work?.kind === 'review' ? [{ label: t('A fondo'), sub: t('en tu repo, con sus tests'), run: () => void openWork() }] : []),
    ...(work?.kind === 'existing' && !mine ? [{ label: t('Ir a la revisión'), sub: t('en tu repo, con sus tests'), run: () => openWorkspace?.(work.workspaceId) }] : [])
  ]
  // M45: with a score and a review both pending, the review's.
  const status = lens.reviewing ? t('Revisando…') : score.state === 'queued' ? t('En cola') : score.state === 'running' ? t('Puntuando…') : ''
  const failed = data && ('rejected' in data ? { error: t('Atril no ha podido abrir esta MR.'), detail: '', fix: 'retry' as const } : 'error' in data ? data : null)
  const files = data && 'files' in data ? data.files : []
  const all = threads && 'threads' in threads ? threads.threads : []
  const placed = place(files, all, lens.data?.drafts ?? [])
  const inCode = all.filter((th) => !placed.talk.some((x) => x.th === th))
  const label = (name: string, shown: MrThread[]): string => {
    const yours = shown.filter((x) => x.yourTurn).length
    return `${name} ${shown.length}${yours > 0 ? ` · ${t('te toca {n}', { n: yours })}` : ''}`
  }
  const thread = (th: MrThread, note?: string, onLine?: boolean) => <Thread key={th.id} th={th} {...(note && { note })} onLine={onLine} reply={reply(th.id)} onType={(text) => patch(th.id, { text })} onSend={() => void send(th)} />
  const draft = (d: MrDraft) => (
    <div key={d.id} className="mr-onl">
      <Draft d={d} s={lens} />
    </div>
  )
  const whose = list === 'mine' ? t('Tuya') : t('De {author}', { author: m.author })
  const branch = m.branch ? ` · ${m.branch}${m.target ? ` → ${m.target}` : ''}` : ''

  return (
    <>
      <section className="mr-page" aria-labelledby="mr-page-title">
        <button type="button" className="back" onClick={onLeave}>
          {t('‹ Tus MR')}
        </button>
        <div className="sub">{`${NAME[m.forge]} · ${m.project} · ${whose}${branch}`}</div>
        <div className="mr-page-title">
          <h2 id="mr-page-title">{m.title}</h2>
          <div className="mr-page-head">
            {work?.kind === 'continue' && (
              <button type="button" className="btn" disabled={opening} onClick={() => void openWork()}>
                {t('Seguir en Atril')}
              </button>
            )}
            {work?.kind === 'existing' && mine && (
              <button type="button" className="btn" onClick={() => openWorkspace?.(work.workspaceId)}>
                {t('Ir al trabajo')}
              </button>
            )}
            <RevisarMenu levels={levels} status={status} open={menu} setOpen={setMenu} close={closeMenu} />
            {mine && m.mergeable && !m.conflict && (
              <button type="button" className="btn" onClick={() => setAsking(true)}>
                {t('Fusionar')}
              </button>
            )}
            <button type="button" className="btn" onClick={() => void window.atril.mr.open(m.url)}>
              {t('Abrir en {forge} ↗', { forge: NAME[m.forge] })}
            </button>
          </div>
        </div>
        {m.conflict && m.target && <div className="sub mr-conflict">{t('En conflicto con {target}', { target: m.target })}</div>}
        {work?.kind === 'none' && (
          <p className="f-note mr-none">
            {work.reason}{' '}
            <button type="button" className="linklike" onClick={openSettings}>
              {t('Ajustes → Repos')}
            </button>
          </p>
        )}
        {mergeError && (
          <Problem
            what={mergeError.error}
            cant={t('La MR sigue sin fusionar.')}
            fix={fixLabel(t, mergeError.fix, NAME[m.forge])}
            onFix={mergeError.fix === 'forge' ? () => void window.atril.mr.open(m.url) : mergeError.fix === 'settings' ? openSettings : onRelist}
            detail={mergeError.detail ?? ''}
          />
        )}
        {workError && (
          <p className="mr-score-error" role="alert">
            {workError}
          </p>
        )}
        <div className="mr-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'code'} className={tab === 'code' ? 'on' : ''} onClick={() => setTab('code')}>
            {label(t('Código'), inCode)}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'talk'} className={tab === 'talk' ? 'on' : ''} onClick={() => setTab('talk')}>
            {label(t('Conversación'), placed.talk.map((x) => x.th))}
          </button>
        </div>
        {tab === 'code' ? (
          <div role="tabpanel" className="mr-pane">
            <LensDrafts s={lens} drafts={placed.top} />
            {data === null && <div className="empty">{t('Cargando el código…')}</div>}
            {failed && (
              <Problem
                what={failed.error}
                cant={t('No puedo enseñarte el código de esta MR.')}
                fix={fixLabel(t, failed.fix ?? 'retry')}
                onFix={failed.fix === 'settings' ? openSettings : retry}
                {...(failed.fix && failed.fix !== 'retry' && { alt: t('Volver a comprobar'), onAlt: retry })}
                detail={failed.detail ?? ''}
              />
            )}
            {data && 'cut' in data && data.cut && <p className="f-note">{t('Demasiado grande para enseñarlo aquí: ábrela en {forge}', { forge: NAME[m.forge] })}</p>}
            <CodeView forge={m.forge} files={files} placed={placed} thread={(th) => thread(th, undefined, th.line !== undefined)} draft={draft} />
          </div>
        ) : (
          <div role="tabpanel" className="mr-pane">
            {threads && 'error' in threads && (
              <p className="notice" role="alert">
                {threads.error}
              </p>
            )}
            {threads && 'threads' in threads && threads.more && <p className="f-note">{t('Hay más en {forge}: “Te toca responder” puede estar incompleto', { forge: NAME[m.forge] })}</p>}
            {threads && 'threads' in threads && placed.talk.length === 0 && placed.talkDrafts.length === 0 && <div className="empty">{t('Sin comentarios.')}</div>}
            {placed.talk.map(({ th, gone }) => thread(th, gone ? t('Esa línea ya no está en el diff') : undefined))}
            {placed.talkDrafts.map(draft)}
          </div>
        )}
      </section>
      {asking && <MergeConfirm title={m.title} target={m.target ?? ''} busy={merging} onYes={() => void merge()} onNo={() => setAsking(false)} />}
      <SideCards m={m} list={list} score={score} onScore={onScore} page={data && !('rejected' in data) ? data : null} onRetry={retry} />
    </>
  )
}
