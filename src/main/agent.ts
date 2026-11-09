import { join } from 'node:path'

// Packaged: electron-builder must copy resources/libretto to <resourcesPath>/libretto (extraResources).
// Dev and tests: src/main and out/main both sit two levels under the repo root.
const librettoDir = (): string =>
  process.versions.electron && !process.defaultApp
    ? join(process.resourcesPath, 'libretto')
    : join(__dirname, '../../resources/libretto')

export const agentArgv = (agent: 'claude' | 'codex'): string[] =>
  agent === 'claude' ? ['claude', '--plugin-dir', librettoDir()] : ['codex']
