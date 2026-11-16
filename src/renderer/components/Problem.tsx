import type { NetFix, WorkFix } from '../../preload/api'
import { useT, type T } from '../ui'

/** The one button each fix gets (W130, W133, W135, W147, W150, W159); no fix, no button. */
export const fixLabel = (t: T, fix: WorkFix | NetFix | undefined, forge?: string): string | undefined =>
  fix === 'forge'
    ? t('Abrir en {forge} ↗', { forge: forge ?? '' })
    : fix === 'worktree'
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
              : fix === 'git'
                ? t('Instalar herramientas de Xcode')
                : undefined

/** W159: the two fixes every workspace problem does the same way; false leaves the fix to the caller. */
export function sharedFix(fix: WorkFix | undefined, openSettings: () => void): boolean {
  if (fix === 'settings') openSettings()
  else if (fix === 'git') void window.atril.installTool('git')
  else return false
  return true
}

/**
 * What happened, what that stops, one button that fixes it and the technical detail folded («Ver detalle»).
 * Without `fix` there is no button, without `detail` nothing to unfold; `onClose` adds «Cerrar aviso»; `alt` a second,
 * plain button (e.g. «Volver a comprobar»). `cant` may be left out when `what` already says it.
 */
export function Problem({ what, cant, fix, onFix, alt, onAlt, detail, busy, onClose }: { what: string; cant?: string; fix?: string; onFix?: () => void; alt?: string; onAlt?: () => void; detail: string; busy?: boolean; onClose?: () => void }) {
  const t = useT()
  return (
    <div className="problem" role="alert">
      <b>{what}</b>
      {cant && <p>{cant}</p>}
      {fix && (
        <button type="button" className="btn p" disabled={busy} onClick={onFix}>
          {fix}
        </button>
      )}
      {alt && (
        <button type="button" className="btn" disabled={busy} onClick={onAlt}>
          {alt}
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
