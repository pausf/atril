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
  const said: Record<MrReviewer['state'], string> = { approved: t('approved'), changes: t('requested changes'), commented: t('commented'), pending: t('pending') }
  const loaded = page && 'files' in page ? page : null
  const reviewers = loaded?.reviewers
  return (
    <aside className="mr-side" aria-label={t('This MR')}>
      <section className="mr-card">
        <h3>{t('Score@@noun')}</h3>
        {list === 'following' ? (
          <p className="f-note">{t('MRs you follow are not scored.')}</p>
        ) : score.state === 'done' ? (
          <ScoreView m={m} score={score.score} onScore={onScore} />
        ) : score.state === 'queued' ? (
          <p className="f-note">{t('Queued')}</p>
        ) : score.state === 'running' ? (
          <p className="f-note">{t('Scoring…')}</p>
        ) : (
          <>
            {score.state === 'error' ? <p className="mr-score-error">{score.text}</p> : <p className="f-note">{t('Not scored')}</p>}
            <button type="button" className="btn" onClick={onScore}>
              {t('Score')}
            </button>
          </>
        )}
      </section>
      <section className="mr-card">
        <h3>{t('Against its spec')}</h3>
        {loaded &&
          (loaded.contract ? (
            <>
              <p>{t('Libretto contract: {contract}', { contract: loaded.contract })}</p>
              <p className="f-note">{t('Its criteria are checked with «In depth».')}</p>
            </>
          ) : (
            <p className="f-note">{t('No Libretto contract in this MR.')}</p>
          ))}
      </section>
      <section className="mr-card">
        <h3>{t('Reviewers')}</h3>
        {reviewers &&
          (Array.isArray(reviewers) ? (
            reviewers.length ? (
              <ul className="mr-reviewers">
                {reviewers.map((r) => (
                  <li key={r.name}>{`${r.name} · ${said[r.state]}`}</li>
                ))}
              </ul>
            ) : (
              <p className="f-note">{t('No reviewers yet')}</p>
            )
          ) : (
            <Problem what={reviewers.error} fix={fixLabel(t, reviewers.fix ?? 'retry')} onFix={reviewers.fix === 'settings' ? openSettings : onRetry} detail={reviewers.detail ?? ''} />
          ))}
      </section>
      <section className="mr-card">
        <h3>{t('CI')}</h3>
        {m.ci ? <FixCi m={m} /> : <span>—</span>}
        {m.conflict && <p className="conflict">{t('In conflict')}</p>}
      </section>
    </aside>
  )
}
