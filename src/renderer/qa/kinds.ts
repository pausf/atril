import type { QaKind } from '../../preload/api'
import type { T } from '../ui'

/** W113: the kind W83 found, in words; «sin detectar» when it found none. */
export function kindLabel(t: T, kind: QaKind | null): string {
  switch (kind) {
    case 'web':
      return t('App web')
    case 'android':
      return t('Android')
    case 'ios':
      return t('iOS')
    case 'expo':
      return t('Expo')
    case 'react-native':
      return t('React Native')
    case 'flutter':
      return t('Flutter')
    default:
      return t('sin detectar')
  }
}
