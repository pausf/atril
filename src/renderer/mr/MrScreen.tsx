import { useContext, useEffect } from 'react'
import type { CiState, ForgeId, MrItem, MrListName } from '../../preload/api'
import { FoldSection } from '../components/Fold'
import { ago } from '../flow/ActivityFeed'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'
import type { MrsState } from './useMrs'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

export function MrScreen({ mrs }: { mrs: MrsState }) {
  const { result, loading, refresh } = mrs
  const { openSettings } = useContext(NavigationContext)
  const t = useT()
  // M9: opening the screen loads the lists again.
  useEffect(() => void refresh(), [refresh])
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
              <Row key={m.url} m={m} />
            ))}
            {result.more[l].map((f) => (
              <p key={f} className="f-note">
                {t('Hay más: ábrelas en {forge}', { forge: NAME[f] })}
              </p>
            ))}
          </FoldSection>
        ))
      )}
    </section>
  )
}

function Row({ m }: { m: MrItem }) {
  const t = useT()
  const ci: Record<CiState, string> = { pass: t('Pasa'), fail: t('Falla'), running: t('En curso'), none: t('Sin CI') }
  const files = m.files === undefined ? '—' : t('{n} archivos', { n: m.files })
  const size = m.added !== undefined && m.removed !== undefined ? `+${m.added} −${m.removed} · ${files}` : files
  return (
    <button className="mr-row" onClick={() => void window.atril.mr.open(m.url)}>
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
