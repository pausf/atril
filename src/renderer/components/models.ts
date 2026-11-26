import type { Effort, Model } from '../../preload/api'
// Not ui.tsx's T: main's tests read these options, and main's tsconfig has no JSX.
type T = (es: string) => string

export const modelOptions = (t: T): ReadonlyArray<{ value: Model; label: string }> => [
  { value: 'default', label: t('Default (your Claude Code)') },
  { value: 'opus', label: t('Opus · the most capable') },
  { value: 'sonnet', label: t('Sonnet · balanced') },
  { value: 'haiku', label: t('Haiku · fast and cheap') }
]

export const effortOptions = (t: T): ReadonlyArray<{ value: Effort; label: string }> => [
  { value: 'default', label: t('Default') },
  { value: 'low', label: t('Low@@masc') },
  { value: 'medium', label: t('Medium@@masc') },
  { value: 'high', label: t('High@@masc') },
  { value: 'xhigh', label: t('Very high') }
]
