import { vi } from 'vitest'
import type { ActivityLine, SubagentEntry, SubagentLine, AddRepoResult, Aviso, FileChange, FlowDocs, ForgeId, ForgeStatus, Mode, MrDraft, MrDrafts, MrDraftsResult, MrFixCiResult, MrLists, MrReply, MrScoreState, MrThreads, AgentState, AtrilApi, QuickAnswer, QuickReplies, FlowStage, JiraIssue, MenuAction, NextItem, StartProposalResult, StartRequest, StartResult, RepoView, ToolReport, UiState, WorkspaceResult, WorkspaceView } from '../preload/api'

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
  changes?: FileChange[]
  /** Connected forges, by id; missing means not connected. */
  forges?: Partial<Record<ForgeId, ForgeStatus>>
  diff?: string
  /** What the folder picker answers when the person adds a repo. */
  addRepo?: (AddRepoResult & { path: string }) | null
  repos?: RepoView[]
  nextup?: NextItem[]
  /** What proposeStart answers; start answers with a workspace named after the key. */
  proposal?: StartProposalResult
  flow?: FlowStage
  /** What flow.get answers per workspace id; missing falls back to `flow`. */
  flows?: Record<string, FlowStage>
  /** Newest first, per workspace id. */
  activity?: Record<string, ActivityLine[]>
  /** What status.quickReplies answers per workspace id; missing means no options. */
  quickReplies?: Record<string, QuickReplies>
  /** What status.answer answers; missing means sent. */
  answer?: QuickAnswer
  /** Subagent entries per workspace id. */
  subagents?: Record<string, SubagentEntry[]>
  /** What subagents.log answers per subagent id. */
  subagentLogs?: Record<string, SubagentLine[]>
  /** What mr.list answers; missing means no forge connected. */
  mrs?: MrLists
  /** What mr.scoreOf answers per URL; missing means never scored. */
  scores?: Record<string, MrScoreState>
  /** What mr.threads answers per URL; missing means no threads. */
  threads?: Record<string, MrThreads>
  /** What mr.draftsOf answers per URL; missing means no review yet. The lens actions change it in place. */
  drafts?: Record<string, MrDrafts>
  /** What mr.review answers per URL (stored unless it is an error); missing means no findings. */
  review?: Record<string, MrDraftsResult>
  /** What mr.ciAgent answers per URL (the agent's branch); missing means no agent. */
  ciAgents?: Record<string, string>
  /** The stored notices, newest first; markRead changes them in place. */
  avisos?: Aviso[]
  /** What the doctor answers; missing means every tool is installed. */
  doctor?: ToolReport[]
}

/** ui.json lives in `stored`; pass the same object to a second mock to simulate a restart. */
export function mockApi(o: Options = {}, stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }) {
  Object.assign(stored, o.ui)
  let menu: ((a: MenuAction) => void) | undefined
  let notified: ((id: string) => void) | undefined
  const stateListeners = new Set<(id: string, state: AgentState) => void>()
  const activityListeners = new Set<(id: string, lines: ActivityLine[]) => void>()
  const subagentListeners = new Set<(id: string, entries: SubagentEntry[]) => void>()
  const flowListeners = new Set<(id: string, stage: FlowStage) => void>()
  const scoreListeners = new Set<(url: string, state: MrScoreState) => void>()
  const drafts = new Map(Object.entries(o.drafts ?? {}))
  const changeDrafts = (url: string, f: (d: MrDraft[]) => MrDraft[]): MrDraftsResult => {
    const next: MrDrafts = { ...(drafts.get(url) ?? { stale: false, canSend: false, drafts: [] }), drafts: [] }
    next.drafts = f(drafts.get(url)?.drafts ?? [])
    drafts.set(url, next)
    return next
  }
  const avisoListeners = new Set<(items: Aviso[]) => void>()
  let avisos = o.avisos ?? []
  // The mock is a Spanish Mac: Sistema resolves to Spanish, as main would there.
  const withLang = (): UiState => ({ ...stored, folded: { ...stored.folded }, lang: stored.language === 'en' ? 'en' : 'es' })
  const ui = {
    get: vi.fn(async () => withLang()),
    set: vi.fn(async (p: Partial<UiState>) => {
      Object.assign(stored, p, { folded: { ...stored.folded, ...p.folded } })
      return withLang()
    })
  }
  const off = (): void => {}
  window.atril = {
    ui,
    menu: {
      setState: vi.fn(),
      setNext: vi.fn(),
      setFocus: vi.fn(),
      setOverview: vi.fn(),
      onAction: (cb: (a: MenuAction) => void) => {
        menu = cb
        return off
      }
    },
    doctor: async () => o.doctor ?? [],
    installTool: async () => ({ ok: true }),
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
    forge: {
      create: vi.fn(async (req: { name: string; forge: ForgeId }) => ({ url: `https://${req.forge}.com/pau/${req.name}`, sshUrl: `git@x:pau/${req.name}.git`, path: req.name })),
      open: vi.fn(async () => undefined),
      pickFolder: vi.fn(async () => '/Users/pau/gitrepos')
    },
    mr: {
      list: vi.fn(async (): Promise<MrLists> => o.mrs ?? { connected: [], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [] }),
      open: vi.fn(async () => undefined),
      score: vi.fn(async (): Promise<MrScoreState> => ({ state: 'queued' })),
      scoreOf: vi.fn(async (urls: string[]) => Object.fromEntries(urls.map((u) => [u, o.scores?.[u] ?? { state: 'none' }]))),
      onScoreChange: (cb: (url: string, state: MrScoreState) => void) => {
        scoreListeners.add(cb)
        return () => scoreListeners.delete(cb)
      },
      threads: vi.fn(async (url: string): Promise<MrThreads> => o.threads?.[url] ?? { threads: [], more: false }),
      reply: vi.fn(async (_url: string, _id: string, body: string): Promise<MrReply> => ({ comment: { id: 'new', author: 'pau', at: new Date().toISOString(), body } })),
      review: vi.fn(async (url: string): Promise<MrDraftsResult> => {
        const r = o.review?.[url] ?? { head: 'h1', stale: false, canSend: false, drafts: [] }
        if (!('error' in r)) drafts.set(url, r)
        return r
      }),
      draftsOf: vi.fn(async (url: string): Promise<MrDraftsResult> => drafts.get(url) ?? { stale: false, canSend: false, drafts: [] }),
      publishDraft: vi.fn(async (url: string, id: string) => changeDrafts(url, (ds) => ds.map((d) => (d.id === id ? { ...d, state: 'published' as const } : d)))),
      sendDraft: vi.fn(async (url: string, id: string) => changeDrafts(url, (ds) => ds.map((d) => (d.id === id ? { ...d, state: 'sent' as const } : d)))),
      discardDraft: vi.fn(async (url: string, id: string) => changeDrafts(url, (ds) => ds.filter((d) => d.id !== id))),
      ciAgent: vi.fn(async (url: string): Promise<string | null> => o.ciAgents?.[url] ?? null),
      fixCi: vi.fn(async (url: string): Promise<MrFixCiResult> => (o.ciAgents?.[url] ? { sent: o.ciAgents[url]! } : { error: 'No hay un único trabajo de esta MR abierto en Atril.' }))
    },
    avisos: {
      list: vi.fn(async () => avisos),
      markRead: vi.fn(async (ids: string[] | 'all') => {
        avisos = avisos.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n))
        return avisos
      }),
      onChange: (cb: (items: Aviso[]) => void) => {
        avisoListeners.add(cb)
        return () => avisoListeners.delete(cb)
      }
    },
    settings: {
      jira: { status: async () => ({ saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' }) },
      forge: {
        status: vi.fn(async (f: ForgeId): Promise<ForgeStatus> => o.forges?.[f] ?? { saved: false }),
        save: vi.fn(async () => ({ account: 'pau' })),
        delete: vi.fn(async () => undefined),
        openTokenPage: vi.fn(async () => undefined)
      }
    },
    status: {
      list: async () => o.states ?? {},
      quickReplies: async (id: string) => o.quickReplies?.[id] ?? { options: [], multiSelect: false },
      answer: vi.fn(async (): Promise<QuickAnswer> => o.answer ?? { ok: true }),
      onChange: (cb: (id: string, state: AgentState) => void) => {
        stateListeners.add(cb)
        return () => stateListeners.delete(cb)
      },
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
    subagents: {
      get: async (id: string) => o.subagents?.[id] ?? [],
      log: async (_id: string, agentId: string) => o.subagentLogs?.[agentId] ?? [],
      onChange: (cb: (id: string, entries: SubagentEntry[]) => void) => {
        subagentListeners.add(cb)
        return () => subagentListeners.delete(cb)
      }
    },
    flow: {
      get: async (id: string | null) => (id && o.flows?.[id]) || o.flow || null,
      onChange: (cb: (id: string, stage: FlowStage) => void) => {
        flowListeners.add(cb)
        return () => flowListeners.delete(cb)
      },
      docs: vi.fn(async () => o.docs ?? null),
      save: vi.fn(async (): Promise<{ mtimeMs: number } | { error: string }> => ({ mtimeMs: 2 })),
      changes: vi.fn(async () => o.changes ?? []),
      diff: vi.fn(async () => o.diff ?? '')
    },
    usage: {
      get: async () => ({ fiveHour: { pct: 20, resetsAt: null }, sevenDay: { pct: 40, resetsAt: null } }),
      onChange: () => off
    },
    term: { onData: () => off, input: vi.fn(), attach: vi.fn(async () => undefined), resize: vi.fn(), detach: vi.fn() },
    snapshotView: async () => null,
    snapshotWorkspace: async () => false
  } as unknown as AtrilApi
  const { menu: menuApi, jira, workspaces: ws, repos: reposApi, flow: flowApi, forge: forgeApi, mr: mrApi, avisos: avisosApi, status: statusApi } = window.atril
  return { ui, stored, menuApi, jira, ws, reposApi, flowApi, forgeApi, mrApi, avisosApi, statusApi,
    pushAvisos: (items: Aviso[]) => {
      avisos = items
      avisoListeners.forEach((cb) => cb(items))
    }, menu: (a: MenuAction) => menu?.(a), clickNotification: (id: string) => notified?.(id),
    pushState: (id: string, state: AgentState) => stateListeners.forEach((cb) => cb(id, state)),
    pushActivity: (id: string, lines: ActivityLine[]) => activityListeners.forEach((cb) => cb(id, lines)),
    pushSubagents: (id: string, entries: SubagentEntry[]) => subagentListeners.forEach((cb) => cb(id, entries)),
    pushFlow: (id: string, stage: FlowStage) => flowListeners.forEach((cb) => cb(id, stage)),
    pushScore: (url: string, state: MrScoreState) => scoreListeners.forEach((cb) => cb(url, state))
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
