import { useContext, useEffect, useState } from 'react'
import type { JiraSettingsStatus } from '../../preload/api'
import { NavigationContext } from '../settings/navigation'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** `refreshOn` changes when the person may have saved or deleted the token (leaving Ajustes). */
export function SessionChip({ refreshOn }: { refreshOn?: unknown }) {
  const { openSettings } = useContext(NavigationContext)
  const [status, setStatus] = useState<JiraSettingsStatus | null>(null)

  useEffect(() => {
    window.atril.settings.jira
      .status()
      .then(setStatus)
      .catch(() => setStatus({ saved: false }))
  }, [refreshOn])

  if (status === null) return null
  const label = status.saved ? status.account || 'Jira' : 'Sin conectar'
  return (
    <button className="chip session" data-tour="session" onClick={openSettings} title="Tu sesión · Ajustes">
      {status.saved && (
        <span className="avatar" aria-hidden>
          {status.avatar ? <img src={status.avatar} alt="" /> : initials(label)}
        </span>
      )}
      <span className="who">{label}</span>
      {status.saved && <span className="tag">Jira</span>}
    </button>
  )
}
