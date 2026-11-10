import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Model } from '../preload/api'
import { atrilHome, resourcesDir } from './paths'

const librettoDir = (): string => join(resourcesDir(), 'libretto')
export const hooksFile = (): string => join(atrilHome(), 'hooks.json')

const HOOK_EVENTS = ['Notification', 'Stop', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop'] as const

/** Atril's own binary runs the hook as Node (ELECTRON_RUN_AS_NODE): a Finder-launched app has no node on PATH. */
export function hooksSettings(): { hooks: Record<string, { hooks: { type: 'command'; command: string }[] }[]> } {
  const script = join(resourcesDir(), 'claude-hook.mjs')
  return {
    hooks: Object.fromEntries(
      HOOK_EVENTS.map((event) => [
        event,
        [{ hooks: [{ type: 'command', command: `ELECTRON_RUN_AS_NODE=1 "${process.execPath}" "${script}" ${event}` }] }]
      ])
    )
  }
}

export async function writeHooksFile(): Promise<void> {
  await mkdir(atrilHome(), { recursive: true })
  await writeFile(hooksFile(), JSON.stringify(hooksSettings(), null, 2) + '\n')
}

export const MODELS: readonly Model[] = ['default', 'opus', 'sonnet', 'haiku']

/**
 * `prompt` goes last: claude takes it as its positional argument. 'default' adds no flag.
 * `hooks: false` (the QA agent): the hook reports by session, so a second claude in the same session would
 * speak for the work's own agent. `mcpConfig` loads only that file's MCP servers, never the person's.
 */
export const agentArgv = (opts: { model?: Model; prompt?: string; mcpConfig?: string; hooks?: false } = {}): string[] => [
  'claude',
  ...(opts.hooks === false ? [] : ['--settings', hooksFile()]),
  '--plugin-dir',
  librettoDir(),
  ...(opts.model && opts.model !== 'default' ? ['--model', opts.model] : []),
  ...(opts.mcpConfig ? ['--mcp-config', opts.mcpConfig, '--strict-mcp-config'] : []),
  ...(opts.prompt ? [opts.prompt] : [])
]
