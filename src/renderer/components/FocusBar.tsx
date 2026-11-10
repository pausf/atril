import { useT } from '../ui'

/** Focus mode's top bar: in place of «Qué me toca», only the way out (W77). */
export function FocusBar({ onExit }: { onExit: () => void }) {
  const t = useT()
  return (
    <div className="focusbar">
      <b>{t('Modo foco')}</b>
      <button type="button" className="exit" onClick={onExit}>
        {t('Salir del foco')}
      </button>
    </div>
  )
}
