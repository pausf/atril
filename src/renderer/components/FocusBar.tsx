import type { WorkspaceView } from '../../preload/api'
import { useT } from '../ui'

interface Props {
  /** Every needs-you workspace but the open one, oldest first (N1). */
  waiting: WorkspaceView[]
  /** Where «Volver» goes: the workspace open at the first jump. */
  back: WorkspaceView | undefined
  onJump: (id: string) => void
  onBack: () => void
  onExit: () => void
}

/** Focus mode's top bar, in place of «Qué me toca»: the pill, the way back and the way out (W77, W79). */
export function FocusBar({ waiting, back, onJump, onBack, onExit }: Props) {
  const t = useT()
  const [first] = waiting
  return (
    <div className="focusbar">
      <b>{t('Focus mode')}</b>
      {first && (
        <span className="fpill">
          <button type="button" className="nx agent" onClick={() => onJump(first.id)}>
            {t('{branch} needs you', { branch: first.branch })}
          </button>
          {waiting.length > 1 && <span className="more">+{waiting.length - 1}</span>}
        </span>
      )}
      {back && (
        <button type="button" className="back" onClick={onBack}>
          {t('Back to {branch}', { branch: back.branch })}
        </button>
      )}
      <button type="button" className="exit" onClick={onExit}>
        {t('Leave focus')}
      </button>
    </div>
  )
}
