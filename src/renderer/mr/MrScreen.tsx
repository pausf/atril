import { useContext, useEffect, useState } from 'react'
import type { CiState, ForgeId, MrItem, MrListName, MrScore, MrScoreState } from '../../preload/api'
import { FoldSection } from '../components/Fold'
import { ago } from '../flow/ActivityFeed'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'
import { MrView } from './MrView'
import { ScoreView, isStale } from './ScoreView'
import type { MrsState } from './useMrs'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

export function MrScreen({ mrs }: { mrs: MrsState }) {
  const { result, loading, refresh, scores, score } = mrs
  const [viewing, setViewing] = useState<{ m: MrItem; score: MrScore } | null>(null)
  const [opened, setOpened] = useState<MrItem | null>(null)
  const { openSettings } = useContext(NavigationContext)
  const t = useT()
  // M9: opening the screen loads the lists again.
  useEffect(() => void refresh(), [refresh])
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-score opens the first score for a photo.
  useEffect(() => {
    const first = result?.mine[0]
    const s = first && scores[first.url]
    if (first && s?.state === 'done') void window.atril.snapshotView().then((v) => v === 'mr-score' && setViewing((cur) => cur ?? { m: first, score: s.score }))
  }, [result, scores])
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-thread opens the first row of Mías for a photo.
  useEffect(() => {
    const first = result?.mine[0]
    if (first) void window.atril.snapshotView().then((v) => v === 'mr-thread' && setOpened((cur) => cur ?? first))
  }, [result])
  const titles: Record<MrListName, string> = { mine: t('Mías'), review: t('Me toca revisar'), following: t('Sigo') }
  return (
    <section className="tasks-screen" data-tour="mr">
      <h1>
        {t('MR')}
        <button className="refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? t('Actualizando…') : t('Actualizar')}
        </button>
      </h1>
      <p className="lead">{t('Tus MR abiertas, las que te toca revisar y las de los proyectos que sigues en GitHub y GitLab.')}</p>
      {result?.errors.map((e) => (
        <p key={e.forge} className="notice" role="alert">
          {e.text}
        </p>
      ))}
      {!result ? (
        <div className="empty">{t('Cargando tus MR…')}</div>
      ) : result.connected.length === 0 ? (
        <div className="empty">
          <p>{t('Conecta GitHub o GitLab en Ajustes')}</p>
          <button className="linklike" onClick={openSettings}>
            {t('Abrir Ajustes')}
          </button>
        </div>
      ) : (
        (['mine', 'review', 'following'] as const).map((l) => (
          <FoldSection key={l} id={`mr-${l}`} title={titles[l]} count={result[l].length} className="tgroup">
            {result[l].length === 0 && <p className="f-note">{t('Ninguna MR.')}</p>}
            {result[l].map((m) => (
              <div key={m.url} className="mr-line">
                <Row m={m} onOpen={() => setOpened(m)} />
                {/* M12: never «Sigo». */}
                {l !== 'following' && (
                  <ScoreCell m={m} state={scores[m.url] ?? { state: 'none' }} onScore={() => score(m.url)} onView={(sc) => setViewing({ m, score: sc })} />
                )}
              </div>
            ))}
            {result.more[l].map((f) => (
              <p key={f} className="f-note">
                {t('Hay más: ábrelas en {forge}', { forge: NAME[f] })}
              </p>
            ))}
          </FoldSection>
        ))
      )}
      {opened && <MrView m={opened} onClose={() => setOpened(null)} />}
      {viewing && <ScoreView m={viewing.m} score={viewing.score} onScore={() => score(viewing.m.url)} onClose={() => setViewing(null)} />}
    </section>
  )
}

/** M15: «En cola», «Puntuando…», the chips or the error. */
function ScoreCell({ m, state, onScore, onView }: { m: MrItem; state: MrScoreState; onScore: () => void; onView: (s: MrScore) => void }) {
  const t = useT()
  if (state.state === 'queued') return <span className="mr-score f-note">{t('En cola')}</span>
  if (state.state === 'running') return <span className="mr-score f-note">{t('Puntuando…')}</span>
  if (state.state === 'done') {
    const { metrics, ai } = state.score
    const stale = isStale(m, state.score)
    return (
      <span className="mr-score">
        <button type="button" className="tag mr-chips" title={t('Ver la puntuación')} onClick={() => onView(state.score)}>
          {`${metrics.size} · D${ai.difficulty} · R${ai.risk}`}
        </button>
        {stale && (
          <>
            <span className="f-note">{t('De un commit anterior')}</span>
            <button type="button" className="linklike" onClick={onScore}>
              {t('Puntuar de nuevo')}
            </button>
          </>
        )}
      </span>
    )
  }
  return (
    <span className="mr-score">
      {state.state === 'error' && <span className="mr-score-error">{state.text}</span>}
      <button type="button" className="linklike" onClick={onScore}>
        {t('Puntuar')}
      </button>
    </span>
  )
}

function Row({ m, onOpen }: { m: MrItem; onOpen: () => void }) {
  const t = useT()
  const ci: Record<CiState, string> = { pass: t('Pasa'), fail: t('Falla'), running: t('En curso'), none: t('Sin CI') }
  const files = m.files === undefined ? '—' : t('{n} archivos', { n: m.files })
  const size = m.added !== undefined && m.removed !== undefined ? `+${m.added} −${m.removed} · ${files}` : files
  return (
    <button className="mr-row" onClick={onOpen}>
      <span className="s" title={m.title}>
        {m.title}
      </span>
      <span className="k">{m.project}</span>
      <span className="who">{m.author}</span>
      <span className={`tag ci-${m.ci ?? 'unknown'}`}>{m.ci ? ci[m.ci] : '—'}</span>
      <span className="size">{size}</span>
      <span className="age">{ago(t, Date.parse(m.updatedAt) / 1000, Date.now())}</span>
    </button>
  )
}
