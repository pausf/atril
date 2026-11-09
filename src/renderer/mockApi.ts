import { vi } from 'vitest'
import type { AgentState, AtrilApi, FlowStage, JiraIssue, MenuAction, RepoView, UiState, WorkspaceView } from '../preload/api'

export const workspace = (id: string, branch: string, alive = true): WorkspaceView => ({
  id,
  repoId: 'web',
  branch,
  mode: 'worktree',
  path: `/tmp/${id}`,
  baseCommit: 'abc',
  agent: 'claude',
  session: `atril-${id}`,
  paneId: '%1',
  alive
})

export const issue = (key: string, group: JiraIssue['group'], summary = `Resumen de ${key}`): JiraIssue => ({
  key,
  summary,
  type: 'Story',
  status: group === 'todo' ? 'To Do' : group === 'doing' ? 'In Progress' : 'Code Review',
  project: 'PF',
  components: [],
  group
})

interface Options {
  ui?: Partial<UiState>
  workspaces?: WorkspaceView[]
  states?: Record<string, AgentState>
  issues?: JiraIssue[]
  repos?: RepoView[]
  flow?: FlowStage
}

/** ui.json lives in `stored`; pass the same object to a second mock to simulate a restart. */
export function mockApi(o: Options = {}, stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }) {
  Object.assign(stored, o.ui)
  let menu: ((a: MenuAction) => void) | undefined
  const ui = {
    get: vi.fn(async () => ({ ...stored, folded: { ...stored.folded } })),
    set: vi.fn(async (p: Partial<UiState>) => {
      Object.assign(stored, p, { folded: { ...stored.folded, ...p.folded } })
      return { ...stored }
    })
  }
  const off = (): void => {}
  window.atril = {
    ui,
    menu: {
      setState: vi.fn(),
      onAction: (cb: (a: MenuAction) => void) => {
        menu = cb
        return off
      }
    },
    doctor: async () => [],
    workspaces: { list: async () => o.workspaces ?? [] },
    repos: { list: async () => o.repos ?? [] },
    jira: { inbox: async () => ({ issues: o.issues ?? [] }) },
    settings: { jira: { status: async () => ({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' }) } },
    status: { list: async () => o.states ?? {}, onChange: () => off, onOpen: () => off },
    flow: { get: async () => o.flow ?? null, onChange: () => off },
    usage: {
      get: async () => ({ fiveHour: { pct: 20, resetsAt: null }, sevenDay: { pct: 40, resetsAt: null } }),
      onChange: () => off
    },
    snapshotView: async () => null,
    snapshotWorkspace: async () => false
  } as unknown as AtrilApi
  return { ui, stored, menu: (a: MenuAction) => menu?.(a) }
}

/** jsdom has no matchMedia: this one reports `dark` and fires `change` like the system does. */
export function mockSystemTheme(dark: boolean): { setDark(v: boolean): void } {
  let isDark = dark
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  window.matchMedia = ((q: string) => ({
    get matches() {
      return isDark
    },
    media: q,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb)
  })) as unknown as typeof window.matchMedia
  return {
    setDark(v) {
      isDark = v
      listeners.forEach((cb) => cb({ matches: v } as MediaQueryListEvent))
    }
  }
}
