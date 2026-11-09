import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atrilHome, resourcesDir } from './paths'

const librettoDir = (): string => join(resourcesDir(), 'libretto')
export const hooksFile = (): string => join(atrilHome(), 'hooks.json')

const HOOK_STATES = { Notification: 'needs-you', Stop: 'needs-you', UserPromptSubmit: 'working' } as const

export function hooksSettings(): { hooks: Record<string, { hooks: { type: 'command'; command: string }[] }[]> } {
  const script = join(resourcesDir(), 'claude-hook.sh')
  return {
    hooks: Object.fromEntries(
      Object.entries(HOOK_STATES).map(([event, state]) => [
        event,
        [{ hooks: [{ type: 'command', command: `sh "${script}" ${state}` }] }]
      ])
    )
  }
}

export async function writeHooksFile(): Promise<void> {
  await mkdir(atrilHome(), { recursive: true })
  await writeFile(hooksFile(), JSON.stringify(hooksSettings(), null, 2) + '\n')
}

export const agentArgv = (): string[] => ['claude', '--settings', hooksFile(), '--plugin-dir', librettoDir()]
