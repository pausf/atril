import type { NetFix, WorkFix } from '../../preload/api'
import { useT, type T } from '../ui'

/** The one button each fix gets (W130, W133, W135, W147, W150); no fix, no button. */
export const fixLabel = (t: T, fix: WorkFix | NetFix | undefined): string | undefined =>
  fix === 'worktree'
    ? t('Usar un worktree esta vez')
    : fix === 'terminal'
      ? t('Abrir en Terminal')
      : fix === 'forget'
        ? t('Quitar de la lista igualmente')
        : fix === 'reveal'
          ? t('Mostrar en Finder')
          : fix === 'settings'
            ? t('Abrir Ajustes')
            : fix === 'retry'
              ? t('Volver a comprobar')
              : undefined

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
