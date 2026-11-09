import { useEffect, useState } from 'react'
import type { ActivityKind, ActivityLine } from '../../preload/api'
import { Icon, type IconName } from '../components/Icon'
import { useT, type T } from '../ui'

export const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  prompt: 'a-prompt',
  read: 'a-read',
  edit: 'a-edit',
  run: 'a-run',
  fail: 'a-fail',
  search: 'a-search',
  agent: 'a-agent',
  tool: 'a-tool',
  says: 'a-says',
  asks: 'needs-you'
}

export function ago(t: T, at: number, now: number): string {
  const s = Math.max(0, Math.floor(now / 1000 - at))
  if (s < 60) return t('ahora')
  if (s < 3600) return t('hace {n} min', { n: Math.floor(s / 60) })
  if (s < 86400) return t('hace {n} h', { n: Math.floor(s / 3600) })
  return t('hace {n} d', { n: Math.floor(s / 86400) })
}

export function ActivityFeed({ workspaceId }: { workspaceId: string | null }) {
  const t = useT()
  const [lines, setLines] = useState<ActivityLine[]>([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let live = true
    setLines([])
    if (workspaceId) void window.atril.activity.get(workspaceId).then((l) => live && setLines(l))
    const off = window.atril.activity.onChange((id, l) => id === workspaceId && setLines(l))
    return () => {
      live = false
      off()
    }
  }, [workspaceId])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (!workspaceId) return <div className="empty">{t('Elige un trabajo para ver lo que hace su agente.')}</div>
  if (lines.length === 0) return <div className="empty">{t('Aún no hay actividad: aparece cuando el agente haga algo.')}</div>
  return (
    <ul className="feed" aria-label={t('Actividad del agente, la más reciente primero')}>
      {lines.map((l, i) => (
        <li className={`act ${l.kind}`} key={`${l.at}-${i}`}>
          <Icon name={ACTIVITY_ICON[l.kind]} size={16} />
          <span className="act-text">{l.text}</span>
          <time className="act-at" dateTime={new Date(l.at * 1000).toISOString()}>
            {ago(t, l.at, now)}
          </time>
        </li>
      ))}
    </ul>
  )
}
