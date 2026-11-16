import { useContext, useEffect, useRef, useState } from 'react'
import type { CiState, ForgeId, MrItem, MrListName, MrScoreState, NetFix } from '../../preload/api'
import { FoldSection } from '../components/Fold'
import { Problem, fixLabel } from '../components/Problem'
import { ago } from '../flow/ActivityFeed'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'
import { MrPage } from './MrPage'
import { isStale } from './ScoreView'
import type { MrsState } from './useMrs'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

/** `openUrl`: a row to open in its page once it is listed (an Avisos notice). */
export function MrScreen({ mrs, openUrl }: { mrs: MrsState; openUrl?: string | null }) {
  const { result, loading, refresh, scores, score } = mrs
  const [opened, setOpened] = useState<string | null>(null)
  const [merged, setMerged] = useState<{ title: string; list?: { error: string; detail: string; fix: NetFix } } | null>(null)
  const dirty = useRef(false)
  const escape = useRef<(() => boolean) | null>(null)
  const { openSettings } = useContext(NavigationContext)
  const t = useT()
  // M43: leaving the page, for the inbox or another row, asks first while a reply waits unsent.
  const go = (url: string | null): void => {
    if (url === opened) return
    if (dirty.current && !window.confirm(t('Tienes una respuesta sin enviar. ¿Salir y descartarla?'))) return
    dirty.current = false
    if (url) setMerged(null)
    setOpened(url)
  }
  const goRef = useRef(go)
  goRef.current = go
  // M43: Escape closes only the topmost layer: the page's own (menu, confirmation), else the page.
  useEffect(() => {
    if (!opened) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return
      if (escape.current?.()) return
      goRef.current(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [opened])
  // M9: opening the screen loads the lists again.
  useEffect(() => void refresh(), [refresh])
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-score|mr-thread|mr-lens opens the first row of Mías for a photo.
  useEffect(() => {
    const first = result?.mine[0]
    if (first) void window.atril.snapshotView().then((v) => /^mr-(score|thread|lens)$/.test(v ?? '') && setOpened((cur) => cur ?? first.url))
  }, [result])
  const handled = useRef<string | null>(null)
  useEffect(() => {
    const m = result && [...result.mine, ...result.review, ...result.following].find((r) => r.url === openUrl)
    if (!m || handled.current === openUrl) return
    handled.current = m.url
    setOpened(m.url)
  }, [result, openUrl])
  const titles: Record<MrListName, string> = { mine: t('Mías'), review: t('Me toca revisar'), following: t('Sigo') }
  const listOf = (url: string): MrListName | undefined => (['mine', 'review', 'following'] as const).find((l) => result?.[l].some((r) => r.url === url))
  const openList = opened ? listOf(opened) : undefined
  const openRow = opened && openList ? result![openList].find((r) => r.url === opened) : undefined
  return (
    <section className={`tasks-screen mr-screen${opened ? ' open' : ''}`} data-tour="mr">
      <h1>
        {t('MR')}
        <button className="refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? t('Actualizando…') : t('Actualizar')}
        </button>
      </h1>
      {merged && (
        <p className="f-note mr-merged" role="status">
          {t('Fusionada: {title}', { title: merged.title })}
        </p>
      )}
      {merged?.list && (
        <Problem what={merged.list.error} cant={t('No puedo enseñarte tus MR al día.')} fix={fixLabel(t, merged.list.fix)} onFix={merged.list.fix === 'settings' ? openSettings : () => void refresh()} detail={merged.list.detail} />
      )}
      {!opened && <p className="lead">{t('Tus MR abiertas, las que te toca revisar y las de los proyectos que sigues en GitHub y GitLab.')}</p>}
      {result?.errors.map((e) => (
        <Problem
          key={e.forge}
          what={e.error}
          cant={t('No puedo enseñarte tus MRs de {forge}.', { forge: NAME[e.forge] })}
          fix={fixLabel(t, e.fix)}
          onFix={e.fix === 'settings' ? openSettings : () => void refresh()}
          detail={e.detail}
        />
      ))}
      <div className={opened ? 'mr-layout' : undefined}>
      <div className={opened ? 'mr-inbox' : undefined}>
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
            {/* M6: while a forge failed, an empty section may just be the missing part. */}
            {result[l].length === 0 && result.errors.length === 0 && <p className="f-note">{t('Ninguna MR.')}</p>}
            {result[l].map((m) => (
              <div key={m.url} className="mr-line">
                <Row m={m} current={opened === m.url} onOpen={() => go(m.url)} />
                {/* M12: never «Sigo». */}
                {l !== 'following' && (
                  <ScoreCell m={m} state={scores[m.url] ?? { state: 'none' }} onScore={() => score(m.url)} onView={() => go(m.url)} tour={!openRow} />
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
      </div>
      {opened &&
        (openRow && openList ? (
          <MrPage key={opened} m={openRow} list={openList} score={scores[openRow.url] ?? { state: 'none' }} onScore={() => score(openRow.url)} onLeave={() => go(null)}
            onMerged={(r) => {
              // M42: back to the inbox; main listed again, so the window reads that listing unless it failed.
              dirty.current = false
              setOpened(null)
              setMerged({ title: openRow.title, ...(r.list && { list: r.list }) })
              if (!r.list) void refresh()
            }}
            onRelist={() => void refresh()}
            dirty={dirty}
            escape={escape}
          />
        ) : (
          result && (
            <section className="mr-page" aria-label={t('MR')}>
              <button type="button" className="back" onClick={() => go(null)}>
                {t('‹ Tus MR')}
              </button>
              {/* M51, W52: main only opens what its latest listing holds. */}
              <Problem what={t('Esta MR ya no está en la lista')} cant={t('No puedo enseñarte el código de esta MR.')} fix={t('Volver a comprobar')} onFix={() => void refresh()} detail="" />
            </section>
          )
        ))}
      </div>
    </section>
  )
}

/** M15: «En cola», «Puntuando…», the chips or the error. */
/** `tour`: the rows carry the «Puntuar y revisar» step while no page (and its «Revisar ▾») is open. */
function ScoreCell({ m, state, onScore, onView, tour }: { m: MrItem; state: MrScoreState; onScore: () => void; onView: () => void; tour: boolean }) {
  const t = useT()
  if (state.state === 'queued') return <span className="mr-score f-note">{t('En cola')}</span>
  if (state.state === 'running') return <span className="mr-score f-note">{t('Puntuando…')}</span>
  if (state.state === 'done') {
    const { metrics, ai } = state.score
    const stale = isStale(m, state.score)
    return (
      <span className="mr-score">
        <button type="button" className="tag mr-chips" title={t('Ver la puntuación')} onClick={onView}>
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
    <span className="mr-score" data-tour={tour ? 'mr-tools' : undefined}>
      {state.state === 'error' && <span className="mr-score-error">{state.text}</span>}
      <button type="button" className="linklike" onClick={onScore}>
        {t('Puntuar')}
      </button>
    </span>
  )
}

function Row({ m, current, onOpen }: { m: MrItem; current?: boolean; onOpen: () => void }) {
  const t = useT()
  const ci: Record<CiState, string> = { pass: t('Pasa'), fail: t('Falla'), running: t('En curso'), none: t('Sin CI') }
  const files = m.files === undefined ? '—' : t('{n} archivos', { n: m.files })
  const size = m.added !== undefined && m.removed !== undefined ? `+${m.added} −${m.removed} · ${files}` : files
  return (
    <button className="mr-row" aria-current={current ? 'true' : undefined} onClick={onOpen}>
      <span className="s" title={m.title}>
        {m.title}
      </span>
      {m.conflict && <span className="tag conflict">{t('En conflicto')}</span>}
      <span className="k">{m.project}</span>
      <span className="who">{m.author}</span>
      <span className={`tag ci-${m.ci ?? 'unknown'}`}>{m.ci ? ci[m.ci] : '—'}</span>
      <span className="size">{size}</span>
      <span className="age">{ago(t, Date.parse(m.updatedAt) / 1000, Date.now())}</span>
    </button>
  )
}
