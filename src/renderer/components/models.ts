import type { Model } from '../../preload/api'
import type { T } from '../ui'

export const modelOptions = (t: T): ReadonlyArray<{ value: Model; label: string }> => [
  { value: 'default', label: t('Por defecto (tu Claude Code)') },
  { value: 'opus', label: t('Opus · el más capaz') },
  { value: 'sonnet', label: t('Sonnet · equilibrado') },
  { value: 'haiku', label: t('Haiku · rápido y barato') }
]
