import { relative } from 'node:path'
import type { SkillItem, SkillState } from '../../preload/api'

const STATES: readonly SkillState[] = ['on', 'name-only', 'user-invocable-only', 'off']
const record = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Where the merge's files are: user, repo, repo local (K12). */
export type Where = { files: string[]; repoDir?: string }

/** K12: the file a change is written to: the user's for personal items and plugins, the repo's local one for project items. */
export const writeIndex = (origin: SkillItem['origin']): number => (origin === 'project' ? 2 : 0)

/** K12: the last file after `target` in the merge that sets `key` in `section`, as a path relative to the repo. */
export function lockOf(settings: Record<string, unknown>[], where: Where, section: string, key: string, target: number): string | undefined {
  for (let i = settings.length - 1; i > target; i--) {
    if (key in record(settings[i]?.[section])) return relative(where.repoDir ?? '', where.files[i] ?? '')
  }
  return undefined
}

/** K3 and K4: state from the merged settings (later files win), then which same-named items are not loaded. K12 when `where` is given. */
export function resolve(items: SkillItem[], settings: Record<string, unknown>[], where?: Where): SkillItem[] {
  const overrides: Record<string, unknown> = {}
  const plugins: Record<string, unknown> = {}
  for (const s of settings) {
    Object.assign(overrides, record(s['skillOverrides']))
    Object.assign(plugins, record(s['enabledPlugins']))
  }
  const has = (origin: SkillItem['origin'], kind: SkillItem['kind'], name: string): boolean =>
    items.some((i) => i.origin === origin && i.kind === kind && i.name === name)
  const writes = (i: SkillItem): Partial<SkillItem> => {
    const target = writeIndex(i.origin)
    const file = where?.files[target]
    if (!where || !file) return {}
    const lock = i.origin === 'plugin' ? lockOf(settings, where, 'enabledPlugins', i.plugin ?? '', target) : lockOf(settings, where, 'skillOverrides', i.name, target)
    return { writesTo: file, ...(lock ? { lockedBy: lock } : {}) }
  }
  return items.map((i) => {
    if (i.origin === 'atril') return { ...i, state: 'on', enabled: true }
    if (i.origin === 'plugin') return { ...i, state: 'on', enabled: plugins[i.plugin ?? ''] !== false, ...writes(i) }
    const o = overrides[i.name]
    const state = STATES.includes(o as SkillState) ? (o as SkillState) : 'on'
    const shadowedBy =
      i.origin === 'project' && (has('personal', 'skill', i.name) || has('personal', 'command', i.name))
        ? 'personal'
        : i.kind === 'command' && has(i.origin, 'skill', i.name)
          ? 'skill'
          : undefined
    return { ...i, state, ...(shadowedBy ? { shadowedBy } : {}), ...writes(i) }
  })
}
