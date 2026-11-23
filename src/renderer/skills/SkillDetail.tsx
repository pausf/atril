import { useEffect, useRef } from 'react'
import type { SkillItem, SkillState } from '../../preload/api'
import { useT } from '../ui'
import { fullName, originLabel, stateLabel } from './SkillCard'

const STATES: SkillState[] = ['on', 'name-only', 'user-invocable-only', 'off']

/** K7: a side panel, not a modal; the instructions are plain text, never markup. K15: «Estado» for personal and project items. */
export function SkillDetail({ item, repo, busy, note, onSet, onClose }: { item: SkillItem; repo: string; busy: boolean; note: string | null; onSet: (s: SkillState) => void; onClose: () => void }) {
  const t = useT()
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
      {item.body && <pre className="skd-body">{item.body}</pre>}
      <p className="skd-path">
        <code>{item.path}</code>
      </p>
    </aside>
  )
}
