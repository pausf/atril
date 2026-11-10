import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ForgeId, MrItem, MrThread, MrThreads } from '../../preload/api'
import { ago } from '../flow/ActivityFeed'
import { useModalKeys } from '../flow/modalKeys'
import { useT } from '../ui'
import { FixCi } from './FixCi'
import { LensDrafts } from './LensDrafts'
import { OpenInAtril } from './OpenInAtril'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

/** M18–M24: the MR's threads with a reply box each. Comments are plain text, never markup. */
/** `reviewable`: the MR is in Mías or Me toca revisar, so the lens review is offered (M25). */
export function MrView({ m, reviewable, onClose }: { m: MrItem; reviewable: boolean; onClose: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<MrThreads | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let live = true
    void window.atril.mr.threads(m.url).then((d) => live && setData(d))
    return () => {
      live = false
    }
  }, [m.url])

  const close = (): void => {
    if (Object.values(drafts).some((d) => d.trim()) && !window.confirm(t('Tienes una respuesta sin enviar. ¿Cerrar y descartarla?'))) return
    onClose()
  }
  const keys = useModalKeys(dialog, close)

  const send = async (th: MrThread): Promise<void> => {
    const body = drafts[th.id] ?? ''
    if (!body.trim()) return
    // M21: a click is a discrete event, so React disables Enviar before a second click lands.
    setSending((s) => ({ ...s, [th.id]: true }))
    const r = await window.atril.mr.reply(m.url, th.id, body)
    setSending((s) => ({ ...s, [th.id]: false }))
    if ('error' in r) return setErrors((e) => ({ ...e, [th.id]: r.error }))
    setErrors((e) => ({ ...e, [th.id]: '' }))
    setDrafts((d) => ({ ...d, [th.id]: '' }))
    // The reply is yours: the last word is no longer someone else's.
    setData((d) => d && 'threads' in d ? { ...d, threads: d.threads.map((x) => (x.id === th.id ? { ...x, comments: [...x.comments, r.comment], yourTurn: false } : x)) } : d)
  }

  const threads = data && 'threads' in data ? data.threads : []
  return (
    <div className="modal" onKeyDown={(e: KeyboardEvent) => void keys(e)}>
      <div className="dlg edmodal mrmodal" role="dialog" aria-modal="true" aria-labelledby="mr-title" ref={dialog} tabIndex={-1}>
        <div className="edhead">
          <h3 id="mr-title">{m.title}</h3>
          <span className="docchange">{m.project}</span>
          <FixCi m={m} />
          <OpenInAtril m={m} />
          {data && 'threads' in data && <span className="tag">{t('Te toca responder: {n}', { n: threads.filter((x) => x.yourTurn).length })}</span>}
          <span className="sp" />
          <button type="button" className="linklike" onClick={() => void window.atril.mr.open(m.url)}>
            {t('Abrir en {forge}', { forge: NAME[m.forge] })}
          </button>
          <button type="button" className="btn" onClick={close}>
            {t('Cerrar')}
          </button>
        </div>
        <div className="mr-threads">
          <LensDrafts m={m} reviewable={reviewable} />
          {data === null && <div className="empty">{t('Cargando los hilos…')}</div>}
          {data && 'error' in data && (
            <p className="notice" role="alert">
              {data.error}
            </p>
          )}
          {data && 'threads' in data && data.more && <p className="f-note">{t('Hay más en {forge}: “Te toca responder” puede estar incompleto', { forge: NAME[m.forge] })}</p>}
          {data && 'threads' in data && threads.length === 0 && <div className="empty">{t('Sin comentarios.')}</div>}
          {threads.map((th) => (
            <article key={th.id} className="mr-thread" aria-labelledby={`th-${th.id}`}>
              <h4 id={`th-${th.id}`}>
                {th.id === 'general' ? t('General') : th.line === undefined ? th.file : `${th.file}:${th.line}`}
                {th.resolved !== undefined && <span className="tag">{th.resolved ? t('Resuelto') : t('Sin resolver')}</span>}
                {th.yourTurn && <span className="tag your-turn">{t('Te toca responder')}</span>}
              </h4>
              {th.code && <pre className="mr-code">{th.code}</pre>}
              {th.comments.map((cm) => (
                <div key={cm.id} className="mr-comment">
                  <span className="who">{cm.author}</span> <span className="age">{ago(t, Date.parse(cm.at) / 1000, Date.now())}</span>
                  <p>{cm.body}</p>
                </div>
              ))}
              <textarea aria-label={t('Responder')} rows={2} value={drafts[th.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [th.id]: e.target.value }))} />
              {errors[th.id] && (
                <p className="mr-score-error" role="alert">
                  {errors[th.id]}
                </p>
              )}
              <button type="button" onClick={() => void send(th)} disabled={!(drafts[th.id] ?? '').trim() || sending[th.id]}>
                {t('Enviar')}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
