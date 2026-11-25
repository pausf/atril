import type { SkillItem, SkillState, SkillUse } from '../../preload/api'
import { useT, type T } from '../ui'

/** `/name`, or `/plugin:name` for plugin and Atril items (K5). */
export const fullName = (i: SkillItem): string => (i.plugin ? `/${i.plugin.split('@')[0]}:${i.name}` : `/${i.name}`)

export const stateLabel = (t: T, s: SkillState): string =>
  s === 'on' ? t('Activa') : s === 'name-only' ? t('Solo el nombre') : s === 'user-invocable-only' ? t('Solo si la llamas tú') : t('Apagada')

export const originLabel = (t: T, i: SkillItem, repo: string): string =>
  i.origin === 'personal' ? t('Personal') : i.origin === 'project' ? repo : i.origin === 'atril' ? t('Atril') : (i.plugin ?? '').split('@')[0]!

/** K37: undefined while the usage has not answered (say nothing), null when the name was not used. */
export const lastUsed = (t: T, use: SkillUse | null): string => {
  const k = use ? use.days.findIndex((n) => n > 0) : -1
  return k < 0 ? t('sin usar en 30 días') : k === 0 ? t('usada hoy') : k === 1 ? t('usada hace 1 día') : t('usada hace {n} días', { n: k })
}

/** One skill or command; activating it opens its detail (K7). */
export function SkillCard({
  item,
  repo,
  id,
  use,
  onOpen
}: {
  item: SkillItem
  repo: string
  id: string
  use?: SkillUse | null
  onOpen: (el: HTMLButtonElement) => void
}) {
  const t = useT()
  const name = fullName(item)
  const off = item.state === 'off' || item.enabled === false || item.shadowedBy !== undefined
  return (
    <li className={`skc${off ? ' off' : ''}`}>
      <button type="button" className="skc-open" aria-label={name} aria-describedby={id} onClick={(e) => onOpen(e.currentTarget)}>
        <span className="skc-h">
          <b>{name}</b>
          <span id={id} className="skc-chips">
            <span className="tag">{originLabel(t, item, repo)}</span>
            {item.kind === 'command' && <span className="tag">{t('comando')}</span>}
            <span className={`tag st-${item.state}`}>{stateLabel(t, item.state)}</span>
          </span>
        </span>
        <span className="skc-d" title={item.description}>
          {item.description ?? ''}
        </span>
        <span className="skc-m">
          {item.shadowedBy && <span className="skmark lose">{item.shadowedBy === 'personal' ? t('No se carga: gana la personal') : t('No se carga: gana la skill')}</span>}
          {item.disableModelInvocation && <span className="skmark">{t('Claude no la usa sola')}</span>}
          {item.broken && <span className="skmark lose">{t('Cabecera ilegible')}</span>}
          {use !== undefined && !item.shadowedBy && <span className="skmark">{lastUsed(t, use)}</span>}
        </span>
      </button>
    </li>
  )
}
