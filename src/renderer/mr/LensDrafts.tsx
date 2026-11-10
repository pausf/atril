import { useEffect, useState } from 'react'
import type { MrDraft, MrDrafts, MrDraftsResult, MrItem } from '../../preload/api'
import { useT } from '../ui'

/** M27: «file:line», «file», or nothing. */
const place = (d: MrDraft): string | undefined => (d.file ? (d.line === undefined ? d.file : `${d.file}:${d.line}`) : undefined)

/** M25–M29: the lens review's drafts of one MR. Draft text is Claude's, shown as text and never markup. */
export function LensDrafts({ m, reviewable }: { m: MrItem; reviewable: boolean }) {
  const t = useT()
  const [data, setData] = useState<MrDrafts | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [failure, setFailure] = useState('')
  const [acting, setActing] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let live = true
    void window.atril.mr.draftsOf(m.url).then((r) => live && !('error' in r) && setData(r))
    return () => {
      live = false
    }
  }, [m.url])

  const take = (r: MrDraftsResult): string | undefined => {
    if ('error' in r) return r.error
    setData(r)
    return undefined
  }

  const review = async (): Promise<void> => {
    // A click is a discrete event, so React disables the button before a second one lands.
    setReviewing(true)
    const error = take(await window.atril.mr.review(m.url))
    setReviewing(false)
    setFailure(error ?? '')
  }

  const act = async (d: MrDraft, call: (url: string, id: string) => Promise<MrDraftsResult>): Promise<void> => {
    setActing((a) => ({ ...a, [d.id]: true }))
    const error = take(await call(m.url, d.id))
    setActing((a) => ({ ...a, [d.id]: false }))
    setErrors((e) => ({ ...e, [d.id]: error ?? '' }))
  }

  const reviewed = data?.head !== undefined
  if (!data || (!reviewable && !reviewed)) return null
  const lens = { intent: t('Intención'), security: t('Seguridad'), design: t('Diseño'), reliability: t('Fiabilidad'), tests: t('Tests') }
  const severity = { high: t('Alta'), medium: t('Media'), low: t('Baja') }
  const api = window.atril.mr
  return (
    <section className="mr-lens" aria-labelledby="mr-lens-title">
      <h4 id="mr-lens-title">{t('Libretto')}</h4>
      {data.stale && <p className="score-stale">{t('De un commit anterior')}</p>}
      {reviewable && (!reviewed || data.stale) && (
        <button type="button" onClick={() => void review()} disabled={reviewing}>
          {reviewing ? t('Revisando…') : reviewed ? t('Revisar de nuevo') : t('Revisar con Libretto')}
        </button>
      )}
      {failure && (
        <p className="mr-score-error" role="alert">
          {failure}
        </p>
      )}
      {reviewed && data.drafts.length === 0 && <p className="f-note">{t('Libretto no ha encontrado nada que comentar')}</p>}
      {data.drafts.length > 0 && (
        <ul className="mr-drafts">
          {data.drafts.map((d) => (
            <li key={d.id} className="mr-draft">
              <span className="tag">{`${lens[d.lens]} · ${severity[d.severity]}`}</span>
              {place(d) && <code className="mr-draft-place">{place(d)}</code>}
              <p>{d.text}</p>
              {d.state === 'open' ? (
                <div className="mr-draft-actions">
                  <button type="button" disabled={acting[d.id]} onClick={() => void act(d, api.publishDraft)}>
                    {t('Publicar')}
                  </button>
                  {data.canSend && (
                    <button type="button" disabled={acting[d.id]} onClick={() => void act(d, api.sendDraft)}>
                      {t('Mandar al agente')}
                    </button>
                  )}
                  <button type="button" className="linklike" disabled={acting[d.id]} onClick={() => void act(d, api.discardDraft)}>
                    {t('Descartar')}
                  </button>
                </div>
              ) : (
                <span className="mr-draft-done">{d.state === 'published' ? t('Publicado') : t('Enviado al agente')}</span>
              )}
              {/* M37: main's own text, already in the person's language. */}
              {d.state === 'published' && d.note && <p className="f-note">{d.note}</p>}
              {errors[d.id] && (
                <p className="mr-score-error" role="alert">
                  {errors[d.id]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
