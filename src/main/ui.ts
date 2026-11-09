import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Theme, UiState } from '../preload/api'
import { LANG_CHOICES, type LangChoice } from '../preload/i18n'
import { atrilHome } from './paths'

export const DEFAULT_UI: UiState = { tutorialSeen: false, theme: 'auto', folded: {}, language: 'system' }
const THEMES: readonly Theme[] = ['light', 'dark', 'auto']

const file = (): string => join(atrilHome(), 'ui.json')

function clean(raw: unknown): UiState {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const folded: Record<string, boolean> = {}
  if (typeof r['folded'] === 'object' && r['folded'] !== null) {
    for (const [k, v] of Object.entries(r['folded'])) if (typeof v === 'boolean') folded[k] = v
  }
  return {
    tutorialSeen: r['tutorialSeen'] === true,
    theme: THEMES.includes(r['theme'] as Theme) ? (r['theme'] as Theme) : DEFAULT_UI.theme,
    folded,
    language: LANG_CHOICES.includes(r['language'] as LangChoice) ? (r['language'] as LangChoice) : 'system'
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

/** `folded` merges key by key; every other field replaces. Unknown or invalid fields are dropped. */
export function patchUi(patch: unknown): Promise<UiState> {
  const next = queue.then(async () => {
    const current = await readUi()
    const p = clean({ ...current, ...(typeof patch === 'object' && patch !== null ? patch : {}) })
    const incoming = (patch as { folded?: unknown } | null)?.folded
    p.folded = { ...current.folded, ...clean({ folded: incoming }).folded }
    await mkdir(atrilHome(), { recursive: true })
    const tmp = `${file()}.tmp`
    await writeFile(tmp, JSON.stringify(p, null, 2))
    await rename(tmp, file())
    return p
  })
  queue = next.catch(() => undefined)
  return next
}
