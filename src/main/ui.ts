import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Palette, Theme, UiState } from '../preload/api'
import { LANG_CHOICES, type LangChoice } from '../preload/i18n'
import { atrilHome } from './paths'

export const DEFAULT_UI: UiState = { tutorialSeen: false, theme: 'auto', folded: {}, language: 'system', palette: 'original' }
const THEMES: readonly Theme[] = ['light', 'dark', 'auto']
const PALETTES: readonly Palette[] = ['original', 'grafito']

const file = (): string => join(atrilHome(), 'ui.json')

function clean(raw: unknown): UiState {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const folded: Record<string, boolean> = {}
  if (typeof r['folded'] === 'object' && r['folded'] !== null) {
    for (const [k, v] of Object.entries(r['folded'])) if (typeof v === 'boolean') folded[k] = v
  }
  const big: Record<string, number> = {}
  if (typeof r['bigDismissed'] === 'object' && r['bigDismissed'] !== null) {
    for (const [k, v] of Object.entries(r['bigDismissed'])) if (Number.isInteger(v) && (v as number) > 0) big[k] = v as number
  }
  return {
    tutorialSeen: r['tutorialSeen'] === true,
    theme: THEMES.includes(r['theme'] as Theme) ? (r['theme'] as Theme) : DEFAULT_UI.theme,
    folded,
    language: LANG_CHOICES.includes(r['language'] as LangChoice) ? (r['language'] as LangChoice) : 'system',
    palette: PALETTES.includes(r['palette'] as Palette) ? (r['palette'] as Palette) : 'original',
    ...(r['setupDismissed'] === true ? { setupDismissed: true } : {}),
    ...(r['skillsWriteOk'] === true ? { skillsWriteOk: true as const } : {}),
    ...(typeof r['librettoRepo'] === 'string' && r['librettoRepo'] !== '' ? { librettoRepo: r['librettoRepo'] } : {}),
    ...(Object.keys(big).length > 0 ? { bigDismissed: big } : {})
  }
}

export async function readUi(): Promise<UiState> {
  try {
    return clean(JSON.parse(await readFile(file(), 'utf8')))
  } catch {
    return { ...DEFAULT_UI, folded: {} }
  }
}

// Patches are serialised: two quick fold clicks must not overwrite each other.
let queue: Promise<unknown> = Promise.resolve()

/** `folded` and `bigDismissed` merge key by key; every other field replaces. Unknown or invalid fields are dropped. */
export function patchUi(patch: unknown): Promise<UiState> {
  const next = queue.then(async () => {
    const current = await readUi()
    const p = clean({ ...current, ...(typeof patch === 'object' && patch !== null ? patch : {}) })
    const incoming = (patch as { folded?: unknown } | null)?.folded
    p.folded = { ...current.folded, ...clean({ folded: incoming }).folded }
    const big = { ...current.bigDismissed, ...clean({ bigDismissed: (patch as { bigDismissed?: unknown } | null)?.bigDismissed }).bigDismissed }
    if (Object.keys(big).length > 0) p.bigDismissed = big
    await mkdir(atrilHome(), { recursive: true })
    const tmp = `${file()}.tmp`
    await writeFile(tmp, JSON.stringify(p, null, 2))
    await rename(tmp, file())
    return p
  })
  queue = next.catch(() => undefined)
  return next
}
