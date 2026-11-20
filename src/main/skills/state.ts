import type { SkillItem, SkillState } from '../../preload/api'

const STATES: readonly SkillState[] = ['on', 'name-only', 'user-invocable-only', 'off']
const record = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** K3 and K4: state from the merged settings (later files win), then which same-named items are not loaded. */
export function resolve(items: SkillItem[], settings: Record<string, unknown>[]): SkillItem[] {
  const overrides: Record<string, unknown> = {}
  const plugins: Record<string, unknown> = {}
  for (const s of settings) {
    Object.assign(overrides, record(s['skillOverrides']))
    Object.assign(plugins, record(s['enabledPlugins']))
  }
  const has = (origin: SkillItem['origin'], kind: SkillItem['kind'], name: string): boolean =>
    items.some((i) => i.origin === origin && i.kind === kind && i.name === name)
  return items.map((i) => {
    if (i.origin === 'atril') return { ...i, state: 'on', enabled: true }
    if (i.origin === 'plugin') return { ...i, state: 'on', enabled: plugins[i.plugin ?? ''] !== false }
    const o = overrides[i.name]
    const state = STATES.includes(o as SkillState) ? (o as SkillState) : 'on'
    const shadowedBy =
      i.origin === 'project' && (has('personal', 'skill', i.name) || has('personal', 'command', i.name))
        ? 'personal'
        : i.kind === 'command' && has(i.origin, 'skill', i.name)
          ? 'skill'
          : undefined
    return { ...i, state, ...(shadowedBy ? { shadowedBy } : {}) }
  })
}
