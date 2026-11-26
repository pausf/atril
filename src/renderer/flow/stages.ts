import type { StageName } from '../../preload/api'
import type { IconName } from '../components/Icon'
import type { T } from '../ui'

export const stagesOf = (t: T): { name: Exclude<StageName, 'sin-libretto'>; label: string; icon: IconName }[] => [
  { name: 'entrada', label: t('Intake'), icon: 's-entrada' },
  { name: 'spec', label: t('Spec'), icon: 's-spec' },
  { name: 'plan', label: t('Plan'), icon: 's-plan' },
  { name: 'construir', label: t('Build'), icon: 's-build' },
  { name: 'terminado', label: t('Done'), icon: 's-done' },
  { name: 'aterrizado', label: t('Landed'), icon: 's-landed' }
]
