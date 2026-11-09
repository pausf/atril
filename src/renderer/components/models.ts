import type { Model } from '../../preload/api'

export const MODEL_OPTIONS: ReadonlyArray<{ value: Model; label: string }> = [
  { value: 'default', label: 'Por defecto (tu Claude Code)' },
  { value: 'opus', label: 'Opus · el más capaz' },
  { value: 'sonnet', label: 'Sonnet · equilibrado' },
  { value: 'haiku', label: 'Haiku · rápido y barato' }
]
