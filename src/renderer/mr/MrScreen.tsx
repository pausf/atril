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
  // M43: the row of the MR just left stays marked and focused until another MR opens.
  const [last, setLast] = useState<string | null>(null)
  const [merged, setMerged] = useState<{ title: string; list?: { error: string; detail: string; fix: NetFix } } | null>(null)
  const dirty = useRef(false)
  const escape = useRef<(() => boolean) | null>(null)
  const { openSettings } = useContext(NavigationContext)
  const t = useT()
  // M43: leaving the page, for the inbox or another row, asks first while a reply waits unsent.
  const go = (url: string | null): void => {
    if (url === opened) return
    if (dirty.current && !window.confirm(t('You have an unsent reply. Leave and discard it?'))) return
    dirty.current = false
    if (url) setMerged(null)
    setLast(url ? null : opened)
    setOpened(url)
  }
  const goRef = useRef(go)
  goRef.current = go
  const stepRef = useRef<(d: number) => string | undefined>(() => undefined)
  // M43: Escape closes only the topmost layer: the page's own (menu, confirmation), else the page.
  // M52: J/K open the next or previous MR, unless typing, held, modified or under a menu or dialog.
  useEffect(() => {
    if (!opened) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        if (document.querySelector('[aria-modal="true"]') || escape.current?.()) return
        return goRef.current(null)
      }
      if ((e.key !== 'j' && e.key !== 'k') || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return
      const el = document.activeElement as HTMLElement | null
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return
      const next = stepRef.current(e.key === 'j' ? 1 : -1)
      if (!next) return
      e.preventDefault()
      goRef.current(next)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [opened])
  useEffect(() => {
    if (!opened && last) document.querySelector<HTMLElement>('.mr-row[aria-current="true"]')?.focus()
  }, [opened, last])
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
    setLast(null)
    setOpened(m.url)
  }, [result, openUrl])
  const titles: Record<MrListName, string> = { mine: t('Mine'), review: t('To review'), following: t('Following') }
  const listOf = (url: string): MrListName | undefined => (['mine', 'review', 'following'] as const).find((l) => result?.[l].some((r) => r.url === url))
  const openList = opened ? listOf(opened) : undefined
  const openRow = opened && openList ? result![openList].find((r) => r.url === opened) : undefined
  // M43: Mías, Me toca revisar and Sigo in order, an MR in two lists only at its first.
  const order = result ? [...new Set([...result.mine, ...result.review, ...result.following].map((r) => r.url))] : []
  const at = opened ? order.indexOf(opened) : -1
  stepRef.current = (d) => (at >= 0 ? order[at + d] : undefined)
  return (
    <section className={`tasks-screen mr-screen${opened ? ' open' : ''}`} data-tour="mr">
      <h1>
        {t('MR')}
        <button className="refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? t('Updating…') : t('Refresh')}
        </button>
      </h1>
      {merged && (
        <p className="f-note mr-merged" role="status">
          {t('Merged: {title}', { title: merged.title })}
        </p>
      )}
      {merged?.list && (
        <Problem what={merged.list.error} cant={t('I cannot show you your MRs up to date.')} fix={fixLabel(t, merged.list.fix)} onFix={merged.list.fix === 'settings' ? openSettings : () => void refresh()} detail={merged.list.detail} />
      )}
      {!opened && <p className="lead">{t('Your open MRs, the ones you have to review and those in the projects you follow on GitHub and GitLab.')}</p>}
      {result?.errors.map((e) => (
        <Problem
          key={e.forge}
          what={e.error}
          cant={t("I can't show you your {forge} MRs.", { forge: NAME[e.forge] })}
          fix={fixLabel(t, e.fix)}
          onFix={e.fix === 'settings' ? openSettings : () => void refresh()}
          detail={e.detail}
        />
      ))}
      <div className={opened ? 'mr-layout' : undefined}>
      {opened ? null : !result ? (
        <div className="empty">{t('Loading your MRs…')}</div>
      ) : result.connected.length === 0 ? (
        <div className="empty">
          <p>{t('Connect GitHub or GitLab in Settings')}</p>
          <button className="linklike" onClick={openSettings}>
            {t('Open Settings')}
          </button>
        </div>
      ) : (
        (['mine', 'review', 'following'] as const).map((l) => (
          <FoldSection key={l} id={`mr-${l}`} title={titles[l]} count={result[l].length} className="tgroup">
            {/* M6: while a forge failed, an empty section may just be the missing part. */}
            {result[l].length === 0 && result.errors.length === 0 && <p className="f-note">{t('No MRs.')}</p>}
            {result[l].map((m) => (
              <div key={m.url} className="mr-line">
                <Row m={m} current={last === m.url} onOpen={() => go(m.url)} />
                {/* M12: never «Sigo». */}
                {l !== 'following' && (
                  <ScoreCell m={m} state={scores[m.url] ?? { state: 'none' }} onScore={() => score(m.url)} onView={() => go(m.url)} tour={!openRow} />
                )}
              </div>
            ))}
            {result.more[l].map((f) => (
              <p key={f} className="f-note">
                {t('There are more: open them on {forge}', { forge: NAME[f] })}
              </p>
            ))}
          </FoldSection>
        ))
      )}
      {opened &&
        (openRow && openList ? (
          <MrPage key={opened} m={openRow} list={openList} pos={at >= 0 ? { i: at + 1, n: order.length } : undefined} score={scores[openRow.url] ?? { state: 'none' }} onScore={() => score(openRow.url)} onLeave={() => go(null)}
            onMerged={(r) => {
              // M42: back to the inbox; main listed again, so the window reads that listing unless it failed.
              dirty.current = false
              setLast(opened)
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
                {t('‹ Your MRs')}
              </button>
              {/* M51, W52: main only opens what its latest listing holds. */}
              <Problem what={t('This MR is no longer in the list')} cant={t("I cannot show you this MR's code.")} fix={t('Check again')} onFix={() => void refresh()} detail="" />
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
  if (state.state === 'queued') return <span className="mr-score f-note">{t('Queued')}</span>
  if (state.state === 'running') return <span className="mr-score f-note">{t('Scoring…')}</span>
  if (state.state === 'done') {
    const { metrics, ai } = state.score
    const stale = isStale(m, state.score)
    return (
      <span className="mr-score">
        <button type="button" className="tag mr-chips" title={t('View the score')} onClick={onView}>
          {`${metrics.size} · D${ai.difficulty} · R${ai.risk}`}
        </button>
        {stale && (
          <>
            <span className="f-note">{t('From an earlier commit')}</span>
            <button type="button" className="linklike" onClick={onScore}>
              {t('Score again')}
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
        {t('Score')}
      </button>
    </span>
  )
}

function Row({ m, current, onOpen }: { m: MrItem; current?: boolean; onOpen: () => void }) {
  const t = useT()
  const ci: Record<CiState, string> = { pass: t('Passing'), fail: t('Failing'), running: t('In progress'), none: t('No CI') }
  const files = m.files === undefined ? '—' : t('{n} files', { n: m.files })
  const size = m.added !== undefined && m.removed !== undefined ? `+${m.added} −${m.removed} · ${files}` : files
  return (
    <button className="mr-row" aria-current={current ? 'true' : undefined} onClick={onOpen}>
      <span className="s" title={m.title}>
        {m.title}
      </span>
      {m.conflict && <span className="tag conflict">{t('In conflict')}</span>}
      <span className="k">{m.project}</span>
      <span className="who">{m.author}</span>
      <span className={`tag ci-${m.ci ?? 'unknown'}`}>{m.ci ? ci[m.ci] : '—'}</span>
      <span className="size">{size}</span>
      <span className="age">{ago(t, Date.parse(m.updatedAt) / 1000, Date.now())}</span>
    </button>
  )
}
