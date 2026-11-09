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
}

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
