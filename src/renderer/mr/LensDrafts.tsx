import { useCallback, useEffect, useState } from 'react'
import type { MrDraft, MrDrafts, MrDraftsResult, MrItem } from '../../preload/api'
import { useT } from '../ui'

/** M27: «file:line», «file», or nothing. */
const place = (d: MrDraft): string | undefined => (d.file ? (d.line === undefined ? d.file : `${d.file}:${d.line}`) : undefined)

export interface DraftsState {
  data: MrDrafts | null
  reviewing: boolean
  failure: string
  review: () => Promise<void>
  act: (d: MrDraft, call: (url: string, id: string) => Promise<MrDraftsResult>) => Promise<void>
  acting: Record<string, boolean>
  errors: Record<string, string>
}

/** M25–M29: the lens review's drafts of one MR and what can be done with them. */
export function useDrafts(m: MrItem): DraftsState {
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

  const review = useCallback(async (): Promise<void> => {
    // A click is a discrete event, so React disables the button before a second one lands.
    setReviewing(true)
    // A rejected call must not leave «Revisando…» forever.
    const r = await window.atril.mr.review(m.url).catch((): MrDraftsResult => ({ error: t('Claude no ha podido revisar esta MR: {detail}', { detail: 'error' }) }))
    setReviewing(false)
    setFailure(take(r) ?? '')
  }, [m.url, t])

  const act = async (d: MrDraft, call: (url: string, id: string) => Promise<MrDraftsResult>): Promise<void> => {
    setActing((a) => ({ ...a, [d.id]: true }))
    const error = take(await call(m.url, d.id))
    setActing((a) => ({ ...a, [d.id]: false }))
    setErrors((e) => ({ ...e, [d.id]: error ?? '' }))
  }

  return { data, reviewing, failure, review, act, acting, errors }
}

/** M29: one draft as text; its actions while open, a word after. Draft text is Claude's, never markup. */
export function Draft({ d, s }: { d: MrDraft; s: DraftsState }) {
  const t = useT()
  const lens = { intent: t('Intención'), security: t('Seguridad'), design: t('Diseño'), reliability: t('Fiabilidad'), tests: t('Tests') }
  const severity = { high: t('Alta'), medium: t('Media'), low: t('Baja') }
  const api = window.atril.mr
  return (
    <div className="mr-draft">
      <span className="tag">{`${lens[d.lens]} · ${severity[d.severity]}`}</span>
      {place(d) && <code className="mr-draft-place">{place(d)}</code>}
      <p>{d.text}</p>
      {d.state === 'open' ? (
        <div className="mr-draft-actions">
          <button type="button" className="btn" disabled={s.acting[d.id]} onClick={() => void s.act(d, api.publishDraft)}>
            {d.file && d.line !== undefined ? t('Publicar en esta línea') : t('Publicar')}
          </button>
          {s.data?.canSend && (
            <button type="button" className="btn" disabled={s.acting[d.id]} onClick={() => void s.act(d, api.sendDraft)}>
              {t('Mandar al agente')}
            </button>
          )}
          <button type="button" className="linklike" disabled={s.acting[d.id]} onClick={() => void s.act(d, api.discardDraft)}>
            {t('Descartar')}
          </button>
        </div>
      ) : (
        <span className="mr-draft-done">{d.state === 'published' ? t('Publicado') : t('Enviado al agente')}</span>
      )}
      {/* M37: main's own text, already in the person's language. */}
      {d.state === 'published' && d.note && <p className="f-note">{d.note}</p>}
      {s.errors[d.id] && (
        <p className="mr-score-error" role="alert">
          {s.errors[d.id]}
        </p>
      )}
    </div>
  )
}

/** The Libretto section above the files: what the last review said, and the drafts with no line. Comentar is in «Revisar ▾» (M45). */
export function LensDrafts({ s, drafts }: { s: DraftsState; drafts: MrDraft[] }) {
  const t = useT()
  const { data, failure } = s
  const reviewed = data?.head !== undefined
  if (!data || (!reviewed && !failure)) return null
  return (
    <section className="mr-lens" aria-labelledby="mr-lens-title">
      <h4 id="mr-lens-title">{t('Libretto')}</h4>
      {data.stale && <p className="score-stale">{t('De un commit anterior')}</p>}
      {failure && (
        <p className="mr-score-error" role="alert">
          {failure}
        </p>
      )}
      {reviewed && data.drafts.length === 0 && <p className="f-note">{t('Libretto no ha encontrado nada que comentar')}</p>}
      {drafts.length > 0 && (
        <ul className="mr-drafts">
          {drafts.map((d) => (
            <li key={d.id}>
              <Draft d={d} s={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
