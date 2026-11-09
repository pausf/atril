import { homedir } from 'node:os'
import { join } from 'node:path'

export const atrilHome = (): string => process.env['ATRIL_HOME'] ?? join(homedir(), '.atril')

// Packaged: electron-builder must copy resources/* to <resourcesPath>/ (extraResources).
// Dev and tests: src/main and out/main both sit two levels under the repo root.
export const resourcesDir = (): string =>
  process.versions.electron && !process.defaultApp ? process.resourcesPath : join(__dirname, '../../resources')
