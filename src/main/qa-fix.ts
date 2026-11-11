import type { QaFixResult } from '../preload/api'
import { inTerminal } from './doctor'
import { t } from './lang'
import { deviceHolder } from './qa'
import type { Runner } from './run'
import { readRecords } from './workspaces'

const AVD_IMAGE = 'system-images;android-35;google_apis;arm64-v8a'

/** W125: what each fix runs; a name the switch does not know does nothing (like W21, the window never sends a command or URL). */
export async function runFix(id: string, fix: unknown, deps: { run: Runner; open: (url: string) => Promise<void> }): Promise<QaFixResult> {
  if (!(await readRecords()).some((r) => r.id === id && r.mode !== 'review')) return { error: t('Ese trabajo ya no existe') }
  switch (fix) {
    case 'install-node':
      return inTerminal('brew install node', deps.run)
    case 'install-android-studio':
      await deps.open('https://developer.android.com/studio')
      return { ok: true }
    case 'create-avd':
      return inTerminal(`sdkmanager "${AVD_IMAGE}" && avdmanager create avd -n Pixel_8 -k "${AVD_IMAGE}" -d pixel_8`, deps.run)
    case 'update-xcode':
      await deps.open('macappstore://apps.apple.com/app/id497799835')
      return { ok: true }
    case 'open-xcode': {
      const r = await deps.run('open', ['-a', 'Xcode'])
      return r.code === 0 ? { ok: true } : { error: t('No se pudo abrir Xcode') }
    }
    case 'open-workspace': {
      const holder = await deviceHolder(id, deps.run)
      return holder ? { ok: true, open: holder } : { error: t('Ese dispositivo ya está libre: vuelve a probar') }
    }
    default:
      return { error: t('Ese arreglo no existe: {fix}', { fix: String(fix) }) }
  }
}
