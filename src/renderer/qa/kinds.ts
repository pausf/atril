import type { QaFix, QaPlatform, QaTarget } from '../../preload/api'
import type { T } from '../ui'

export const PLATFORMS: readonly QaPlatform[] = ['chrome', 'safari', 'android', 'ios']

/** W113: the chosen target's platform in words; «sin detectar» when there is none. */
export function platformLabel(t: T, platform: QaPlatform | null | undefined): string {
  switch (platform) {
    case 'chrome':
      return t('Chrome')
    case 'safari':
      return t('Safari')
    case 'android':
      return t('Android')
    case 'ios':
      return t('iOS')
    default:
      return t('sin detectar')
  }
}

/** W123: a tab's name, with its folder after «·» when it is not the root. */
export const targetLabel = (t: T, x: QaTarget): string => (x.dir ? `${platformLabel(t, x.platform)} · ${x.dir}` : platformLabel(t, x.platform))

/** W125: each fix's button. */
export function fixLabel(t: T, fix: QaFix): string {
  switch (fix) {
    case 'pick-manual':
      return t('Elegir a mano')
    case 'install-node':
      return t('Instalar Node')
    case 'install-android-studio':
      return t('Instalar Android Studio')
    case 'create-avd':
      return t('Crear un Pixel 8')
    case 'update-xcode':
      return t('Actualizar Xcode')
    case 'open-xcode':
      return t('Abrir Xcode')
    case 'open-workspace':
      return t('Ver el otro QA')
  }
}
