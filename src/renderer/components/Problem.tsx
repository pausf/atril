import { useT } from '../ui'

/** What happened, what that stops, one button that fixes it and the technical detail folded («Ver detalle»). */
export function Problem({ what, cant, fix, onFix, detail, busy }: { what: string; cant: string; fix: string; onFix: () => void; detail: string; busy?: boolean }) {
  const t = useT()
  return (
    <div className="problem" role="alert">
      <b>{what}</b>
      <p>{cant}</p>
      <button type="button" className="btn p" disabled={busy} onClick={onFix}>
        {fix}
      </button>
      <details>
        <summary>{t('Ver detalle')}</summary>
        <code>{detail}</code>
      </details>
    </div>
  )
}
