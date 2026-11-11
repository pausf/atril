import { useT } from '../ui'

/**
 * What happened, what that stops, one button that fixes it and the technical detail folded («Ver detalle»).
 * Without `fix` there is no button, without `detail` nothing to unfold; `onClose` adds «Cerrar aviso».
 */
export function Problem({ what, cant, fix, onFix, detail, busy, onClose }: { what: string; cant: string; fix?: string; onFix?: () => void; detail: string; busy?: boolean; onClose?: () => void }) {
  const t = useT()
  return (
    <div className="problem" role="alert">
      <b>{what}</b>
      <p>{cant}</p>
      {fix && (
        <button type="button" className="btn p" disabled={busy} onClick={onFix}>
          {fix}
        </button>
      )}
      {onClose && (
        <button type="button" className="btn" onClick={onClose}>
          {t('Cerrar aviso')}
        </button>
      )}
      {detail && (
        <details>
          <summary>{t('Ver detalle')}</summary>
          <code>{detail}</code>
        </details>
      )}
    </div>
  )
}
