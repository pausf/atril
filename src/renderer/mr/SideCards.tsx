import { useContext } from 'react'
import type { MrItem, MrListName, MrPage, MrReviewer, MrScoreState } from '../../preload/api'
import { Problem, fixLabel } from '../components/Problem'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'
import { FixCi } from './FixCi'
import { ScoreView } from './ScoreView'

/** M48: Puntuación, Contra su spec, Revisores and CI, each with its own failure. */
export function SideCards({ m, list, score, onScore, page, onRetry }: { m: MrItem; list: MrListName; score: MrScoreState; onScore: () => void; page: MrPage | null; onRetry: () => void }) {
  const t = useT()
  const { openSettings } = useContext(NavigationContext)
  const said: Record<MrReviewer['state'], string> = { approved: t('aprobó'), changes: t('pidió cambios'), commented: t('comentó'), pending: t('pendiente') }
  const loaded = page && 'files' in page ? page : null
  const reviewers = loaded?.reviewers
  return (
    <aside className="mr-side" aria-label={t('Esta MR')}>
      <section className="mr-card">
        <h3>{t('Puntuación')}</h3>
        {list === 'following' ? (
          <p className="f-note">{t('Las MR de Sigo no se puntúan.')}</p>
        ) : score.state === 'done' ? (
          <ScoreView m={m} score={score.score} onScore={onScore} />
        ) : score.state === 'queued' ? (
          <p className="f-note">{t('En cola')}</p>
        ) : score.state === 'running' ? (
          <p className="f-note">{t('Puntuando…')}</p>
        ) : (
          <>
            {score.state === 'error' ? <p className="mr-score-error">{score.text}</p> : <p className="f-note">{t('Sin puntuar')}</p>}
            <button type="button" className="btn" onClick={onScore}>
              {t('Puntuar')}
            </button>
          </>
        )}
      </section>
      <section className="mr-card">
        <h3>{t('Contra su spec')}</h3>
        {loaded &&
          (loaded.contract ? (
            <>
              <p>{t('Contrato de Libretto: {contract}', { contract: loaded.contract })}</p>
              <p className="f-note">{t('Sus criterios se comprueban con «A fondo».')}</p>
            </>
          ) : (
            <p className="f-note">{t('Sin contrato de Libretto en esta MR.')}</p>
          ))}
      </section>
      <section className="mr-card">
        <h3>{t('Revisores')}</h3>
        {reviewers &&
          (Array.isArray(reviewers) ? (
            reviewers.length ? (
              <ul className="mr-reviewers">
                {reviewers.map((r) => (
                  <li key={r.name}>{`${r.name} · ${said[r.state]}`}</li>
                ))}
              </ul>
            ) : (
              <p className="f-note">{t('Aún sin revisores')}</p>
            )
          ) : (
            <Problem what={reviewers.error} fix={fixLabel(t, reviewers.fix ?? 'retry')} onFix={reviewers.fix === 'settings' ? openSettings : onRetry} detail={reviewers.detail ?? ''} />
          ))}
      </section>
      <section className="mr-card">
        <h3>{t('CI')}</h3>
        {m.ci ? <FixCi m={m} /> : <span>—</span>}
        {m.conflict && <p className="conflict">{t('En conflicto')}</p>}
      </section>
    </aside>
  )
}
