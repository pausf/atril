import { vi } from 'vitest'
import type { ActivityLine, AddRepoResult, FlowDocs, Mode, AgentState, AtrilApi, FlowStage, JiraIssue, MenuAction, NextItem, StartProposalResult, StartRequest, StartResult, RepoView, UiState, WorkspaceResult, WorkspaceView } from '../preload/api'

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
  statusId: group,
  project: 'PF',
  components: [],
  group
})

interface Options {
  ui?: Partial<UiState>
  workspaces?: WorkspaceView[]
  states?: Record<string, AgentState>
  issues?: JiraIssue[]
  /** Jira not connected: the inbox answers «unconfigured» (I3). */
  noJira?: boolean
  /** What flow.docs answers; tests mutate it and call pushFlow to simulate the agent writing. */
  docs?: FlowDocs | null
  /** What the folder picker answers when the person adds a repo. */
  addRepo?: (AddRepoResult & { path: string }) | null
  repos?: RepoView[]
  nextup?: NextItem[]
  /** What proposeStart answers; start answers with a workspace named after the key. */
  proposal?: StartProposalResult
  flow?: FlowStage
  /** Newest first, per workspace id. */
  activity?: Record<string, ActivityLine[]>
}

/** ui.json lives in `stored`; pass the same object to a second mock to simulate a restart. */
export function mockApi(o: Options = {}, stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }) {
  Object.assign(stored, o.ui)
  let menu: ((a: MenuAction) => void) | undefined
  let notified: ((id: string) => void) | undefined
  const activityListeners = new Set<(id: string, lines: ActivityLine[]) => void>()
  const flowListeners = new Set<(id: string, stage: FlowStage) => void>()
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
      setNext: vi.fn(),
      onAction: (cb: (a: MenuAction) => void) => {
        menu = cb
        return off
      }
    },
    doctor: async () => [],
    workspaces: {
      list: async () => o.workspaces ?? [],
      open: vi.fn(async (_repo: string, branch: string): Promise<WorkspaceResult> => ({ workspace: workspace('own00001', branch) }))
    },
    repos: {
      list: async () => o.repos ?? [],
      add: vi.fn(async () => o.addRepo ?? null),
      addWithId: vi.fn(async (path: string, id: string): Promise<AddRepoResult> => ({ repo: { id, path, mode: 'worktree', reason: '' } })),
      setOverride: vi.fn(async (id: string, mode: Mode | null): Promise<RepoView[]> =>
        (o.repos ?? []).map((r) => (r.id === id ? { ...r, ...(mode ? { override: mode } : { override: undefined }) } : r))
      )
    },
    nextup: { get: async () => o.nextup ?? [], onChange: () => off },
    jira: {
      proposeStart: vi.fn(async () => o.proposal ?? { command: 'claude' }),
      start: vi.fn(async (req: StartRequest): Promise<StartResult> => ({ workspace: workspace('started1', req.branch) })),
      inbox: async () => {
        if (o.noJira) return { error: 'unconfigured' }
        const issues = o.issues ?? []
        const titles = { todo: 'Por empezar', doing: 'En curso', review: 'En revisión y despliegue' }
        const groups = (['todo', 'doing', 'review'] as const).map((id) => ({ id, title: titles[id], folded: id === 'review', keys: issues.filter((i) => i.group === id).map((i) => i.key) }))
        return { issues, groups: groups.filter((g) => g.keys.length > 0) }
      }
    },
    settings: { jira: { status: async () => ({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' }) } },
    status: {
      list: async () => o.states ?? {},
      onChange: () => off,
      onOpen: (cb: (id: string) => void) => {
        notified = cb
        return off
      }
    },
    activity: {
      get: async (id: string) => o.activity?.[id] ?? [],
      latest: async () => Object.fromEntries(Object.entries(o.activity ?? {}).flatMap(([id, l]) => (l[0] ? [[id, l[0]]] : []))),
      onChange: (cb: (id: string, lines: ActivityLine[]) => void) => {
        activityListeners.add(cb)
        return () => activityListeners.delete(cb)
      }
    },
    flow: {
      get: async () => o.flow ?? null,
      onChange: (cb: (id: string, stage: FlowStage) => void) => {
        flowListeners.add(cb)
        return () => flowListeners.delete(cb)
      },
      docs: vi.fn(async () => o.docs ?? null),
      save: vi.fn(async (): Promise<{ mtimeMs: number } | { error: string }> => ({ mtimeMs: 2 }))
    },
    usage: {
      get: async () => ({ fiveHour: { pct: 20, resetsAt: null }, sevenDay: { pct: 40, resetsAt: null } }),
      onChange: () => off
    },
    term: { onData: () => off, input: vi.fn(), attach: vi.fn(async () => undefined), resize: vi.fn(), detach: vi.fn() },
    snapshotView: async () => null,
    snapshotWorkspace: async () => false
  } as unknown as AtrilApi
  const { menu: menuApi, jira, workspaces: ws, repos: reposApi, flow: flowApi } = window.atril
  return { ui, stored, menuApi, jira, ws, reposApi, flowApi, menu: (a: MenuAction) => menu?.(a), clickNotification: (id: string) => notified?.(id),
    pushActivity: (id: string, lines: ActivityLine[]) => activityListeners.forEach((cb) => cb(id, lines)),
    pushFlow: (id: string, stage: FlowStage) => flowListeners.forEach((cb) => cb(id, stage))
  }
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
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    // xterm.js still uses the legacy API.
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb)
  })) as unknown as typeof window.matchMedia
  return {
    setDark(v) {
      isDark = v
      listeners.forEach((cb) => cb({ matches: v } as MediaQueryListEvent))
    }
  }
}
