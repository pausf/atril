import { useCallback, useEffect, useRef, useState } from 'react'
import type { SkillItem, SkillRef, SkillSet, SkillsList, SkillState } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT } from '../ui'
import { SkillCard } from './SkillCard'
import { SkillDetail } from './SkillDetail'
import { SkillWriteDialog } from './SkillWriteDialog'

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
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [fail, setFail] = useState<{ error: string; ref: SkillRef } | null>(null)
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState<{ req: SkillSet; ref: SkillRef; file: string; key: string; value: string } | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void window.atril.ui.get().then((u) => setConsent(u.skillsWriteOk === true), () => undefined)
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
    let live = true
    setError(null)
    window.atril.skills.list(repo).then(
      (d) => live && setData(d),
      (e: unknown) => {
        if (!live) return
        setData(null)
        setError(e instanceof Error ? e.message : String(e))
      }
    )
    // A reply for the repo picked before this one must not land under the new one (K11).
    return () => {
      live = false
    }
  }, [repos, repo])
  useEffect(load, [load])

  /** K15/K17: one write through main; the lists and the open panel come from its answer, never from a guess. */
  const change = async (req: SkillSet, ref: SkillRef): Promise<void> => {
    setBusy(true)
    setFail(null)
    setNote(null)
    try {
      const d = await window.atril.skills.set(req)
      setData(d)
      const same = (a: SkillItem, b: SkillItem): boolean => a.origin === b.origin && a.kind === b.kind && a.name === b.name && a.plugin === b.plugin
      const now = open && d.items.find((i) => same(i, open))
      if (now) setOpen(now)
      const sharing = now ? d.items.filter((i) => i.name === now.name && !same(i, now) && i.writesTo === now.writesTo && (i.origin === 'personal' || i.origin === 'project')).length : 0
      const done = t('Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.')
      setNote(sharing > 0 ? `${done} ${t('También cambia {n} más con el mismo nombre.', { n: sharing })}` : done)
    } catch (e) {
      setFail({ error: e instanceof Error ? e.message : String(e), ref })
    } finally {
      setBusy(false)
    }
  }
  const repoId = repo || undefined
  // K16: the first write of all asks; `consent` comes from Atril's state.
  const ask = (req: SkillSet, ref: SkillRef, file: string | undefined, key: string, value: string): void => {
    if (consent) void change(req, ref)
    else setPending({ req, ref, file: file ?? '', key, value })
  }
  const setState = (i: SkillItem, state: SkillState): void =>
    ask({ origin: i.origin, name: i.name, repoId, state }, { origin: i.origin, name: i.name, kind: i.kind, repoId }, i.writesTo, `skillOverrides.${i.name}`, state)
  const setPlugin = (plugin: string, enabled: boolean, file?: string): void =>
    ask({ plugin, enabled, repoId }, { origin: 'plugin', name: '', plugin, repoId }, file, `enabledPlugins.${plugin}`, String(enabled))

  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=skills-estado opens the first personal skill's detail for a photo.
  useEffect(() => {
    if (!data) return
    void window.atril.snapshotView().then((v) => {
      if (v === 'skills-estado') setOpen((prev) => prev ?? data.items.find((i) => i.origin === 'personal' && !i.lockedBy) ?? null)
    })
  }, [data])

  const close = (): void => {
    setNote(null)
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

      {fail && (
        <Problem
          what={t('No he podido cambiar tus ajustes de Claude Code.')}
          cant={t('El cambio no se ha guardado: sigue como estaba.')}
          fix={t('Ver en Finder')}
          onFix={() => void window.atril.skills.reveal(fail.ref)}
          onClose={() => setFail(null)}
          detail={fail.error}
        />
      )}

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
          <select aria-label={t('Repo del proyecto')} value={repoName} disabled={busy} onChange={(e) => setRepo(e.target.value)}>
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
                  const lock = all[0]?.lockedBy
                  return (
                    <div key={p} className="skp">
                      <p className="skp-bar">
                        <b>{p.split('@')[0]}</b> {t('{plugin} · {n} skills · {state}', { plugin: p, n: all.length, state: on ? t('activo') : t('apagado entero') })}
                        <button type="button" role="switch" className="sw" aria-checked={on} aria-label={t('Activo')} aria-busy={busy} disabled={busy || lock !== undefined} onClick={() => setPlugin(p, !on, all[0]?.writesTo)} />
                        {lock && <span className="where">{t('Lo fija {file}', { file: lock })}</span>}
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
      {open && <SkillDetail item={open} repo={repoName} busy={busy} note={note} onSet={(st) => setState(open, st)} onClose={pending ? () => undefined : close} />}
      {pending && (
        <SkillWriteDialog
          file={pending.file}
          keyName={pending.key}
          value={pending.value}
          onNo={() => setPending(null)}
          onYes={(never) => {
            const p = pending
            setPending(null)
            if (never) {
              setConsent(true)
              void window.atril.ui.set({ skillsWriteOk: true })
            }
            void change(p.req, p.ref)
          }}
        />
      )}
    </section>
  )
}
