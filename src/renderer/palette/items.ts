import type { JiraIssue, MrLists, WorkspaceView } from '../../preload/api'
import type { Screen } from '../components/Rail'

export type ItemKind = 'screen' | 'action' | 'workspace' | 'mr' | 'task'

export interface PaletteItem {
  id: string
  kind: ItemKind
  label: string
  run: () => void
}

export const MAX_SHOWN = 50

export interface PaletteSources {
  t: (key: string) => string
  workspaces: WorkspaceView[]
  mrs: MrLists | null
  issues: JiraIssue[]
  go: (s: Screen) => void
  openWorkspace: (id: string) => void
  openMr: (url: string) => void
  startTask: (issue: JiraIssue) => void
  newWork: () => void
  newTask: () => void
  refreshMrs: () => void
  markAllRead: () => void
  tutorial: () => void
}

/** Screens, actions, workspaces, MRs, tasks: every item runs the handler its own control runs (W57). */
export function paletteItems(s: PaletteSources): PaletteItem[] {
  const { t } = s
  const screens: [Screen, string][] = [
    ['work', t('Trabajo')],
    ['tasks', t('Tareas')],
    ['mr', t('MR')],
    ['libretto', t('Libretto')],
    ['qa', t('QA')],
    ['avisos', t('Avisos')],
    ['skills', t('Skills')],
    ['settings', t('Ajustes')]
  ]
  const actions: [string, string, () => void][] = [
    ['new-work', t('Nuevo trabajo'), s.newWork],
    ['new-task', t('Nueva tarea'), s.newTask],
    ['refresh-mrs', t('Actualizar MR'), s.refreshMrs],
    ['mark-read', t('Marcar avisos leídos'), s.markAllRead],
    ['tutorial', t('Tutorial'), s.tutorial]
  ]
  const r = s.mrs
  // The same MR can sit in Mías and Sigo at once.
  const mrs = r ? [...new Map([...r.mine, ...r.review, ...r.following].map((m) => [m.url, m])).values()] : []
  return [
    ...screens.map(([id, label]): PaletteItem => ({ id: `screen:${id}`, kind: 'screen', label, run: () => s.go(id) })),
    ...actions.map(([id, label, run]): PaletteItem => ({ id: `action:${id}`, kind: 'action', label, run })),
    ...s.workspaces.map((w): PaletteItem => ({ id: `ws:${w.id}`, kind: 'workspace', label: `${w.branch} · ${w.repoId}`, run: () => s.openWorkspace(w.id) })),
    ...mrs.map((m): PaletteItem => ({ id: `mr:${m.url}`, kind: 'mr', label: `${m.title} · ${m.project}`, run: () => s.openMr(m.url) })),
    ...s.issues.map((i): PaletteItem => ({ id: `task:${i.key}`, kind: 'task', label: `${i.key} ${i.summary}`, run: () => s.startTask(i) }))
  ]
}

const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Every typed word must appear in the label, ignoring case and accents; at most 50 kept. */
export function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  return items.filter((i) => words.every((w) => fold(i.label).includes(w))).slice(0, MAX_SHOWN)
}
