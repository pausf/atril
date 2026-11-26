import { useEffect, useRef, useState } from 'react'
import type { PluginCatalog, PluginCatalogResult, PluginFailure } from '../../preload/api'
import { useT } from '../ui'
import { PluginProblem } from './PluginProblem'

type Available = PluginCatalog['available'][number]

/** K32: what the added marketplaces offer, minus what is installed, with the scope asked per install. */
export function PluginAddDialog({ repo, busy, install, addMarketplace, onNo }: {
  repo: string | undefined
  busy: boolean
  install: (plugin: string, scope: 'user' | 'local') => void
  addMarketplace: (source: string) => Promise<PluginCatalogResult | undefined>
  onNo: () => void
}) {
  const t = useT()
  const search = useRef<HTMLInputElement>(null)
  const [catalog, setCatalog] = useState<PluginCatalog | null>(null)
  const [failure, setFailure] = useState<PluginFailure | null>(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setFailure(null)
    void window.atril.skills.catalog(repo).then((r) => {
      if (!live) return
      if ('catalog' in r) setCatalog(r.catalog)
      else setFailure(r)
    })
    return () => {
      live = false
    }
  }, [repo, attempt])
  useEffect(() => search.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !busy) onNo()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onNo, busy])

  const have = new Set(catalog?.installed.map((i) => i.pluginId))
  const needle = q.trim().toLowerCase()
  const shown = (catalog?.available ?? []).filter((p) => !have.has(p.pluginId) && (!needle || [p.name, p.description].some((s) => s?.toLowerCase().includes(needle))))
  const marketplaces = [...new Set(shown.map((p) => p.marketplace))]
  const row = (p: Available) => (
    <li key={p.pluginId}>
      <b>{p.name}</b>
      {p.description && <span className="where"> {p.description}</span>}
      {picked === p.pluginId ? (
        <span className="skpa-scope">
          <button type="button" className="btn" disabled={busy} onClick={() => install(p.pluginId, 'user')}>
            {t('For me, in every repo')}
          </button>
          {repo && (
            <button type="button" className="btn" disabled={busy} onClick={() => install(p.pluginId, 'local')}>
              {t('Only for me in {repo}', { repo })}
            </button>
          )}
        </span>
      ) : (
        <button type="button" className="btn" disabled={busy} onClick={() => setPicked(p.pluginId)}>
          {t('Install')}
        </button>
      )}
    </li>
  )
  const title = t('Add plugin')
  return (
    <div className="skw-back">
      <div className="skw skpa" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <input ref={search} type="search" placeholder={t('Search plugin')} aria-label={t('Search plugin')} value={q} onChange={(e) => setQ(e.target.value)} />
        {failure && <PluginProblem what={t('I could not read the marketplaces.')} failure={failure} fix={t('Try again')} onFix={() => setAttempt((n) => n + 1)} />}
        {marketplaces.map((m) => (
          <div key={m} role="group" aria-label={m} className="skpa-mk">
            <h3>{m}</h3>
            <ul>{shown.filter((p) => p.marketplace === m).map(row)}</ul>
          </div>
        ))}
        <form
          className="skpa-add"
          onSubmit={(e) => {
            e.preventDefault()
            if (!source.trim() || busy) return
            void addMarketplace(source.trim()).then((r) => r && 'catalog' in r && setCatalog(r.catalog))
          }}
        >
          <h3>{t('Add marketplace')}</h3>
          <input type="text" aria-label={t('owner/repo or URL')} placeholder={t('owner/repo or URL')} value={source} onChange={(e) => setSource(e.target.value)} autoComplete="off" spellCheck={false} />
          <button type="submit" className="btn" disabled={busy || !source.trim()}>
            {t('Add')}
          </button>
        </form>
        <div className="skw-act">
          <button type="button" className="btn" disabled={busy} onClick={onNo}>
            {t('Cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
