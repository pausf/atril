import { homedir } from 'node:os'
import { join } from 'node:path'

/** The env override, else the person's real file — except under vitest, where a test that lost its
 * env (a timed-out test's late write) must fail instead of writing into the person's home. */
export function envPath(name: string, fallback: () => string): string {
  const value = process.env[name]
  if (value) return value
  if (process.env['VITEST']) throw new Error(`${name} no está fijado en este test`)
  return fallback()
}

export const atrilHome = (): string => envPath('ATRIL_HOME', () => join(homedir(), '.atril'))

// Packaged: electron-builder must copy resources/* to <resourcesPath>/ (extraResources).
// Dev and tests: src/main and out/main both sit two levels under the repo root.
export const resourcesDir = (): string =>
  process.versions.electron && !process.defaultApp ? process.resourcesPath : join(__dirname, '../../resources')
