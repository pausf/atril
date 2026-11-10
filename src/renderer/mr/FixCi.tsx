import { useEffect, useState } from 'react'
import type { CiState, MrItem } from '../../preload/api'
import { useT } from '../ui'

/** M31, M32: the MR's CI state and, while it fails and one agent works on it, «Arreglar CI con Claude». */
export function FixCi({ m }: { m: MrItem }) {
  const t = useT()
  const [branch, setBranch] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ sent: string } | { error: string } | null>(null)

  useEffect(() => {
    let live = true
    void window.atril.mr.ciAgent(m.url).then((b) => live && setBranch(b))
    return () => {
      live = false
    }
  }, [m.url])

  const fix = async (): Promise<void> => {
    setBusy(true)
    setResult(await window.atril.mr.fixCi(m.url))
    setBusy(false)
  }

  if (!m.ci) return null
  const ci: Record<CiState, string> = { pass: t('Pasa'), fail: t('Falla'), running: t('En curso'), none: t('Sin CI') }
  return (
    <span className="mr-ci">
      <span className={`tag ci-${m.ci}`}>{ci[m.ci]}</span>
      {m.ci === 'fail' && branch && (
        <button type="button" className="btn" disabled={busy} onClick={() => void fix()}>
          {t('Arreglar CI con Claude')}
        </button>
      )}
      {result && 'sent' in result && <span role="status">{t('Enviado a {rama}', { rama: result.sent })}</span>}
      {result && 'error' in result && (
        <span className="mr-score-error" role="alert">
          {result.error}
        </span>
      )}
    </span>
  )
}
