import { useEffect, useRef, useState } from 'react'
import type { SkillItem, SkillsList, SkillState } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT } from '../ui'
import { fullName, originLabel, stateLabel } from './SkillCard'

const STATES: SkillState[] = ['on', 'name-only', 'user-invocable-only', 'off']

/** K24: unsaved text per file, kept for the run so leaving the screen does not lose it. */
const drafts = new Map<string, string>()
export const dropDraft = (path: string): void => void drafts.delete(path)

type Edit = { base: string; text: string; before: boolean }
type Ask = { kind: 'conflict'; disk: string } | { kind: 'broken'; force?: true }
type Opts = { force?: boolean; allowBroken?: boolean }
const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** K7: a side panel, not a modal; the instructions are plain text, never markup. K15: «Estado» for personal and project items. */
export function SkillDetail({
  item,
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
  const yes = (b: boolean): string => (b ? t('sí') : t('no'))
  const fields: [string, string | undefined][] = [
    [t('Cuándo usarla'), item.whenToUse],
    [t('Argumentos'), item.argumentHint],
    [t('Herramientas'), item.allowedTools?.join(', ')],
    [t('Modelo'), item.model],
    [t('Esfuerzo'), item.effort],
    [t('Claude la usa solo'), item.disableModelInvocation === undefined ? undefined : yes(!item.disableModelInvocation)],
    [t('Se llama con /'), item.userInvocable === undefined ? undefined : yes(item.userInvocable)]
  ]
  const name = fullName(item)
  return (
    <aside className="skd" aria-label={name}>
      <div className="skd-h">
        <h2>{name}</h2>
        <button ref={closeBtn} type="button" className="btn" onClick={onClose}>
          {t('Cerrar')}
        </button>
      </div>
      <p className="skd-chips">
        <span className="tag">{originLabel(t, item, repo)}</span>
        {item.kind === 'command' && <span className="tag">{t('comando')}</span>}
        <span className="tag">{stateLabel(t, item.state)}</span>
      </p>
      {item.description && <p className="skd-d">{item.description}</p>}
      {(item.origin === 'personal' || item.origin === 'project') && (
        <div className="skd-st">
          <div role="radiogroup" aria-label={t('Estado')} aria-busy={busy}>
            {STATES.map((s) => (
              <label key={s}>
                <input type="radio" name="sk-state" checked={item.state === s} disabled={busy || item.lockedBy !== undefined} onChange={() => onSet(s)} />
                {stateLabel(t, s)}
              </label>
            ))}
          </div>
          {item.lockedBy && <p className="where">{t('Lo fija {file}', { file: item.lockedBy })}</p>}
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
      {editable && !edit && (
        <p>
          <button type="button" className="btn" onClick={() => void startEdit()}>
            {t('Editar')}
          </button>
          {saved && <span role="status"> {t('Guardado.')}</span>}
        </p>
      )}
      {readFail !== null && (
        <Problem
          what={readFail.includes(t('Es demasiado grande para editarla aquí.')) ? t('Es demasiado grande para editarla aquí.') : t('No he podido abrir la skill para editarla.')}
          detail={readFail}
          onClose={() => setReadFail(null)}
        />
      )}
      {edit ? (
        <div className="skd-ed">
          {edit.before && <p className="notice" role="note">{t('Tienes cambios sin guardar de antes.')}</p>}
          <textarea
            className="skd-edit"
            aria-label={t('Texto de {name}', { name: item.name })}
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
              <p>{t('Este archivo ha cambiado fuera de Atril.')}</p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  dropDraft(item.path)
                  setEdit({ base: ask.disk, text: ask.disk, before: false })
                  setAsk(null)
                }}
              >
                {t('Cargar el de disco')}
              </button>
              <button type="button" className="btn" disabled={saving} onClick={() => void save({ force: true })}>
                {t('Guardar el mío encima')}
              </button>
            </div>
          )}
          {ask?.kind === 'broken' && (
            <div className="skd-ask" role="alert">
              <p>{t('La cabecera no se entiende: Claude Code puede ignorar esta skill.')}</p>
              <button type="button" className="btn" disabled={saving} onClick={() => void save({ ...(ask.force ? { force: true } : {}), allowBroken: true })}>
                {t('Guardar igual')}
              </button>
              <button type="button" className="btn" onClick={() => setAsk(null)}>
                {t('Seguir editando')}
              </button>
            </div>
          )}
          {fail !== null && <Problem what={t('No he podido guardar la skill.')} cant={t('El texto sigue aquí, sin guardar.')} detail={fail} />}
          <div className="skd-act">
            <button type="button" className="btn p" disabled={saving} onClick={() => void save()}>
              {t('Guardar')}
            </button>
            <button type="button" className="btn" onClick={() => guard(leaveEdit)}>
              {t('Descartar')}
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
