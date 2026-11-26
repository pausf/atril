import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { PluginCatalog, PluginCatalogResult, PluginFailure, PluginRequest, SkillItem, SkillRef, SkillSet, SkillsList, SkillState, SkillUse } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT } from '../ui'
import { PluginAddDialog } from './PluginAddDialog'
import { PluginProblem } from './PluginProblem'
import { PluginRemoveDialog } from './PluginRemoveDialog'
import { fullName, SkillRow } from './SkillRow'
import { dropDraft, SkillDetail } from './SkillDetail'
import { SkillLeaveDialog } from './SkillLeaveDialog'
import { SkillNewDialog } from './SkillNewDialog'
import { SkillWriteDialog } from './SkillWriteDialog'

type Filter = 'all' | 'on' | 'off' | 'idle' | 'clash'

/** K5: what counts as loaded and what as off; `user-invocable-only` is neither. */
export const isActive = (i: SkillItem): boolean => (i.state === 'on' || i.state === 'name-only') && !i.shadowedBy && i.enabled !== false
export const isOff = (i: SkillItem): boolean => i.state === 'off' || i.enabled === false

const byName = (a: SkillItem, b: SkillItem): number => fullName(a).localeCompare(fullName(b), undefined, { sensitivity: 'base' })

/** K40: a group's header folds it; while the list is narrowed it is forced open and the header is disabled. */
function SkillGroup({ label, title, count, open, narrowed, onFold, controls, children }: { label: string; title?: string; count: number; open: boolean; narrowed: boolean; onFold: () => void; controls?: ReactNode; children: ReactNode }) {
  return (
    <section className="skg" role="group" aria-label={label}>
      <div className="skgh">
        <button type="button" className="skg-fold" aria-expanded={open} disabled={narrowed} onClick={onFold}>
          {title ?? label}
          <span className="n">{count}</span>
        </button>
        {controls}
      </div>
      {open && children}
    </section>
  )
}

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
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  // K40: per visit; plugins and Atril start folded. Not reset on a repo pick.
  const [folded, setFolded] = useState<Record<string, boolean>>({})
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<SkillItem | null>(null)
  // K37: null until it answers, and when it fails: then nothing is said about use.
  const [usage, setUsage] = useState<Record<string, SkillUse> | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [fail, setFail] = useState<{ error: string; ref: SkillRef } | null>(null)
  const [pluginBusy, setPluginBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pluginNote, setPluginNote] = useState<string | null>(null)
  const [pluginFail, setPluginFail] = useState<(PluginFailure & { req?: PluginRequest }) | null>(null)
  const [paths, setPaths] = useState<Record<string, string>>({})
  // K33: what the CLI says is installed; null until it answers.
  const [installed, setInstalled] = useState<PluginCatalog['installed'] | null>(null)
  const [removing, setRemoving] = useState<{ plugin: string; scope: 'user' | 'local' } | null>(null)
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  // K24: set by the detail while its editor holds unsaved text; `leave` is the exit waiting for an answer.
  const dirty = useRef(false)
  const [creating, setCreating] = useState<'personal' | 'project' | null>(null)
  const [autoEdit, setAutoEdit] = useState(false)
  const [leave, setLeave] = useState<(() => void) | null>(null)
  const repoNow = useRef<string | undefined>(undefined)
  repoNow.current = repo
  const [pending, setPending] = useState<{ req: SkillSet; ref: SkillRef; file: string; key: string; value: string } | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void window.atril.ui.get().then((u) => setConsent(u.skillsWriteOk === true), () => undefined)
    void window.atril.repos.list().then(
      (l) => {
        const ids = Array.isArray(l) ? l.map((r) => r.id) : null
        setRepos(ids)
        if (Array.isArray(l)) setPaths(Object.fromEntries(l.map((r) => [r.id, r.path])))
        setRepo(ids?.[0])
      },
      () => setRepos(null)
    )
  }, [])

  // K37: once per visit; the use does not depend on the repo, and the list never waits for it.
  useEffect(() => {
    let live = true
    void window.atril.skills.usage().then(
      (r) => live && 'usage' in r && setUsage(r.usage),
      () => undefined
    )
    return () => {
      live = false
    }
  }, [])

  // K43: «/» goes to search unless a field, a select or a dialog has the keys.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') || document.querySelector('[role="dialog"][aria-modal="true"]')) return
      e.preventDefault()
      search.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadCatalog = useCallback(() => {
    if (repos === undefined) return
    const forRepo = repo
    void window.atril.skills.catalog(repo).then(
      (r) => forRepo === repoNow.current && 'catalog' in r && setInstalled(r.catalog.installed),
      () => undefined
    )
  }, [repos, repo])
  useEffect(() => {
    setInstalled(null)
    loadCatalog()
  }, [loadCatalog])

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
      const done = t('Done. New Claude Code sessions already load it this way.')
      setNote(sharing > 0 ? `${done} ${t('{n} more with the same name also change.', { n: sharing })}` : done)
    } catch (e) {
      setFail({ error: e instanceof Error ? e.message : String(e), ref })
    } finally {
      setBusy(false)
    }
  }
  const repoId = repo || undefined

  /** K32: one plugin operation at a time; a reply for a repo no longer picked is dropped (K11/K18). */
  const pluginOp = async <T extends { list: SkillsList } | PluginCatalogResult>(work: () => Promise<T | PluginFailure>, req?: PluginRequest): Promise<T | undefined> => {
    const forRepo = repoNow.current
    setPluginBusy(true)
    setPluginFail(null)
    setPluginNote(null)
    try {
      const r = await work()
      if (forRepo !== repoNow.current) return undefined
      if ('error' in r) {
        setPluginFail({ ...r, req })
        setAdding(false)
        return undefined
      }
      return r
    } finally {
      setPluginBusy(false)
    }
  }
  const runPlugin = async (action: PluginRequest['action'], plugin: string, scope: 'user' | 'local'): Promise<void> => {
    const req = { action, plugin, scope, repoId }
    const r = await pluginOp(() => window.atril.skills.plugin(req), req)
    if (!r) return
    setData(r.list)
    setAdding(false)
    setPluginNote(action === 'install' ? t('Installed. New Claude Code sessions already load it.') : t('Done.'))
    loadCatalog()
  }
  const inTerminal = async (req: PluginRequest): Promise<void> => {
    const r = await window.atril.skills.pluginTerminal(req)
    if ('error' in r) setPluginFail({ error: r.error, code: 'failed' })
  }
  /** K33: the install a bar can act on: the user one, or the local one of the picked repo. */
  const scopeOf = (plugin: string): 'user' | 'local' | null => {
    const mine = (installed ?? []).filter((i) => i.pluginId === plugin)
    if (mine.some((i) => i.scope === 'user')) return 'user'
    const here = repo ? paths[repo] : undefined
    return here && mine.some((i) => i.scope === 'local' && i.projectPath === here) ? 'local' : null
  }
  // K16: the first write of all asks; `consent` comes from Atril's state.
  const ask = (req: SkillSet, ref: SkillRef, file: string | undefined, key: string, value: string): void => {
    if (consent) void change(req, ref)
    else setPending({ req, ref, file: file ?? '', key, value })
  }
  const setState = (i: SkillItem, state: SkillState): void =>
    ask({ origin: i.origin, name: i.name, repoId, state }, { origin: i.origin, name: i.name, kind: i.kind, repoId }, i.writesTo, `skillOverrides.${i.name}`, state)
  const setPlugin = (plugin: string, enabled: boolean, file?: string): void =>
    ask({ plugin, enabled, repoId }, { origin: 'plugin', name: '', plugin, repoId }, file, `enabledPlugins.${plugin}`, String(enabled))

  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=skills-estado opens the first personal skill's detail, skills-editor the same in «Editar», skills-plugins opens «Añadir plugin», skills-uso the most used personal skill, for a photo.
  useEffect(() => {
    if (!data) return
    void window.atril.snapshotView().then((v) => {
      if (v === 'skills-estado') setOpen((prev) => prev ?? data.items.find((i) => i.origin === 'personal' && !i.lockedBy) ?? null)
      if (v === 'skills-uso' && usage) {
        const uses = (i: SkillItem): number => usage[i.name]?.days.reduce((a, n) => a + n, 0) ?? 0
        setOpen((prev) => prev ?? data.items.filter((i) => i.origin === 'personal').sort((a, b) => uses(b) - uses(a))[0] ?? null)
      }
      if (v === 'skills-plugins') setAdding(true)
      if (v === 'skills-editor') {
        setAutoEdit(true)
        setOpen((prev) => prev ?? data.items.find((i) => i.origin === 'personal') ?? null)
      }
    })
  }, [data, usage])

  const guard = useCallback((next: () => void): void => {
    if (dirty.current) setLeave(() => next)
    else next()
  }, [])
  const onDirty = useCallback((d: boolean): void => {
    dirty.current = d
  }, [])
  /** K22: the save's answer, unless the repo moved on meanwhile (K11/K18). */
  const onSaved = (d: SkillsList, forRepo: string | undefined): void => {
    if (forRepo !== repoNow.current) return
    setData(d)
    setOpen((prev) => (prev && d.items.find((i) => (i.origin === 'personal' || i.origin === 'project') && i.path === prev.path)) || prev)
  }
  const close = (): void => {
    setNote(null)
    setOpen(null)
    opener.current?.focus()
  }

  const items = data?.items ?? []
  const useOf = (i: SkillItem): SkillUse | null | undefined => (usage ? (usage[fullName(i).slice(1)] ?? null) : undefined)
  // K37: what Claude could use and nobody used; «Solo si la llamas tú» counts.
  const isIdle = (i: SkillItem): boolean => i.origin !== 'atril' && !isOff(i) && !i.shadowedBy && useOf(i) === null
  const pass: Record<Filter, (i: SkillItem) => boolean> = { all: () => true, on: isActive, off: isOff, idle: isIdle, clash: (i) => i.shadowedBy !== undefined }
  // K41: newest use first, then unused (shadowed counts as unused) by name; by name until the usage answers.
  const lastOf = (i: SkillItem): string => (i.shadowedBy ? '' : (useOf(i)?.last ?? ''))
  const order = (a: SkillItem, b: SkillItem): number => (sort === 'recent' && usage ? lastOf(b).localeCompare(lastOf(a)) : 0) || byName(a, b)
  const shown = items.filter((i) => matches(i, q) && pass[filter](i)).sort(order)
  const idle = items.filter(isIdle).length
  const active = items.filter(isActive)
  const tokens = Math.round(active.reduce((n, i) => n + i.name.length + (i.description ?? '').length + (i.whenToUse ?? '').length, 0) / 3.2)
  const repoName = repo ?? ''
  const narrowed = q.trim() !== '' || filter !== 'all'

  const rowsOf = (rows: SkillItem[], group: string) => (
    <ul className="skrows">
      {rows.map((i, n) => {
        const key = `${group}-${n}-${i.kind}-${i.name}`
        return (
          <SkillRow
            key={key}
            id={`sk-${key}`}
            item={i}
            use={useOf(i)}
            onOpen={(el) => {
              opener.current = el
              if (i !== open) {
                guard(() => {
                  setAutoEdit(false)
                  setOpen(i)
                })
              }
            }}
          />
        )
      })}
    </ul>
  )
  /** K40: forced open while narrowed (when it has rows), else its own fold; plugins and Atril start folded. */
  const fold = (key: string, rows: SkillItem[], extra: { label: string; title?: string; controls?: ReactNode; footer?: ReactNode; empty?: ReactNode }) => {
    if (narrowed && rows.length === 0) return null
    const isOpen = narrowed || !(folded[key] ?? (key.startsWith('plugin:') || key === 'atril'))
    return (
      <SkillGroup key={key} label={extra.label} title={extra.title} count={rows.length} open={isOpen} narrowed={narrowed} controls={extra.controls} onFold={() => setFolded((f) => ({ ...f, [key]: isOpen }))}>
        {rows.length === 0 && !narrowed ? extra.empty : rowsOf(rows, key)}
        {!narrowed && extra.footer}
      </SkillGroup>
    )
  }
  /** K43: ↑/↓ walk the visible rows in order; from the search box ↓ enters the list. */
  const onArrows = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>('button.skr') ?? [])]
    const at = rows.indexOf(e.target as HTMLButtonElement)
    if (e.target === search.current) {
      if (e.key !== 'ArrowDown' || rows.length === 0) return
      e.preventDefault()
      rows[0]!.focus()
      return
    }
    if (at < 0) return
    e.preventDefault()
    rows[Math.max(0, Math.min(rows.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))]!.focus()
  }
  const newButton = (origin: 'personal' | 'project') => (
    <button type="button" className="btn" onClick={() => guard(() => { setOpen(null); setCreating(origin) })}>
      {t('New skill')}
    </button>
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
      <p className="lead">{t('The skills and / commands your Claude Code has at hand in every workspace. Read from their folders, without spending quota.')}</p>
      {data?.warnings.map((w) => (
        <p key={w} className="notice" role="note">
          {w}
        </p>
      ))}
      {repos?.length === 0 && <p className="notice">{t('Add a repo in Settings → Repos to see its skills.')}</p>}
      {error !== null && <Problem what={t('I could not read your skills.')} cant={t('I cannot show you what your Claude Code has at hand.')} fix={t('Try again')} onFix={load} detail={error} />}

      {fail && (
        <Problem
          what={t('I could not change your Claude Code settings.')}
          cant={t('The change was not saved: it stays as it was.')}
          fix={t('Show in Finder@@view')}
          onFix={() => void window.atril.skills.reveal(fail.ref)}
          onClose={() => setFail(null)}
          detail={fail.error}
        />
      )}

      <div className="sk-bar">
        <input ref={search} type="search" placeholder={t('Search by name or description…')} aria-label={t('Search by name or description…')} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onArrows} />
        <div className="seg" role="group" aria-label={t('Filter')}>
          {(
            [
              ['all', t('All@@fem')],
              ['on', t('On@@femPl')],
              ['off', t('Off@@pl')]
            ] as const
          ).map(([f, label]) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label={t('Order')}>
          {(
            [
              ['recent', t('Recent')],
              ['name', t('Name')]
            ] as const
          ).map(([o, label]) => (
            <button key={o} type="button" aria-pressed={sort === o} onClick={() => setSort(o)}>
              {label}
            </button>
          ))}
        </div>
        {repos && repos.length > 0 && (
          <select aria-label={t('Project repo')} value={repoName} disabled={busy || saving || pluginBusy} onChange={(e) => {
              const v = e.target.value
              guard(() => {
                setOpen(null)
                setRepo(v)
              })
            }}>
            {repos.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        )}
      </div>

      <div className="sksum" role="group" aria-label={t('Summary')}>
        {(
          [
            ['on', t('On@@femPl'), active.length, <small key="s">{t('~{n} context tokens', { n: tokens })}</small>],
            ['off', t('Off@@pl'), items.filter(isOff).length, null],
            ['clash', t('Clashes'), items.filter((i) => i.shadowedBy).length, null],
            ...(usage ? ([['idle', t('Unused in 30 days'), idle, <small key="s">{idle === 0 ? t('all in use') : t('candidates to turn off')}</small>]] as const) : [])
          ] as const
        ).map(([f, label, n, small]) => (
          <button key={f} type="button" className="skct" aria-label={label} aria-pressed={filter === f} onClick={() => setFilter((now) => (now === f ? 'all' : f))}>
            <b>{n}</b>
            <span>{label}</span>
            {small}
          </button>
        ))}
      </div>

      {data && narrowed && shown.length === 0 && (
        <div className="empty" role="status">
          {q.trim() ? (
            <>
              {t('Nothing is called “{q}”.', { q: q.trim() })}{' '}
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setQ('')
                  search.current?.focus()
                }}
              >
                {t('Clear the search')}
              </button>
            </>
          ) : filter === 'on' ? (
            t('You have none on.')
          ) : filter === 'idle' ? (
            t('You have none unused.')
          ) : filter === 'clash' ? (
            t('You have no clashes.')
          ) : (
            t('You have none off.')
          )}
        </div>
      )}
      {data && (
          <div ref={list} onKeyDown={onArrows}>
            {fold('personal', of('personal'), { label: t('Personal'), footer: newButton('personal') })}
            {repos &&
              repos.length > 0 &&
              fold('project', of('project'), {
                label: t('Project ({repo})', { repo: repoName }),
                empty: projectTotal === 0 ? <p className="empty">{t('{repo} has no skills of its own yet.', { repo: repoName })}</p> : null,
                footer: newButton('project')
              })}
            {repos === null && (
              <section className="skg" role="group" aria-label={t('Project')}>
                <p className="notice" role="note">
                  {t('I could not read your repo list: the project skills are not shown.')}
                </p>
              </section>
            )}
            <div className="skpl" role="group" aria-label={t('Plugins')}>
              <b>{t('Plugins')}</b>
              <button type="button" className="btn" disabled={pluginBusy} onClick={() => setAdding(true)}>
                {t('Add plugin')}
              </button>
              {pluginNote && (
                <p className="notice" role="status">
                  {pluginNote}
                </p>
              )}
              {pluginFail && (
                <PluginProblem
                  what={t('I could not complete the plugin operation.')}
                  failure={pluginFail}
                  fix={pluginFail.req ? t('Do it in Terminal') : undefined}
                  onFix={() => pluginFail.req && void inTerminal(pluginFail.req)}
                  onClose={() => setPluginFail(null)}
                />
              )}
            </div>
            {plugins.map((p) => {
              const all = items.filter((i) => i.plugin === p)
              const on = all[0]?.enabled !== false
              const lock = all[0]?.lockedBy
              const scope = scopeOf(p)
              return fold(`plugin:${p}`, of('plugin').filter((i) => i.plugin === p), {
                label: p,
                title: p.split('@')[0],
                controls: (
                  <span className="skp-bar">
                    {t('{plugin} · {n} skills · {state}', { plugin: p, n: all.length, state: on ? t('on') : t('off entirely') })}
                    <button type="button" role="switch" className="sw" aria-checked={on} aria-label={t('On')} aria-busy={busy} disabled={busy || pluginBusy || lock !== undefined} onClick={() => setPlugin(p, !on, all[0]?.writesTo)} />
                    {lock && <span className="where">{t('Fixed by {file}', { file: lock })}</span>}
                    {installed !== null &&
                      (scope ? (
                        <>
                          <button type="button" className="btn" disabled={pluginBusy} onClick={() => void runPlugin('update', p, scope)}>
                            {t('Refresh')}
                          </button>
                          <button type="button" className="btn" disabled={pluginBusy} onClick={() => setRemoving({ plugin: p, scope })}>
                            {t('Remove')}
                          </button>
                        </>
                      ) : (
                        <span className="where">{t('Installed in another scope: managed outside Atril.')}</span>
                      ))}
                  </span>
                )
              })
            })}
            {fold('atril', of('atril'), { label: t('Atril'), controls: <span className="where">{t('read-only')}</span> })}
          </div>
      )}
      {open && (
        <SkillDetail
          key={open.path}
          autoEdit={autoEdit}
          item={open}
          use={useOf(open)}
          repo={repoName}
          busy={busy}
          note={note}
          onSet={(st) => setState(open, st)}
          onClose={pending || leave ? () => undefined : () => guard(close)}
          guard={guard}
          onDirty={onDirty}
          onSaving={setSaving}
          onSaved={onSaved}
        />
      )}
      {creating && (
        <SkillNewDialog
          origin={creating}
          onNo={() => setCreating(null)}
          create={async (name) => {
            const d = await window.atril.skills.create({ origin: creating, repoId, name })
            if (repoId !== repoNow.current) return
            const made = d.items.find((i) => i.origin === creating && i.name === name && i.kind === 'skill')
            setData(d)
            setCreating(null)
            setNote(null)
            setAutoEdit(true)
            if (made) setOpen(made)
          }}
        />
      )}
      {adding && (
        <PluginAddDialog
          repo={repoId}
          busy={pluginBusy}
          install={(p, scope) => void runPlugin('install', p, scope)}
          addMarketplace={(source) => pluginOp(() => window.atril.skills.marketplace({ source, repoId }))}
          onNo={() => setAdding(false)}
        />
      )}
      {removing && (
        <PluginRemoveDialog
          plugin={removing.plugin}
          onNo={() => setRemoving(null)}
          onYes={() => {
            const r = removing
            setRemoving(null)
            void runPlugin('uninstall', r.plugin, r.scope)
          }}
        />
      )}
      {leave && (
        <SkillLeaveDialog
          onNo={() => setLeave(null)}
          onYes={() => {
            const next = leave
            setLeave(null)
            if (open) dropDraft(open.path)
            dirty.current = false
            next()
          }}
        />
      )}
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
