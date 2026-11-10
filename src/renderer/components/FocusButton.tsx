import { useT } from '../ui'

/** W112: focus mode (W77) as a round icon button in the work header, the same toggle as the menu item. */
export function FocusButton({ on, disabled, onClick }: { on: boolean; disabled: boolean; onClick: () => void }) {
  const t = useT()
  return (
    <button type="button" className="ibtn" aria-pressed={on} disabled={disabled} onClick={onClick} title={t('Modo foco (⌘⇧F)')} aria-label={t('Modo foco')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    </button>
  )
}
