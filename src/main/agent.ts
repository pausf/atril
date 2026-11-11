import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Effort, Model } from '../preload/api'
import { t } from './lang'
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
export const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh']

/** W137: null for no effort, 'default' or a level from the list; the refusal otherwise. */
export const effortError = (effort: unknown): string | null =>
  effort === undefined || effort === 'default' || EFFORTS.includes(effort as Effort) ? null : t('«{effort}» no es un esfuerzo disponible', { effort: String(effort) })

/**
 * `prompt` goes last: claude takes it as its positional argument. 'default' adds no flag.
 * `hooks: false` (the QA agent): the hook reports by session, so a second claude in the same session would
 * speak for the work's own agent. `mcpConfig` loads only that file's MCP servers, never the person's.
 */
export const agentArgv = (opts: { model?: Model; effort?: Effort; prompt?: string; mcpConfig?: string; hooks?: false; resume?: true } = {}): string[] => [
  'claude',
  ...(opts.hooks === false ? [] : ['--settings', hooksFile()]),
  '--plugin-dir',
  librettoDir(),
  // W141: the last conversation of the work's folder.
  ...(opts.resume === true ? ['--continue'] : []),
  ...(opts.model && opts.model !== 'default' ? ['--model', opts.model] : []),
  ...(opts.effort && EFFORTS.includes(opts.effort) ? ['--effort', opts.effort] : []),
  ...(opts.mcpConfig ? ['--mcp-config', opts.mcpConfig, '--strict-mcp-config'] : []),
  ...(opts.prompt ? [opts.prompt] : [])
]
