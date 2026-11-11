import type { Effort, Model } from '../../preload/api'
// Not ui.tsx's T: main's tests read these options, and main's tsconfig has no JSX.
type T = (es: string) => string

export const modelOptions = (t: T): ReadonlyArray<{ value: Model; label: string }> => [
  { value: 'default', label: t('Por defecto (tu Claude Code)') },
  { value: 'opus', label: t('Opus · el más capaz') },
  { value: 'sonnet', label: t('Sonnet · equilibrado') },
  { value: 'haiku', label: t('Haiku · rápido y barato') }
]

export const effortOptions = (t: T): ReadonlyArray<{ value: Effort; label: string }> => [
  { value: 'default', label: t('Por defecto') },
  { value: 'low', label: t('Bajo') },
  { value: 'medium', label: t('Medio') },
  { value: 'high', label: t('Alto') },
  { value: 'xhigh', label: t('Muy alto') }
]
