import type { SkillItem, SkillState, SkillUse } from '../../preload/api'
import { useT, type T } from '../ui'

/** `/name`, or `/plugin:name` for plugin and Atril items (K5). */
export const fullName = (i: SkillItem): string => (i.plugin ? `/${i.plugin.split('@')[0]}:${i.name}` : `/${i.name}`)

export const stateLabel = (t: T, s: SkillState): string =>
  s === 'on' ? t('On@@fem') : s === 'name-only' ? t('Name only') : s === 'user-invocable-only' ? t('Only when you call it') : t('Off')

export const originLabel = (t: T, i: SkillItem, repo: string): string =>
  i.origin === 'personal' ? t('Personal') : i.origin === 'project' ? repo : i.origin === 'atril' ? t('Atril') : (i.plugin ?? '').split('@')[0]!

/** K37: undefined while the usage has not answered (say nothing), null when the name was not used. */
export const lastUsed = (t: T, use: SkillUse | null): string => {
  const k = use ? use.days.findIndex((n) => n > 0) : -1
  return k < 0 ? t('unused in 30 days') : k === 0 ? t('used today') : k === 1 ? t('used 1 day ago') : t('used {n} days ago', { n: k })
}

/** One skill or command as one line: only the marks the group and the filter do not already say (K5); activating it opens its detail (K7). */
export function SkillRow({
  item,
  id,
  use,
  onOpen
}: {
  item: SkillItem
  id: string
  use?: SkillUse | null
  onOpen: (el: HTMLButtonElement) => void
}) {
  const t = useT()
  const name = fullName(item)
  const off = item.state === 'off' || item.enabled === false || item.shadowedBy !== undefined
  return (
    <li className={off ? 'off' : undefined}>
      <button type="button" className="skr" aria-label={name} aria-describedby={id} onClick={(e) => onOpen(e.currentTarget)}>
        <b>{name}</b>
        <span className="skr-d" title={item.description}>
          {item.description ?? ''}
        </span>
        <span id={id} className="skr-m">
          {item.kind === 'command' && <span className="tag">{t('command')}</span>}
          {item.state !== 'on' && <span className="tag">{stateLabel(t, item.state)}</span>}
          {item.shadowedBy && <span className="tag lose">{item.shadowedBy === 'personal' ? t('Not loaded: the personal one wins') : t('Not loaded: the skill wins')}</span>}
          {item.disableModelInvocation && <span className="tag">{t('Claude does not use it on its own')}</span>}
          {item.broken && <span className="tag lose">{t('Unreadable header')}</span>}
          {use !== undefined && !item.shadowedBy && <span className="skr-u">{lastUsed(t, use)}</span>}
        </span>
      </button>
    </li>
  )
}
