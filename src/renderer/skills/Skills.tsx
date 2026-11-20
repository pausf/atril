import { useCallback, useEffect, useRef, useState } from 'react'
import type { SkillItem, SkillsList } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT } from '../ui'
import { SkillCard } from './SkillCard'
import { SkillDetail } from './SkillDetail'

type Filter = 'all' | 'on' | 'off'

/** K5: what counts as loaded and what as off; `user-invocable-only` is neither. */
export const isActive = (i: SkillItem): boolean => (i.state === 'on' || i.state === 'name-only') && !i.shadowedBy && i.enabled !== false
export const isOff = (i: SkillItem): boolean => i.state === 'off' || i.enabled === false

const matches = (i: SkillItem, q: string): boolean => {
  const needle = q.trim().toLowerCase()
  return !needle || [i.name, i.description, i.whenToUse].some((s) => s?.toLowerCase().includes(needle))
}

/** Read-only list of what Claude Code loads for a repo: folders and settings, never Claude (K5–K8). */
export function Skills() {
  const t = useT()
  // undefined: still loading; null: the repo list failed.
  const [repos, setRepos] = useState<string[] | null | undefined>(undefined)
  const [repo, setRepo] = useState<string | undefined>(undefined)
  const [data, setData] = useState<SkillsList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<SkillItem | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void window.atril.repos.list().then(
      (l) => {
        const ids = Array.isArray(l) ? l.map((r) => r.id) : null
        setRepos(ids)
        setRepo(ids?.[0])
      },
      () => setRepos(null)
    )
  }, [])

  const load = useCallback(() => {
    if (repos === undefined) return
    setError(null)
    window.atril.skills.list(repo).then(setData, (e: unknown) => {
      setData(null)
      setError(e instanceof Error ? e.message : String(e))
    })
  }, [repos, repo])
  useEffect(load, [load])

  const close = (): void => {
    setOpen(null)
    opener.current?.focus()
  }

  const items = data?.items ?? []
  const shown = items.filter((i) => matches(i, q) && (filter === 'all' || (filter === 'on' ? isActive(i) : isOff(i))))
  const active = items.filter(isActive)
  const tokens = Math.round(active.reduce((n, i) => n + i.name.length + (i.description ?? '').length + (i.whenToUse ?? '').length, 0) / 3.2)
  const repoName = repo ?? ''
  const narrowed = q.trim() !== '' || filter !== 'all'

  const cardsOf = (list: SkillItem[], group: string) => (
    <ul className="skcards">
      {list.map((i, n) => {
        const key = `${group}-${n}-${i.kind}-${i.name}`
        return (
          <SkillCard
            key={key}
            id={`sk-${key}`}
            item={i}
            repo={repoName}
            onOpen={(el) => {
              opener.current = el
              setOpen(i)
            }}
          />
        )
      })}
    </ul>
  )
  const of = (origin: SkillItem['origin']): SkillItem[] => shown.filter((i) => i.origin === origin)
  const plugins = [...new Set(items.filter((i) => i.origin === 'plugin').map((i) => i.plugin ?? ''))]
  const projectTotal = items.filter((i) => i.origin === 'project').length

  return (
    <section className="tasks-screen skills" aria-label={t('Skills')}>
      <h1>
        {t('Skills')}
        <span className="n">{items.length}</span>
      </h1>
      <p className="lead">{t('Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.')}</p>
      {data?.warnings.map((w) => (
        <p key={w} className="notice" role="note">
          {w}
        </p>
      ))}
      {repos?.length === 0 && <p className="notice">{t('Añade un repo en Ajustes → Repos para ver sus skills.')}</p>}
      {error !== null && <Problem what={t('No he podido leer tus skills.')} cant={t('No puedo enseñarte qué tiene a mano tu Claude Code.')} fix={t('Volver a intentar')} onFix={load} detail={error} />}

      <div className="sk-bar">
        <input ref={search} type="search" placeholder={t('Buscar por nombre o descripción…')} aria-label={t('Buscar por nombre o descripción…')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label={t('Filtro')}>
          {(
            [
              ['all', t('Todas')],
              ['on', t('Activas')],
              ['off', t('Apagadas')]
            ] as const
          ).map(([f, label]) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>
        {repos && repos.length > 0 && (
          <select aria-label={t('Repo del proyecto')} value={repoName} onChange={(e) => setRepo(e.target.value)}>
            {repos.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        )}
      </div>

      <div className="sksum">
        <div className="skct" role="group" aria-label={t('Activas')}>
          <b>{active.length}</b>
          <span>{t('Activas')}</span>
          <small>{t('~{n} tokens de contexto', { n: tokens })}</small>
        </div>
        <div className="skct" role="group" aria-label={t('Apagadas')}>
          <b>{items.filter(isOff).length}</b>
          <span>{t('Apagadas')}</span>
        </div>
        <div className="skct" role="group" aria-label={t('Choques')}>
          <b>{items.filter((i) => i.shadowedBy).length}</b>
          <span>{t('Choques')}</span>
        </div>
      </div>

      {data && narrowed && shown.length === 0 ? (
        <div className="empty" role="status">
          {q.trim() ? (
            <>
              {t('Nada se llama «{q}».', { q: q.trim() })}{' '}
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setQ('')
                  search.current?.focus()
                }}
              >
                {t('Borrar la búsqueda')}
              </button>
            </>
          ) : filter === 'on' ? (
            t('No tienes ninguna activa.')
          ) : (
            t('No tienes ninguna apagada.')
          )}
        </div>
      ) : (
        data && (
          <>
            <details className="skg" open aria-label={t('Personal')}>
              <summary>{t('Personal')}</summary>
              {cardsOf(of('personal'), 'p')}
            </details>
            {repos && repos.length > 0 && (
              <details className="skg" open aria-label={t('Proyecto ({repo})', { repo: repoName })}>
                <summary>{t('Proyecto ({repo})', { repo: repoName })}</summary>
                {projectTotal === 0 ? <p className="empty">{t('{repo} aún no tiene skills propias.', { repo: repoName })}</p> : cardsOf(of('project'), 'j')}
              </details>
            )}
            {repos === null && (
              <details className="skg" open aria-label={t('Proyecto')}>
                <summary>{t('Proyecto')}</summary>
                <p className="notice" role="note">
                  {t('No he podido leer tu lista de repos: no salen las skills del proyecto.')}
                </p>
              </details>
            )}
            {plugins.length > 0 && (
              <details className="skg" open aria-label={t('Plugins')}>
                <summary>{t('Plugins')}</summary>
                {plugins.map((p) => {
                  const all = items.filter((i) => i.plugin === p)
                  const vis = of('plugin').filter((i) => i.plugin === p)
                  if (narrowed && vis.length === 0) return null
                  const on = all[0]?.enabled !== false
                  return (
                    <div key={p} className="skp">
                      <p className="skp-bar">
                        <b>{p.split('@')[0]}</b> {t('{plugin} · {n} skills · {state}', { plugin: p, n: all.length, state: on ? t('activo') : t('apagado entero') })}
                      </p>
                      {cardsOf(vis, `g-${p}`)}
                    </div>
                  )
                })}
              </details>
            )}
            <details className="skg" open={narrowed} aria-label={t('Atril')}>
              <summary>
                {t('Atril')} <span className="where">{t('solo lectura')}</span>
              </summary>
              {cardsOf(of('atril'), 'a')}
            </details>
          </>
        )
      )}
      {open && <SkillDetail item={open} repo={repoName} onClose={close} />}
    </section>
  )
}
