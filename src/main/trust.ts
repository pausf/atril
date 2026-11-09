import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { atrilHome } from './paths'

// Claude Code has no flag or setting that pre-trusts a folder (`claude --help` only skips the
// dialog in -p mode), so the dialog's own record is written: projects[path].hasTrustDialogAccepted.
export const claudeConfigPath = (): string => process.env['ATRIL_CLAUDE_JSON'] ?? join(homedir(), '.claude.json')

type Config = Record<string, unknown>

/** Pure: the config with `path` trusted and every other key untouched. */
export function withTrust(config: Config, path: string): Config {
  const projects = (config['projects'] ?? {}) as Record<string, Record<string, unknown>>
  return { ...config, projects: { ...projects, [path]: { ...projects[path], hasTrustDialogAccepted: true } } }
}

/** Pure: the config with the trust flag of `path` removed (used to undo a manual check). */
export function withoutTrust(config: Config, path: string): Config {
  const projects = { ...((config['projects'] ?? {}) as Record<string, Record<string, unknown>>) }
  const { hasTrustDialogAccepted: _drop, ...rest } = projects[path] ?? {}
  void _drop
  projects[path] = rest
  return { ...config, projects }
}

const signature = async (file: string): Promise<string> => {
  try {
    const s = await stat(file)
    return `${s.mtimeMs}:${s.size}`
  } catch {
    return 'missing'
  }
}

/**
 * Running Claude processes rewrite this file, so: read, transform, write a temp file beside it, and
 * rename only if the file is still what was read. Otherwise start over. Never writes unparseable input.
 */
export async function updateClaudeConfig(
  transform: (c: Config) => Config,
  file = claudeConfigPath(),
  attempts = 5
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const before = await signature(file)
    let current: Config = {}
    if (before !== 'missing') {
      try {
        current = JSON.parse(await readFile(file, 'utf8')) as Config
      } catch {
        // Mid-rewrite by another process or corrupt: retry, and never overwrite what we cannot parse.
        await new Promise((r) => setTimeout(r, 50))
        continue
      }
    }
    const next = JSON.stringify(transform(current), null, 2)
    const tmp = `${file}.atril-${process.pid}.tmp`
    await writeFile(tmp, next, { mode: 0o600 })
    if ((await signature(file)) !== before) continue
    await rename(tmp, file)
    return true
  }
  return false
}

let backedUp = false
/** One copy per Atril launch, before the first write. */
async function backupOnce(file: string): Promise<void> {
  if (backedUp) return
  backedUp = true
  const dir = join(atrilHome(), 'backups')
  await mkdir(dir, { recursive: true })
  await copyFile(file, join(dir, `claude.json.${new Date().toISOString().replace(/[:.]/g, '-')}`)).catch(() => undefined)
}

/** Best effort: a failure here means the person sees the trust prompt, not that the workspace fails. */
export async function trustFolder(path: string, file = claudeConfigPath()): Promise<boolean> {
  try {
    await backupOnce(file)
    return await updateClaudeConfig((c) => withTrust(c, path), file)
  } catch (err) {
    console.error(`[atril] trust failed: ${err instanceof Error ? err.name : 'Error'}`)
    return false
  }
}
