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
          {t('De un commit anterior')}{' '}
          <button type="button" className="linklike" onClick={onScore}>
            {t('Puntuar de nuevo')}
          </button>
        </p>
      )}
      <h4>{t('Lo que mide Atril')}</h4>
      <ul className="score-measures">
        <li>{t('Tamaño {size}', { size: metrics.size })}</li>
        <li>{`+${metrics.added} −${metrics.removed}`}</li>
        <li>{t('{n} archivos', { n: metrics.files })}</li>
        <li>{metrics.tests ? t('Cambia tests') : t('No cambia tests')}</li>
      </ul>
      <h4>{t('Lo que dice Claude')}</h4>
      <ul className="score-measures">
        <li>{t('Dificultad {n} de 5', { n: ai.difficulty })}</li>
        <li>{t('Riesgo {n} de 5', { n: ai.risk })}</li>
      </ul>
      <h5>{t('Qué hace')}</h5>
      <p>{ai.what}</p>
      <h5>{t('Por qué')}</h5>
      <p>{ai.why}</p>
      {ai.where.length > 0 && (
        <>
          <h5>{t('Dónde mirar')}</h5>
          <ul>
            {ai.where.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      )}
      {cut && <p className="f-note">{t('Claude vio {seen} de {total} KB', { seen: cut.seen, total: cut.total })}</p>}
    </div>
  )
}
