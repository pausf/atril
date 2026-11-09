import type { Lang, LangChoice } from './i18n'
export interface ToolReport {
  tool: string
  ok: boolean
  version?: string
  problem?: string
  install: string
}

export type DoctorReport = ToolReport[]

export type Mode = 'worktree' | 'in-place'

export interface RepoView {
  id: string
  path: string
  mode: Mode
  reason: string
  override?: Mode
}

export type AddRepoResult =
  | { repo: RepoView }
  | { error: 'not-a-git-repo' }
  | { error: 'invalid-id' }
  | { error: 'id-taken'; suggested: string }

export interface ReposApi {
  list(): Promise<RepoView[]>
  /** Opens the folder picker in main; null when the person cancels. */
  add(): Promise<(AddRepoResult & { path: string }) | null>
  addWithId(path: string, id: string): Promise<AddRepoResult>
  setOverride(id: string, mode: Mode | null): Promise<RepoView[]>
}


export type Agent = 'claude'
export type Model = 'default' | 'opus' | 'sonnet' | 'haiku'

export interface WorkspaceRecord {
  id: string
  repoId: string
  branch: string
  mode: Mode
  path: string
  baseCommit: string
  previousBranch?: string
  agent: Agent
  model?: Model
  jiraKey?: string
  session: string
  paneId: string
}

export interface WorkspaceView extends WorkspaceRecord {
  alive: boolean
}

export type WorkspaceResult = { workspace: WorkspaceView } | { error: string }
export type RemoveResult = { ok: true } | { error: string }

export interface WorkspacesApi {
  list(): Promise<WorkspaceView[]>
  /** `task`: an own task's text; main turns it into the Libretto flow's request (W40). */
  open(repoId: string, branch: string, agent: Agent, model?: Model, task?: string): Promise<WorkspaceResult>
  remove(id: string): Promise<RemoveResult>
}

export interface TermApi {
  attach(id: string, cols: number, rows: number): Promise<void>
  input(id: string, data: string): void
  resize(id: string, cols: number, rows: number): void
  detach(id: string): void
  /** Returns the unsubscribe function. */
  onData(cb: (id: string, data: string) => void): () => void
}

export interface JiraIssue {
  key: string
  summary: string
  type: string
  status: string
  /** Jira's status id: what the picked board's columns list. */
  statusId: string
  project: string
  components: string[]
  group: 'todo' | 'doing' | 'review'
  /** Set when a workspace record carries this key. */
  workspaceId?: string
}

export interface StartIssue {
  key: string
  components: string[]
  group?: JiraIssue['group']
}

export interface StartProposal {
  repoId?: string
  branch?: string
  mode?: Mode
  reason?: string
  /** Why the branch is not the bare key. */
  note?: string
  /** The exact command line Start will run, built in main. */
  command: string
}
export type StartProposalResult = StartProposal | { error: string }

export interface StartRequest extends StartIssue {
  repoId: string
  branch: string
  model: Model
}
/** The workspace stays open when only the Jira transition failed. */
export type StartResult = { workspace: WorkspaceView; transitionError?: string } | { error: string }

/** One section of Tareas: a board column or a status category, already ordered and filtered in main. */
export interface InboxGroup {
  id: string
  title: string
  folded: boolean
  keys: string[]
}

export interface InboxNotice {
  text: string
  /** Shows a link that opens Ajustes. */
  settings?: boolean
}

export type InboxResult =
  | { issues: JiraIssue[]; groups: InboxGroup[]; notice?: InboxNotice }
  | { error: 'unconfigured'; message?: string }
  | { error: 'failed'; message: string }

export interface JiraApi {
  inbox(): Promise<InboxResult>
  proposeStart(issue: StartIssue, repoId?: string, model?: Model): Promise<StartProposalResult>
  start(req: StartRequest): Promise<StartResult>
}

export interface JiraSettingsStatus {
  saved: boolean
  account?: string
  site?: string
  /** data: URL, fetched by main. */
  avatar?: string
  board?: JiraBoard
}

export interface JiraBoard {
  id: number
  name: string
}

export type BoardSearchResult = Array<JiraBoard & { type: string }> | { error: string }

export type JiraSaveResult = { account: string } | { error: string }

/** Nothing here ever returns a token: it goes in once and never comes back. */
export interface SettingsApi {
  jira: {
    status(): Promise<JiraSettingsStatus>
    save(creds: { site: string; email: string; token: string }): Promise<JiraSaveResult>
    delete(): Promise<void>
    searchBoards(query: string): Promise<BoardSearchResult>
    /** null forgets the board. */
    pickBoard(board: JiraBoard | null): Promise<{ ok: true } | { error: string }>
  }
  /** Opens Atlassian's API token page in the default browser; nothing else. */
  openTokenPage(): Promise<void>
  /** S20, S25: GitHub and GitLab tokens; the window sees saved, account and site only. */
  forge: {
    status(forge: ForgeId): Promise<ForgeStatus>
    save(forge: ForgeId, creds: { site?: string; token: string }): Promise<{ account: string } | { error: string }>
    delete(forge: ForgeId): Promise<void>
    /** Opens the forge's new-token page with the scopes Atril needs. */
    openTokenPage(forge: ForgeId, site?: string): Promise<void>
  }
}

export type ForgeId = 'github' | 'gitlab'

export interface CreateRepoRequest {
  forge: ForgeId
  name: string
  description: string
  public: boolean
  /** The «Entiendo que cualquiera podrá verlo» tick; main refuses public without it. */
  confirmPublic?: boolean
}
export type CreateRepoResult =
  | { url: string; sshUrl: string; path: string; registered?: string; cloneError?: string; cloneCommand?: string }
  | { error: string }

export interface ForgeApi {
  /** W50, W51: creates the repo; with `clone`, clones it into that folder and registers it. */
  create(req: CreateRepoRequest, clone?: string): Promise<CreateRepoResult>
  /** Opens an https link in the browser; anything else is ignored. */
  open(url: string): Promise<void>
  /** The folder picker; null when cancelled. */
  pickFolder(): Promise<string | null>
}
/** M4: what a row shows as CI; a row whose details were not fetched has none (shown «—»). */
export type CiState = 'pass' | 'fail' | 'running' | 'none'

/** One MR row; foreign text (title, project, author) is shown as the forge sends it. Never a token. */
export interface MrItem {
  forge: ForgeId
  url: string
  title: string
  project: string
  author: string
  ci?: CiState
  /** GitHub only: GitLab's API gives no line counts per MR. */
  added?: number
  removed?: number
  files?: number
  /** ISO 8601. */
  updatedAt: string
  /** The head commit, when the listing knew it (M13). */
  head?: string
}

export type MrListName = 'mine' | 'review' | 'following'

export interface MrLists {
  /** Forges with a saved token; empty means nothing to list (M7). */
  connected: ForgeId[]
  mine: MrItem[]
  review: MrItem[]
  following: MrItem[]
  /** Per list, the forges that had more than the 50 rows shown (M8). */
  more: Record<MrListName, ForgeId[]>
  /** One per failing forge, already in the person's language (M6). */
  errors: Array<{ forge: ForgeId; text: string }>
}

export type MrSize = 'S' | 'M' | 'L' | 'XL'

/** M10: what Atril measures from the diff alone, without Claude. */
export interface MrMetrics {
  added: number
  removed: number
  files: number
  tests: boolean
  size: MrSize
}

/** M11: Claude's view, as its schema allows it. Never translated. */
export interface MrAiScore {
  difficulty: number
  risk: number
  what: string
  why: string
  where: string[]
}

/** M13: one score, kept per MR and head commit. */
export interface MrScore {
  head?: string
  metrics: MrMetrics
  ai: MrAiScore
  /** The language Claude answered in. */
  lang: Lang
  /** KB, when the diff Claude saw was cut (M15). */
  cut?: { seen: number; total: number }
  /** ISO 8601. */
  at: string
}

export type MrScoreState =
  | { state: 'none' }
  | { state: 'queued' }
  | { state: 'running' }
  | { state: 'done'; score: MrScore }
  | { state: 'error'; text: string }

export interface MrApi {
  list(): Promise<MrLists>
  /** Opens an MR of the latest listing in the browser; anything else is ignored (W52). */
  open(url: string): Promise<void>
  /** Queues a score for an MR of Mías or Me toca revisar; resolves when it is done (M14, M17). */
  score(url: string): Promise<MrScoreState>
  /** The state of each URL: queued, running, stored or failed. */
  scoreOf(urls: string[]): Promise<Record<string, MrScoreState>>
  onScoreChange(cb: (url: string, state: MrScoreState) => void): () => void
}

export type ForgeStatus = { saved: false } | { saved: true; account?: string; site?: string }

export type AgentState = 'working' | 'needs-you' | 'stopped'

export interface StatusApi {
  list(): Promise<Record<string, AgentState>>
  /** Returns the unsubscribe function. */
  onChange(cb: (id: string, state: AgentState) => void): () => void
  /** A notification was clicked: select that workspace. */
  onOpen(cb: (id: string) => void): () => void
}

export type ActivityKind = 'prompt' | 'read' | 'edit' | 'run' | 'fail' | 'search' | 'agent' | 'tool' | 'says' | 'asks'

export interface ActivityLine {
  /** Epoch seconds. */
  at: number
  kind: ActivityKind
  text: string
}

export interface ActivityApi {
  /** Newest first. */
  get(workspaceId: string): Promise<ActivityLine[]>
  /** The newest line of every workspace that has one. */
  latest(): Promise<Record<string, ActivityLine>>
  /** Returns the unsubscribe function; `lines` is newest first. */
  onChange(cb: (workspaceId: string, lines: ActivityLine[]) => void): () => void
}

export type StageName = 'sin-libretto' | 'entrada' | 'spec' | 'plan' | 'construir' | 'terminado' | 'aterrizado'

export interface Checklist {
  file: string
  total: number
  closed: number
  firstOpen?: string
}

export interface FlowStage {
  stage: StageName
  change?: string
  others: string[]
  checklist?: Checklist
}

export interface FlowDoc {
  name: string
  text: string
  mtimeMs: number
}

export interface FileChange {
  path: string
  status: 'A' | 'M' | 'D'
  added: number
  removed: number
}

export interface FlowDocs {
  change: string
  files: FlowDoc[]
}

export interface FlowApi {
  /** Also starts watching that workspace (and stops watching any other); null stops all. */
  get(workspaceId: string | null): Promise<FlowStage | null>
  /** Returns the unsubscribe function. */
  onChange(cb: (workspaceId: string, stage: FlowStage) => void): () => void
  /** The current change's proposal.md and spec-*.md (F13). */
  docs(workspaceId: string): Promise<FlowDocs | null>
  /** F16: main re-reads the agent state and the file's mtime before writing. */
  save(workspaceId: string, change: string, name: string, text: string, mtimeMs: number): Promise<{ mtimeMs: number } | { error: string }>
  /** F18: files changed against the workspace's base. */
  changes(workspaceId: string): Promise<FileChange[]>
  /** F19: the diff of one file from that list; empty for anything else. */
  diff(workspaceId: string, path: string): Promise<string>
}

export interface UsageWindow {
  pct: number
  /** ISO timestamp, null when the endpoint omits it. */
  resetsAt: string | null
}

export type UsageResult =
  | { fiveHour: UsageWindow; sevenDay: UsageWindow; /** Set when the latest read failed: these values are from `since`. */ stale?: { since: number } }
  | { error: string }

export interface UsageApi {
  get(): Promise<UsageResult>
  /** Returns the unsubscribe function. */
  onChange(cb: (u: UsageResult) => void): () => void
}

/** One entry of «Qué me toca», already ordered by main. */
export type NextItem = { kind: 'agent'; id: string } | { kind: 'task'; key: string }

export interface NextUpApi {
  get(): Promise<NextItem[]>
  /** Returns the unsubscribe function. */
  onChange(cb: (items: NextItem[]) => void): () => void
}

export type MenuAction =
  | { kind: 'focus'; target: 'sidebar' | 'flow' }
  | { kind: 'next' }
  | { kind: 'select'; index: number }
  | { kind: 'tutorial' }

export type Theme = 'light' | 'dark' | 'auto'

/** What the app remembers about itself in ~/.atril/ui.json. */
export interface UiState {
  tutorialSeen: boolean
  theme: Theme
  /** Section id to folded; a missing id means the section's own default. */
  folded: Record<string, boolean>
  /** The person's choice (S14); missing reads as Sistema. */
  language?: LangChoice
  /** The language main resolved from it; main sets it, the window only reads it (W48). */
  lang?: Lang
}

export interface UiApi {
  get(): Promise<UiState>
  /** `folded` merges key by key; returns the stored state. */
  set(patch: Partial<UiState>): Promise<UiState>
}

export interface MenuApi {
  /** Tells main which workspace the menu's split items act on, and how many exist. */
  setState(selected: string | null, count: number): void
  /** Whether «Siguiente» (⌘↩) is enabled: Trabajo or Tareas shown and something waiting. */
  setNext(enabled: boolean): void
  /** Returns the unsubscribe function. */
  onAction(cb: (a: MenuAction) => void): () => void
}

export interface AtrilApi {
  menu: MenuApi
  ui: UiApi
  usage: UsageApi
  flow: FlowApi
  forge: ForgeApi
  mr: MrApi
  status: StatusApi
  nextup: NextUpApi
  activity: ActivityApi
  doctor(): Promise<DoctorReport>
  repos: ReposApi
  workspaces: WorkspacesApi
  term: TermApi
  jira: JiraApi
  settings: SettingsApi
  /** Dev snapshot only: the workspace to select on startup. */
  snapshotWorkspace(): Promise<boolean>
  /** Dev snapshot only: the screen to show on startup. */
  snapshotView(): Promise<string | null>
}
