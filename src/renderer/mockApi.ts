import { vi } from 'vitest'
import type { ActivityLine, SubagentEntry, SubagentLine, AddRepoResult, Aviso, FileChange, FlowBoxes, FlowDocs, ForgeId, ForgeStatus, Mode, MrDraft, MrDrafts, MrDraftsResult, MrFixCiResult, MrLists, MrMergeResult, MrPage, MrReply, MrScoreState, MrThreads, MrWork, NotifyPatch, RefineResult, NotifyPermission, SkillsList, NotifySettings, AgentState, StateProblem, QaBugResult, QaLaunchResult, QaManualRequest, QaMr, QaPublishResult, QaReport, QaResult, QaStatus, QaTargets, AtrilApi, RemoveResult, QuickAnswer, AgentWait, RadarHit, FlowStage, HistoryEntry, IdeaJiraResult, IdeaResult, LibrettoCounts, LibrettoState, JiraIssue, JiraSettingsStatus, MenuAction, NextItem, StartProposalResult, StartRequest, StartResult, RepoResult, RepoView, ToolReport, UiState, WorkCost, WorkspaceResult, WorkspaceView } from '../preload/api'

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
  /** The branch's changed files: only their lines feed the default total of flow.boxes. */
  changes?: FileChange[]
  /** What flow.boxes answers; without it, no boxes and the total of `changes`. */
  boxes?: FlowBoxes
  /** What flow.boxDiff answers. */
  boxDiff?: string
  /** Connected forges, by id; missing means not connected. */
  forges?: Partial<Record<ForgeId, ForgeStatus>>
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
  /** What status.wait answers per workspace id; missing means not waiting. */
  waits?: Record<string, AgentWait>
  /** What status.answer answers; missing means sent. */
  answer?: QuickAnswer
  /** Subagent entries per workspace id. */
  subagents?: Record<string, SubagentEntry[]>
  /** What radar.get answers; tests may mutate it between polls. Missing means no collisions. */
  radar?: Record<string, RadarHit[]>
  /** What cost.get answers per workspace id; missing means no transcript. */
  costs?: Record<string, WorkCost | null>
  /** What history.list answers, newest first. */
  history?: HistoryEntry[]
  /** What qa.status answers per workspace id; missing means an unclassified project. */
  qa?: Record<string, QaStatus | null>
  /** What qa.launch answers; by default it succeeds and the QA pane lives. */
  qaLaunch?: QaLaunchResult
  /** What qa.report answers per workspace id; missing means the workspace is gone. */
  qaReports?: Record<string, QaReport | null>
  /** What qa.retest answers; by default it succeeds. */
  qaRetest?: QaResult
  /** What qa.bug answers; by default Jira makes QA-1. */
  qaBug?: QaBugResult
  /** What qa.mrFor answers per workspace id; missing means no MR. */
  qaMrs?: Record<string, QaMr>
  /** What qa.publish answers; by default it reaches the workspace's MR. */
  qaPublish?: (id: string) => Promise<QaPublishResult>
  /** What subagents.log answers per subagent id. */
  subagentLogs?: Record<string, SubagentLine[]>
  /** What mr.list answers; missing means no forge connected. */
  mrs?: MrLists
  /** What refine.ask answers; a function answers per call; missing means three questions. */
  refine?: RefineResult | ((text: string) => Promise<RefineResult>)
  /** What mr.scoreOf answers per URL; missing means never scored. */
  scores?: Record<string, MrScoreState>
  /** What mr.threads answers per URL; missing means no threads. */
  threads?: Record<string, MrThreads>
  /** What mr.draftsOf answers per URL; missing means no review yet. The lens actions change it in place. */
  drafts?: Record<string, MrDrafts>
  /** What mr.review answers per URL (stored unless it is an error); missing means no findings. */
  review?: Record<string, MrDraftsResult>
  /** What mr.workFor answers per URL; missing means no registered repo. */
  work?: Record<string, MrWork>
  /** What mr.openWork answers per URL; missing means a new live workspace on branch «mr». */
  openWork?: Record<string, WorkspaceResult>
  /** What mr.page answers per URL; a function answers per call (it may throw); missing means an empty diff. */
  pages?: Record<string, MrPage | (() => Promise<MrPage>)>
  /** What mr.merge answers per URL; missing means merged. */
  merges?: Record<string, MrMergeResult | (() => Promise<MrMergeResult>)>
  /** What mr.ciAgent answers per URL (the agent's branch); missing means no agent. */
  ciAgents?: Record<string, string>
  /** What avisos.closable answers per notice id; missing means no work to close. */
  closable?: Record<string, string>
  /** The stored notices, newest first; markRead changes them in place. */
  avisos?: Aviso[]
  /** What libretto.state answers per repo id; missing means a repo without Libretto. */
  libretto?: Record<string, LibrettoState>
  /** What libretto.queue and libretto.start answer; missing means done (start opens a live workspace on feat/<name>). */
  librettoQueue?: { name: string } | { error: string }
  librettoStart?: WorkspaceResult
  /** The stored notification settings over the defaults; notify.set merges into them as main does (V8). */
  notify?: Partial<NotifySettings>
  /** What notify.permission answers; missing means «no lo sé». */
  notifyPermission?: NotifyPermission
  /** What settings.jira.status answers; missing means a saved token. */
  jira?: JiraSettingsStatus
  /** What the doctor answers; missing means every tool is installed. */
  doctor?: ToolReport[]
  /** What workspaces.remove answers per workspace id; missing means removed. */
  remove?: Record<string, RemoveResult>
  /** What workspaces.reopen answers per id; missing means reopened (the work turns alive). */
  reopen?: Record<string, WorkspaceResult>
  /** What workspaces.list answers when workspaces.json is damaged (W145). */
  wsProblem?: StateProblem
  /** What repos.list and setOverride answer when repos.json is damaged (S33). */
  reposProblem?: StateProblem
  /** What repos.remove answers per id; missing means removed. */
  removeRepo?: Record<string, RepoResult>
  /** What skills.list answers per repo id ('' without one), or a function of the repo id; missing means none. */
  skills?: Record<string, SkillsList> | ((repoId?: string) => Promise<SkillsList>)
  /** What repos.relocate answers per id; missing means found again (health turns ok). */
  relocateRepo?: Record<string, RepoResult | null>
}

// Loose on purpose: tests keep their own stubs, which may answer partial shapes or stub a member the
// API no longer has (term.input) to prove nobody calls it.
type DeepPartial<T> = { [K in keyof T]?: T[K] extends (...a: never[]) => unknown ? (...a: never[]) => unknown : DeepPartial<T[K]> } & Record<string, unknown>

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** `over` laid on `base`: objects merge, anything else (functions included) replaces. */
function merge(base: object, over: object): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(over)) {
    const was = out[k]
    out[k] = isPlain(v) && isPlain(was) ? merge(was, v) : v
  }
  return out
}

/** ui.json lives in `stored`; pass the same object to a second mock to simulate a restart.
 * `over` replaces single members of the full mock, for a test that needs its own stubs. */
export function mockApi(o: Options = {}, stored: UiState = { tutorialSeen: true, theme: 'auto', folded: {} }, over?: DeepPartial<AtrilApi>) {
  Object.assign(stored, o.ui)
  let menu: ((a: MenuAction) => void) | undefined
  let notified: ((id: string) => void) | undefined
  const stateListeners = new Set<(id: string, state: AgentState) => void>()
  const activityListeners = new Set<(id: string, lines: ActivityLine[]) => void>()
  const subagentListeners = new Set<(id: string, entries: SubagentEntry[]) => void>()
  const costListeners = new Set<(id: string, cost: WorkCost | null) => void>()
  const historyListeners = new Set<(entries: HistoryEntry[]) => void>()
  const flowListeners = new Set<(id: string, stage: FlowStage) => void>()
  const scoreListeners = new Set<(url: string, state: MrScoreState) => void>()
  const drafts = new Map(Object.entries(o.drafts ?? {}))
  const opened: WorkspaceView[] = []
  const gone = new Set<string>()
  const revived = new Set<string>()
  const reposGone = new Set<string>()
  const relocated = new Set<string>()
  const changeDrafts = (url: string, f: (d: MrDraft[]) => MrDraft[]): MrDraftsResult => {
    const next: MrDrafts = { ...(drafts.get(url) ?? { stale: false, canSend: false, drafts: [] }), drafts: [] }
    next.drafts = f(drafts.get(url)?.drafts ?? [])
    drafts.set(url, next)
    return next
  }
  const avisoListeners = new Set<(items: Aviso[]) => void>()
  let avisos = o.avisos ?? []
  const notifySettings: NotifySettings = {
    idleMinutes: 15,
    focus: true,
    group: true,
    quiet: { on: false, from: '19:00', to: '09:00', days: ['sat', 'sun'] },
    ...o.notify,
    types: { ask: 'mac', done: 'mac', stopped: 'mac', idle: 'list', radar: 'list', qa: 'mac', review: 'list', comment: 'list', ci: 'mac', cipass: 'list', merged: 'list', following: 'list', opened: 'list', quota: 'mac', ...o.notify?.types }
  }
  // The mock is a Spanish Mac: Sistema resolves to Spanish, as main would there.
  const withLang = (): UiState => ({ ...stored, folded: { ...stored.folded }, lang: stored.language === 'en' ? 'en' : 'es' })
  const ui = {
    get: vi.fn(async () => withLang()),
    set: vi.fn(async (p: Partial<UiState>) => {
      Object.assign(stored, p, { folded: { ...stored.folded, ...p.folded } }, p.bigDismissed && { bigDismissed: { ...stored.bigDismissed, ...p.bigDismissed } })
      return withLang()
    })
  }
  const off = (): void => {}
  const qa = new Map(Object.entries(o.qa ?? {}))
  const reports = new Map(Object.entries(o.qaReports ?? {}))
  const targetsOf = (id: string): QaTargets => {
    const r = reports.get(id)
    return { targets: r?.targets ?? [], chosen: r?.target?.key ?? null, note: r?.note ?? null }
  }
  const setLive = (id: string, live: boolean): void => {
    const q = qa.get(id)
    if (q) qa.set(id, { ...q, live })
  }
  const api = {
    ui,
    menu: {
      setState: vi.fn(),
      setNext: vi.fn(),
      setFocus: vi.fn(),
      setOverview: vi.fn(),
      setBig: vi.fn(),
      onAction: (cb: (a: MenuAction) => void) => {
        menu = cb
        return off
      }
    },
    doctor: async () => o.doctor ?? [],
    installTool: async () => ({ ok: true }),
    workspaces: {
      list: async () => o.wsProblem ? { problem: o.wsProblem } : [...(o.workspaces ?? []), ...opened].filter((w) => !gone.has(w.id)).map((w) => (revived.has(w.id) ? { ...w, alive: true } : w)),
      open: vi.fn(async (_repo: string, branch: string): Promise<WorkspaceResult> => ({ workspace: workspace('own00001', branch) })),
      remove: vi.fn(async (id: string): Promise<RemoveResult> => {
        const r = o.remove?.[id] ?? { ok: true }
        if ('ok' in r) gone.add(id)
        return r
      }),
      forget: vi.fn(async (id: string): Promise<RemoveResult> => {
        gone.add(id)
        return { ok: true }
      }),
      reopen: vi.fn(async (id: string): Promise<WorkspaceResult> => {
        const r = o.reopen?.[id] ?? { workspace: { ...(o.workspaces ?? []).find((w) => w.id === id)!, alive: true } }
        if ('workspace' in r) revived.add(id)
        return r
      }),
      terminal: vi.fn(async () => ({ ok: true as const }))
    },
    repos: {
      list: async () =>
        o.reposProblem ? { problem: o.reposProblem } : (o.repos ?? []).filter((r) => !reposGone.has(r.id)).map((r) => (relocated.has(r.id) ? { ...r, health: 'ok' as const } : r)),
      remove: vi.fn(async (id: string): Promise<RepoResult> => {
        const r = o.removeRepo?.[id] ?? { ok: true as const }
        if ('ok' in r) reposGone.add(id)
        return r
      }),
      relocate: vi.fn(async (id: string): Promise<RepoResult | null> => {
        const r = o.relocateRepo?.[id] === undefined ? { ok: true as const } : o.relocateRepo[id]
        if (r && 'ok' in r) relocated.add(id)
        return r
      }),
      add: vi.fn(async () => o.addRepo ?? null),
      addWithId: vi.fn(async (path: string, id: string): Promise<AddRepoResult> => ({ repo: { id, path, mode: 'worktree', reason: '', health: 'ok' } })),
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
      fixCi: vi.fn(async (url: string): Promise<MrFixCiResult> => (o.ciAgents?.[url] ? { sent: o.ciAgents[url]! } : { error: 'No hay un único trabajo de esta MR abierto en Atril.' })),
      page: vi.fn(async (url: string): Promise<MrPage> => {
        const p = o.pages?.[url]
        return typeof p === 'function' ? p() : (p ?? { files: [], reviewers: [] })
      }),
      merge: vi.fn(async (url: string): Promise<MrMergeResult> => {
        const r = o.merges?.[url]
        return typeof r === 'function' ? r() : (r ?? { merged: true })
      }),
      workFor: vi.fn(async (url: string): Promise<MrWork> => o.work?.[url] ?? { kind: 'none', reason: 'Añade el repo en Ajustes' }),
      openWork: vi.fn(async (url: string): Promise<WorkspaceResult> => {
        const r = o.openWork?.[url] ?? { workspace: workspace('mr', 'mr') }
        if ('workspace' in r) opened.push(r.workspace)
        return r
      })
    },
    notify: {
      get: vi.fn(async () => structuredClone(notifySettings)),
      set: vi.fn(async (p: NotifyPatch) => {
        Object.assign(notifySettings, { ...p, types: { ...notifySettings.types, ...p.types }, quiet: { ...notifySettings.quiet, ...p.quiet } })
        return structuredClone(notifySettings)
      }),
      test: vi.fn(async () => 'shown' as const),
      permission: vi.fn(async (): Promise<NotifyPermission> => o.notifyPermission ?? 'unknown'),
      openSystem: vi.fn(async () => undefined),
      onOpen: () => () => undefined
    },
    avisos: {
      list: vi.fn(async () => avisos),
      markRead: vi.fn(async (ids: string[] | 'all') => {
        avisos = avisos.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n))
        return avisos
      }),
      // As main does: the agent notices of that workspace are read and every window hears it.
      seen: vi.fn(async (id: string) => {
        avisos = avisos.map((n) => (n.workspaceId === id && ['ask', 'done', 'idle', 'agent'].includes(n.kind) ? { ...n, read: true } : n))
        avisoListeners.forEach((l) => l(avisos))
        return avisos
      }),
      closable: vi.fn(async (id: string) => o.closable?.[id] ?? null),
      onChange: (cb: (items: Aviso[]) => void) => {
        avisoListeners.add(cb)
        return () => avisoListeners.delete(cb)
      }
    },
    settings: {
      jira: { status: async () => o.jira ?? { saved: true, account: 'Pau Sánchez', site: 'https://x.atlassian.net' } },
      forge: {
        status: vi.fn(async (f: ForgeId): Promise<ForgeStatus> => o.forges?.[f] ?? { saved: false }),
        save: vi.fn(async () => ({ account: 'pau' })),
        delete: vi.fn(async () => undefined),
        openTokenPage: vi.fn(async () => undefined)
      }
    },
    status: {
      list: async () => o.states ?? {},
      wait: async (id: string) => o.waits?.[id] ?? null,
      compose: vi.fn(async (): Promise<QuickAnswer> => ({ ok: true })),
      answer: vi.fn(async (): Promise<QuickAnswer> => o.answer ?? { ok: true }),
      pause: vi.fn(async (): Promise<QuickAnswer> => ({ ok: true })),
      resume: vi.fn(async (): Promise<QuickAnswer> => ({ ok: true })),
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
    history: {
      list: async () => o.history ?? [],
      onChange: (cb: (entries: HistoryEntry[]) => void) => {
        historyListeners.add(cb)
        return () => historyListeners.delete(cb)
      }
    },
    radar: {
      get: vi.fn(async () => structuredClone(o.radar ?? {}))
    },
    cost: {
      get: async (id: string) => o.costs?.[id] ?? null,
      onChange: (cb: (id: string, cost: WorkCost | null) => void) => {
        costListeners.add(cb)
        return () => costListeners.delete(cb)
      }
    },
    qa: {
      status: vi.fn(async (id: string) => qa.get(id) ?? null),
      launch: vi.fn(async (id: string): Promise<QaLaunchResult> => {
        if (o.qaLaunch) return o.qaLaunch
        setLive(id, true)
        return { ok: true }
      }),
      stop: vi.fn(async (id: string): Promise<QaResult> => {
        setLive(id, false)
        return { ok: true }
      }),
      report: vi.fn(async (id: string) => reports.get(id) ?? null),
      retest: vi.fn(async (): Promise<QaResult> => o.qaRetest ?? { ok: true }),
      bug: vi.fn(async (): Promise<QaBugResult> => o.qaBug ?? { key: 'QA-1' }),
      // The choice is the repo's: every report listing that key opens on it.
      choose: vi.fn(async (id: string, key: string) => {
        for (const [w, r] of reports) {
          const found = r?.targets.find((x) => x.key === key)
          if (r && found) reports.set(w, { ...r, target: found })
        }
        return targetsOf(id)
      }),
      manual: vi.fn(async (id: string, req: QaManualRequest) => {
        const r = reports.get(id)
        const key = `${req.platform}:${req.dir}`
        if (r) reports.set(id, { ...r, targets: [...r.targets.filter((x) => x.key !== key), { key, ...req, why: 'Lo elegiste a mano', source: 'manual' }] })
        return targetsOf(id)
      }),
      unmanual: vi.fn(async (id: string, key: string) => {
        const r = reports.get(id)
        if (r) {
          const targets = r.targets.filter((x) => x.key !== key)
          reports.set(id, { ...r, targets, target: r.target?.key === key ? (targets[0] ?? null) : r.target })
        }
        return targetsOf(id)
      }),
      fix: vi.fn(async () => ({ ok: true as const })),
      mrFor: vi.fn(async (id: string): Promise<QaMr> => o.qaMrs?.[id] ?? null),
      publish: vi.fn(async (id: string): Promise<QaPublishResult> => (o.qaPublish ? o.qaPublish(id) : { url: o.qaMrs?.[id]?.url ?? '' }))
    },
    flow: {
      get: async (id: string | null) => (id && o.flows?.[id]) || o.flow || null,
      onChange: (cb: (id: string, stage: FlowStage) => void) => {
        flowListeners.add(cb)
        return () => flowListeners.delete(cb)
      },
      docs: vi.fn(async () => o.docs ?? null),
      save: vi.fn(async (): Promise<{ mtimeMs: number } | { error: string }> => ({ mtimeMs: 2 })),
      boxes: vi.fn(async (): Promise<FlowBoxes> => o.boxes ?? { boxes: [], total: (o.changes ?? []).reduce((n, f) => n + f.added + f.removed, 0) }),
      boxDiff: vi.fn(async () => o.boxDiff ?? '')
    },
    libretto: {
      state: vi.fn(async (id: string): Promise<LibrettoState> => o.libretto?.[id] ?? { none: true }),
      queue: vi.fn(async () => o.librettoQueue ?? { name: 'idea' }),
      start: vi.fn(async (_id: string, name: string): Promise<WorkspaceResult> => o.librettoStart ?? { workspace: workspace('lib00001', `feat/${name}`) }),
      repos: vi.fn(async (): Promise<Record<string, LibrettoCounts>> =>
        Object.fromEntries(
          (o.repos ?? []).map((r) => {
            const s = o.libretto?.[r.id]
            return [r.id, s && 'queued' in s ? { none: false, queued: s.queued.length, inFlight: s.inFlight.length } : { none: true, queued: 0, inFlight: 0 }]
          })
        )
      ),
      edit: vi.fn(async (): Promise<IdeaResult> => ({ ok: true })),
      drop: vi.fn(async (): Promise<IdeaResult> => ({ ok: true })),
      jira: vi.fn(async (): Promise<IdeaJiraResult> => ({ key: 'WEB-9' }))
    },
    usage: {
      get: async () => ({ fiveHour: { pct: 20, resetsAt: null }, sevenDay: { pct: 40, resetsAt: null } }),
      onChange: () => off,
      fix: vi.fn(async () => ({ ok: true as const }))
    },
    term: { onData: () => off, input: vi.fn(), attach: vi.fn(async () => ({ ok: true })), resize: vi.fn(), detach: vi.fn() },
    refine: {
      ask: vi.fn(async (text: string): Promise<RefineResult> =>
        typeof o.refine === 'function' ? o.refine(text) : (o.refine ?? { questions: ['¿Para quién es?', '¿Qué pasa si no hay datos?', '¿Hay un diseño?'] })
      )
    },
    skills: {
      list: vi.fn(async (repoId?: string): Promise<SkillsList> =>
        typeof o.skills === 'function' ? o.skills(repoId) : (o.skills?.[repoId ?? ''] ?? { items: [], warnings: [] })
      ),
      set: vi.fn(async (req: { repoId?: string }): Promise<SkillsList> =>
        typeof o.skills === 'function' ? o.skills(req.repoId) : (o.skills?.[req.repoId ?? ''] ?? { items: [], warnings: [] })
      ),
      reveal: vi.fn(async () => undefined)
    },
    revealState: vi.fn(async () => true),
    snapshotView: async () => null,
    snapshotWorkspace: async () => false
  } as unknown as AtrilApi
  window.atril = over ? (merge(api, over) as unknown as AtrilApi) : api
  const { menu: menuApi, jira, workspaces: ws, repos: reposApi, flow: flowApi, forge: forgeApi, mr: mrApi, avisos: avisosApi, status: statusApi, qa: qaApi, libretto: librettoApi, radar: radarApi, refine } = window.atril
  return { ui, qaApi, radarApi, setQa: (id: string, q: QaStatus | null) => qa.set(id, q), setReport: (id: string, r: QaReport | null) => reports.set(id, r), stored, menuApi, jira, ws, reposApi, flowApi, forgeApi, mrApi, avisosApi, statusApi, librettoApi, refine,
    pushAvisos: (items: Aviso[]) => {
      avisos = items
      avisoListeners.forEach((cb) => cb(items))
    }, menu: (a: MenuAction) => menu?.(a), clickNotification: (id: string) => notified?.(id),
    pushState: (id: string, state: AgentState) => stateListeners.forEach((cb) => cb(id, state)),
    pushActivity: (id: string, lines: ActivityLine[]) => activityListeners.forEach((cb) => cb(id, lines)),
    pushSubagents: (id: string, entries: SubagentEntry[]) => subagentListeners.forEach((cb) => cb(id, entries)),
    pushHistory: (entries: HistoryEntry[]) => historyListeners.forEach((cb) => cb(entries)),
    pushCost: (id: string, cost: WorkCost | null) => costListeners.forEach((cb) => cb(id, cost)),
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
