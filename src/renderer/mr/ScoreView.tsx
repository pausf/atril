import type { MrItem, MrScore } from '../../preload/api'
import { useT } from '../ui'

/** M13: only a known listed head that differs makes a score stale. */
export const isStale = (m: MrItem, s: MrScore): boolean => !!m.head && !!s.head && m.head !== s.head

/** M15: what Atril measured, then Claude's view. Claude's text is shown as it answered. */
export function ScoreView({ m, score, onScore }: { m: MrItem; score: MrScore; onScore: () => void }) {
  const t = useT()
  const { metrics, ai, cut } = score
  return (
    <div className="score-body">
      {isStale(m, score) && (
        <p className="score-stale">
          {t('From an earlier commit')}{' '}
          <button type="button" className="linklike" onClick={onScore}>
            {t('Score again')}
          </button>
        </p>
      )}
      <h4>{t('What Atril measures')}</h4>
      <ul className="score-measures">
        <li>{t('Size {size}', { size: metrics.size })}</li>
        <li>{`+${metrics.added} −${metrics.removed}`}</li>
        <li>{t('{n} files', { n: metrics.files })}</li>
        <li>{metrics.tests ? t('Changes tests') : t('No test changes')}</li>
      </ul>
      <h4>{t('What Claude says')}</h4>
      <ul className="score-measures">
        <li>{t('Difficulty {n} of 5', { n: ai.difficulty })}</li>
        <li>{t('Risk {n} of 5', { n: ai.risk })}</li>
      </ul>
      <h5>{t('What it does')}</h5>
      <p>{ai.what}</p>
      <h5>{t('Why')}</h5>
      <p>{ai.why}</p>
      {ai.where.length > 0 && (
        <>
          <h5>{t('Where to look')}</h5>
          <ul>
            {ai.where.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      )}
      {cut && <p className="f-note">{t('Claude saw {seen} of {total} KB', { seen: cut.seen, total: cut.total })}</p>}
    </div>
  )
}
