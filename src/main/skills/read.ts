import { open, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SkillItem, SkillOrigin, SkillsList } from '../../preload/api'
import { t } from '../lang'
import { claudeDir } from '../paths'
import { asBool, parseFrontmatter, unquote, type Value } from './frontmatter'
import { resolve } from './state'

const MAX_ENTRIES = 300
const MAX_BYTES = 256 * 1024

type Source = { origin: SkillOrigin; root: string; plugin?: string }
type Settings = Record<string, unknown>
export type Read = { items: SkillItem[]; warnings: string[]; settings: Settings[] }

const str = (v: Value | undefined): string | undefined => (typeof v === 'string' && v ? v : undefined)
const tools = (v: Value | undefined): string[] | undefined => {
  if (Array.isArray(v)) return v
  if (typeof v !== 'string' || !v) return undefined
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(unquote).filter(Boolean)
  // `Read, Grep` or `Read Grep`, never splitting inside `Bash(git diff:*)`.
  return v.split(/,\s*|\s+(?![^(]*\))/).filter(Boolean)
}

/** The file's text, or null when it is missing, unreadable or past the cap (`big`). */
async function readCapped(file: string): Promise<string | null | 'big'> {
  try {
    const s = await stat(file)
    if (!s.isFile()) return null
    if (s.size > MAX_BYTES) return 'big'
    const h = await open(file)
    try {
      return await h.readFile('utf8')
    } finally {
      await h.close()
    }
  } catch {
    return null
  }
}

/** Up to 300 entry names, sorted; `cut` when there were more. Missing folder = nothing. */
async function entries(dir: string): Promise<{ names: string[]; cut: boolean }> {
  try {
    const names = (await readdir(dir)).sort()
    return { names: names.slice(0, MAX_ENTRIES), cut: names.length > MAX_ENTRIES }
  } catch {
    return { names: [], cut: false }
  }
}

function item(src: Source, kind: SkillItem['kind'], fallback: string, path: string, text: string | 'big'): SkillItem {
  const base: SkillItem = { name: fallback, kind, origin: src.origin, path, body: '', state: 'on', ...(src.plugin ? { plugin: src.plugin } : {}) }
  if (text === 'big') return base
  const parsed = parseFrontmatter(text)
  if ('broken' in parsed) return { ...base, broken: true }
  const f = parsed.fields
  const out: SkillItem = { ...base, name: str(f['name']) ?? fallback, body: parsed.body }
  const set = <K extends keyof SkillItem>(k: K, v: SkillItem[K] | undefined): void => {
    if (v !== undefined) out[k] = v
  }
  set('description', str(f['description']))
  set('whenToUse', str(f['when_to_use']))
  set('argumentHint', str(f['argument-hint']))
  set('allowedTools', tools(f['allowed-tools']))
  set('model', str(f['model']))
  set('effort', str(f['effort']))
  set('disableModelInvocation', asBool(f['disable-model-invocation']))
  set('userInvocable', asBool(f['user-invocable']))
  return out
}

async function readSource(src: Source, warnings: string[]): Promise<SkillItem[]> {
  const out: SkillItem[] = []
  const cutWarning = (dir: string): void => {
    warnings.push(t('{dir} tiene más de {n} entradas: solo se leen las primeras.', { dir, n: MAX_ENTRIES }))
  }
  const skillsDir = join(src.root, 'skills')
  const skills = await entries(skillsDir)
  if (skills.cut) cutWarning(skillsDir)
  let bigSkill = false
  for (const name of skills.names) {
    const path = join(skillsDir, name, 'SKILL.md')
    const text = await readCapped(path)
    if (text === null) continue
    if (text === 'big') bigSkill = true
    out.push(item(src, 'skill', name, path, text))
  }
  const commandsDir = join(src.root, 'commands')
  const commands = await entries(commandsDir)
  if (commands.cut) cutWarning(commandsDir)
  let bigCommand = false
  for (const file of commands.names.filter((n) => n.endsWith('.md'))) {
    const path = join(commandsDir, file)
    const text = await readCapped(path)
    if (text === null) continue
    if (text === 'big') bigCommand = true
    out.push(item(src, 'command', file.slice(0, -3), path, text))
  }
  for (const [big, dir] of [[bigSkill, skillsDir], [bigCommand, commandsDir]] as const) {
    if (big) warnings.push(t('{dir} tiene archivos de más de 256 KB: no se leen.', { dir }))
  }
  return out
}

/** A JSON object file; missing = `{}`, anything else unusable = `{}` and a warning (K10). */
async function readJson(file: string, warnings: string[]): Promise<Settings> {
  const text = await readCapped(file)
  if (text === null) {
    try {
      await stat(file)
    } catch {
      return {}
    }
  }
  try {
    if (typeof text !== 'string') throw new Error()
    const v: unknown = JSON.parse(text)
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error()
    return v as Settings
  } catch {
    warnings.push(t('No he podido leer {file}: lo trato como vacío.', { file }))
    return {}
  }
}

/** Under each `name@marketplace` key, the first object with an `installPath`, whatever the nesting. */
function plugins(json: Settings): { plugin: string; root: string }[] {
  const firstPath = (v: unknown): string | undefined => {
    if (Array.isArray(v)) return v.map(firstPath).find(Boolean)
    if (typeof v !== 'object' || v === null) return undefined
    const p = (v as Settings)['installPath']
    return typeof p === 'string' ? p : undefined
  }
  const out: { plugin: string; root: string }[] = []
  const walk = (obj: Settings): void => {
    for (const [k, v] of Object.entries(obj)) {
      const root = /^[^@\s]+@[^@\s]+$/.test(k) ? firstPath(v) : undefined
      if (root) out.push({ plugin: k, root })
      else if (typeof v === 'object' && v !== null && !Array.isArray(v)) walk(v as Settings)
    }
  }
  walk(json)
  return out
}

/** Every skill and command of the four origins, with the settings files in merge order (user < repo < repo local). */
export async function readAll(opts: { claude: string; repoDir?: string; libretto: string }, warnings: string[]): Promise<Read> {
  const { claude, repoDir, libretto } = opts
  const settings = [await readJson(join(claude, 'settings.json'), warnings)]
  if (repoDir) {
    settings.push(await readJson(join(repoDir, '.claude/settings.json'), warnings))
    settings.push(await readJson(join(repoDir, '.claude/settings.local.json'), warnings))
  }
  const sources: Source[] = [{ origin: 'personal', root: claude }]
  if (repoDir) sources.push({ origin: 'project', root: join(repoDir, '.claude') })
  const installed = await readJson(join(claude, 'plugins/installed_plugins.json'), warnings)
  for (const p of plugins(installed)) sources.push({ origin: 'plugin', root: p.root, plugin: p.plugin })
  sources.push({ origin: 'atril', root: libretto, plugin: 'libretto' })
  const items: SkillItem[] = []
  for (const src of sources) items.push(...(await readSource(src, warnings)))
  return { items, warnings, settings }
}

type RepoList = { id: string; path: string }[] | object

/** K1: the IPC's answer for `repoId`, resolved against Atril's repo list. */
export async function listSkills(repoId: string | undefined, repos: () => Promise<RepoList>, libretto: string): Promise<SkillsList> {
  const warnings: string[] = []
  let repoDir: string | undefined
  if (repoId) {
    const list = await repos().catch(() => null)
    if (!Array.isArray(list)) warnings.push(t('No he podido leer tu lista de repos: no salen las skills del proyecto.'))
    else {
      repoDir = list.find((r) => r.id === repoId)?.path
      if (!repoDir) warnings.push(t('{repo} ya no está en tu lista de repos.', { repo: repoId }))
    }
  }
  const { items, settings } = await readAll({ claude: claudeDir(), repoDir, libretto }, warnings)
  return { items: resolve(items, settings), warnings }
}
