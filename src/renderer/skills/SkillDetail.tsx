import { useEffect, useRef } from 'react'
import type { SkillItem } from '../../preload/api'
import { useT } from '../ui'
import { fullName, originLabel, stateLabel } from './SkillCard'

/** K7: a side panel, not a modal; the instructions are plain text, never markup. */
export function SkillDetail({ item, repo, onClose }: { item: SkillItem; repo: string; onClose: () => void }) {
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
