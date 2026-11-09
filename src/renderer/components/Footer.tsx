import { useEffect, useState } from 'react'
import type { UsageResult } from '../../preload/api'

const BARS = 3

function Bar({ pct }: { pct: number }) {
  const on = Math.min(BARS, Math.round((pct / 100) * BARS))
  return (
    <span className={`bars${pct > 80 ? ' hot' : ''}`} aria-hidden>
      {'▮'.repeat(on)}
      <i>{'▮'.repeat(BARS - on)}</i>
    </span>
  )
}

// "hoy 14:00", "mañana 09:00", "el jueves 09:00": relative while it is near, a weekday after.
function resetLabel(iso: string | null, now = new Date()): string | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  // The endpoint resets at hh:59:59.x; show the hour the window really reopens.
  at.setTime(Math.round(at.getTime() / 60_000) * 60_000)
  const time = at.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const days = Math.round((new Date(at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return `hoy ${time}`
  if (days === 1) return `mañana ${time}`
  return `el ${at.toLocaleDateString('es-ES', { weekday: 'long' })} ${time}`
}

export function Footer() {
  const [usage, setUsage] = useState<UsageResult | null>(null)
  useEffect(() => {
    void window.atril.usage.get().then(setUsage)
    return window.atril.usage.onChange(setUsage)
  }, [])

  return (
    <footer className="foot">
      <span className="meter">
        <b>Claude</b>{' '}
        {!usage ? (
          '…'
        ) : 'error' in usage ? (
          <span title={usage.error}>— {usage.error}</span>
        ) : (
          <>
            5 h <Bar pct={usage.fiveHour.pct} /> {usage.fiveHour.pct} % · 7 días <Bar pct={usage.sevenDay.pct} />{' '}
            {usage.sevenDay.pct} %
            {resetLabel(usage.sevenDay.resetsAt) && <> · se reinicia {resetLabel(usage.sevenDay.resetsAt)}</>}
          </>
        )}
      </span>
    </footer>
  )
}
