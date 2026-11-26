import { useEffect, useState } from 'react'
import type { CiState, MrItem } from '../../preload/api'
import { useT } from '../ui'

// W186: «Arreglar con Claude» from the Mac starts the fix once this MR's view shows.
let pendingFix: string | null = null
export const requestFix = (url: string): void => {
  pendingFix = url
}

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
  useEffect(() => {
    if (pendingFix !== m.url) return
    pendingFix = null
    void fix()
  }, [m.url])

  if (!m.ci) return null
  const ci: Record<CiState, string> = { pass: t('Passing'), fail: t('Failing'), running: t('In progress'), none: t('No CI') }
  return (
    <span className="mr-ci">
      <span className={`tag ci-${m.ci}`}>{ci[m.ci]}</span>
      {m.ci === 'fail' && branch && (
        <button type="button" className="btn" disabled={busy} onClick={() => void fix()}>
          {t('Fix CI with Claude')}
        </button>
      )}
      {result && 'sent' in result && <span role="status">{t('Sent to {rama}', { rama: result.sent })}</span>}
      {result && 'error' in result && (
        <span className="mr-score-error" role="alert">
          {result.error}
        </span>
      )}
    </span>
  )
}
