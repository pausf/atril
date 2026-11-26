import { useEffect, useRef, useState } from 'react'
import type { SkillItem, SkillsList, SkillState, SkillUse } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useLocale, useT } from '../ui'
import { fullName, originLabel, stateLabel } from './SkillRow'

const STATES: SkillState[] = ['on', 'name-only', 'user-invocable-only', 'off']

/** K24: unsaved text per file, kept for the run so leaving the screen does not lose it. */
const drafts = new Map<string, string>()
export const dropDraft = (path: string): void => void drafts.delete(path)

type Edit = { base: string; text: string; before: boolean }
type Ask = { kind: 'conflict'; disk: string } | { kind: 'broken'; force?: true }
type Opts = { force?: boolean; allowBroken?: boolean }
const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const BAR_PX = 32

/** K38: the last 14 days, oldest left, each bar against the busiest of them; 2 px when 0. */
function UseBars({ use }: { use: SkillUse | null }) {
  const t = useT()
  const locale = useLocale()
  const days = use?.days ?? Array<number>(30).fill(0)
  const recent = days.slice(0, 14).reverse()
  const max = Math.max(...recent)
  const now = new Date()
  const total = days.reduce((a, n) => a + n, 0)
  return (
    <div className="skd-use">
      <p className="skd-use-h">{t('Use · last 14 days')}</p>
      <div className="skd-bars" role="group" aria-label={t('Use · last 14 days')}>
        {recent.map((n, i) => {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i)).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
          return <span key={i} role="img" aria-label={`${day}: ${n}`} title={`${day}: ${n}`} style={{ height: `${n === 0 ? 2 : Math.max(2, Math.round((n / max) * BAR_PX))}px` }} />
        })}
      </div>
      <p>{total === 1 ? t('Once in 30 days') : total > 0 ? t('{n} times in 30 days', { n: total }) : t('Unused in 30 days.')}</p>
      <p className="where">{t('From the Claude Code sessions on this Mac.')}</p>
    </div>
  )
}

/** K7: a side panel, not a modal; the instructions are plain text, never markup. K15: «Estado» for personal and project items. */
export function SkillDetail({
  item,
  use,
  repo,
  busy,
  note,
  onSet,
  onClose,
  guard,
  onDirty,
  onSaving,
  onSaved,
  autoEdit
}: {
  item: SkillItem
  /** K38: undefined while the usage has not answered or failed. */
  use?: SkillUse | null
  repo: string
  busy: boolean
  note: string | null
  onSet: (s: SkillState) => void
  onClose: () => void
  /** K24: runs `next` now, or after the person agrees to drop unsaved text. */
  guard: (next: () => void) => void
  onDirty: (dirty: boolean) => void
  onSaving: (saving: boolean) => void
  onSaved: (list: SkillsList, repoId: string | undefined) => void
  /** K25: a skill just created opens straight in «Editar». */
  autoEdit?: boolean
}) {
  const t = useT()
  const repoId = repo || undefined
  const [edit, setEdit] = useState<Edit | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [fail, setFail] = useState<string | null>(null)
  const [readFail, setReadFail] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  // K11/K18: a reply that lands after the panel went away (another card, another repo) is dropped.
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  const dirty = edit !== null && edit.text !== edit.base
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])
  const editable = item.origin === 'personal' || item.origin === 'project'

  const change = (text: string): void => {
    if (!edit) return
    if (text === edit.base) dropDraft(item.path)
    else drafts.set(item.path, text)
    setEdit({ ...edit, text })
  }
  const startEdit = async (): Promise<void> => {
    setReadFail(null)
    setSaved(false)
    try {
      const base = await window.atril.skills.read({ path: item.path, repoId })
      if (!live.current) return
      const draft = drafts.get(item.path)
      setEdit({ base, text: draft ?? base, before: draft !== undefined && draft !== base })
    } catch (e) {
      if (live.current) setReadFail(msg(e))
    }
  }
  useEffect(() => {
    if (autoEdit) void startEdit()
  }, [])
  const leaveEdit = (): void => {
    dropDraft(item.path)
    setEdit(null)
    setAsk(null)
    setFail(null)
  }
  const save = async (opts: Opts = {}): Promise<void> => {
    if (!edit || saving) return
    setSaving(true)
    onSaving(true)
    setFail(null)
    try {
      const r = await window.atril.skills.save({ path: item.path, repoId, base: edit.base, text: edit.text, ...opts })
      if (!live.current) return
      if ('conflict' in r) setAsk({ kind: 'conflict', disk: r.disk })
      else if ('brokenHeader' in r) setAsk({ kind: 'broken', ...(opts.force ? { force: true as const } : {}) })
      else {
        dropDraft(item.path)
        setEdit(null)
        setAsk(null)
        setSaved(true)
        onSaved(r.list, repoId)
      }
    } catch (e) {
      if (live.current) setFail(msg(e))
    } finally {
      onSaving(false)
      if (live.current) setSaving(false)
    }
  }
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => closeBtn.current?.focus(), [item])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  const yes = (b: boolean): string => (b ? t('yes') : t('no'))
  const fields: [string, string | undefined][] = [
    [t('When to use it'), item.whenToUse],
    [t('Arguments'), item.argumentHint],
    [t('Tools'), item.allowedTools?.join(', ')],
    [t('Model'), item.model],
    [t('Effort'), item.effort],
    [t('Claude uses it on its own'), item.disableModelInvocation === undefined ? undefined : yes(!item.disableModelInvocation)],
    [t('Called with /'), item.userInvocable === undefined ? undefined : yes(item.userInvocable)]
  ]
  const name = fullName(item)
  return (
    <aside className="skd" aria-label={name}>
      <div className="skd-h">
        <h2>{name}</h2>
        <button ref={closeBtn} type="button" className="btn" onClick={onClose}>
          {t('Close')}
        </button>
      </div>
      <p className="skd-chips">
        <span className="tag">{originLabel(t, item, repo)}</span>
        {item.kind === 'command' && <span className="tag">{t('command')}</span>}
        <span className="tag">{stateLabel(t, item.state)}</span>
      </p>
      {item.description && <p className="skd-d">{item.description}</p>}
      {(item.origin === 'personal' || item.origin === 'project') && (
        <div className="skd-st">
          <div role="radiogroup" aria-label={t('State')} aria-busy={busy}>
            {STATES.map((s) => (
              <label key={s}>
                <input type="radio" name="sk-state" checked={item.state === s} disabled={busy || item.lockedBy !== undefined} onChange={() => onSet(s)} />
                {stateLabel(t, s)}
              </label>
            ))}
          </div>
          {item.lockedBy && <p className="where">{t('Fixed by {file}', { file: item.lockedBy })}</p>}
          {note && <p role="status">{note}</p>}
        </div>
      )}
      <dl>
        {fields
          .filter((f): f is [string, string] => Boolean(f[1]))
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {use !== undefined && <UseBars use={use} />}
      {editable && !edit && (
        <p>
          <button type="button" className="btn" onClick={() => void startEdit()}>
            {t('Edit@@action')}
          </button>
          {saved && <span role="status"> {t('Saved.')}</span>}
        </p>
      )}
      {readFail !== null && (
        <Problem
          what={readFail.includes(t('It is too big to edit here.')) ? t('It is too big to edit here.') : t('I could not open the skill to edit it.')}
          detail={readFail}
          onClose={() => setReadFail(null)}
        />
      )}
      {edit ? (
        <div className="skd-ed">
          {edit.before && <p className="notice" role="note">{t('You have unsaved changes from before.')}</p>}
          <textarea
            className="skd-edit"
            aria-label={t('Text of {name}', { name: item.name })}
            value={edit.text}
            spellCheck={false}
            disabled={saving}
            onChange={(e) => change(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                void save()
              }
            }}
          />
          {ask?.kind === 'conflict' && (
            <div className="skd-ask" role="alert">
              <p>{t('This file changed outside Atril.')}</p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  dropDraft(item.path)
                  setEdit({ base: ask.disk, text: ask.disk, before: false })
                  setAsk(null)
                }}
              >
                {t('Load the one on disk')}
              </button>
              <button type="button" className="btn" disabled={saving} onClick={() => void save({ force: true })}>
                {t('Save mine over it')}
              </button>
            </div>
          )}
          {ask?.kind === 'broken' && (
            <div className="skd-ask" role="alert">
              <p>{t('The header is not understood: Claude Code may ignore this skill.')}</p>
              <button type="button" className="btn" disabled={saving} onClick={() => void save({ ...(ask.force ? { force: true } : {}), allowBroken: true })}>
                {t('Save anyway')}
              </button>
              <button type="button" className="btn" onClick={() => setAsk(null)}>
                {t('Keep editing')}
              </button>
            </div>
          )}
          {fail !== null && <Problem what={t('I could not save the skill.')} cant={t('The text is still here, unsaved.')} detail={fail} />}
          <div className="skd-act">
            <button type="button" className="btn p" disabled={saving} onClick={() => void save()}>
              {t('Save')}
            </button>
            <button type="button" className="btn" onClick={() => guard(leaveEdit)}>
              {t('Discard')}
            </button>
          </div>
        </div>
      ) : (
        item.body && <pre className="skd-body">{item.body}</pre>
      )}
      <p className="skd-path">
        <code>{item.path}</code>
      </p>
    </aside>
  )
}
