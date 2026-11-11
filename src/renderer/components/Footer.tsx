import { useEffect, useState } from 'react'
import type { UsageResult } from '../../preload/api'
import { useLocale, useT, type T } from '../ui'

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
function resetLabel(t: T, locale: string, iso: string | null, now = new Date()): string | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  // The endpoint resets at hh:59:59.x; show the hour the window really reopens.
  at.setTime(Math.round(at.getTime() / 60_000) * 60_000)
  const time = at.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const days = Math.round((new Date(at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return t('hoy {time}', { time })
  if (days === 1) return t('mañana {time}', { time })
  return t('el {day} {time}', { day: at.toLocaleDateString(locale, { weekday: 'long' }), time })
}

export function Footer() {
  const t = useT()
  const locale = useLocale()
  const [usage, setUsage] = useState<UsageResult | null>(null)
  const [fixFailed, setFixFailed] = useState<string | null>(null)
  useEffect(() => {
    void window.atril.usage.get().then(setUsage)
    return window.atril.usage.onChange(setUsage)
  }, [])

  const reset = usage && !('error' in usage) ? resetLabel(t, locale, usage.sevenDay.resetsAt) : null

  return (
    <footer className="foot" data-tour="usage">
      <span className="meter">
        <b>Claude</b>{' '}
        {!usage ? (
          '…'
        ) : 'error' in usage ? (
          <span className="foot-err">
            {fixFailed ?? usage.error}{' '}
            <button
              type="button"
              className="linklike"
              onClick={() =>
                void (usage.fix === 'claude'
                  ? window.atril.usage.fix().then((r) => setFixFailed('error' in r ? r.error : null))
                  : window.atril.usage.get().then(setUsage))
              }
            >
              {usage.fix === 'claude' ? t('Abrir Claude Code') : t('Volver a comprobar')}
            </button>
            <details>
              <summary>{t('Ver detalle')}</summary>
              <code>{usage.detail}</code>
            </details>
          </span>
        ) : (
          <>
            {t('5 h')} <Bar pct={usage.fiveHour.pct} /> {usage.fiveHour.pct} % · {t('7 días')} <Bar pct={usage.sevenDay.pct} />{' '}
            {usage.sevenDay.pct} %
            {reset && <> · {t('se reinicia {when}', { when: reset })}</>}
            {usage.stale && (
              <span className="stale" title={t('La API de uso no responde ahora mismo; Atril reintentará más tarde')}>
                {' '}
                {t('· dato de hace {n} min', { n: Math.max(1, Math.round((Date.now() - usage.stale.since) / 60_000)) })}
              </span>
            )}
          </>
        )}
      </span>
    </footer>
  )
}
