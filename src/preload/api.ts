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

export interface WorkspaceRecord {
  id: string
  repoId: string
  branch: string
  mode: Mode
  path: string
  baseCommit: string
  previousBranch?: string
  agent: Agent
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
  open(repoId: string, branch: string, agent: Agent): Promise<WorkspaceResult>
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
  project: string
  components: string[]
}

export type InboxResult =
  | { issues: JiraIssue[] }
  | { error: 'unconfigured'; message: string }
  | { error: 'missing'; install: string }
  | { error: 'failed'; message: string }

export interface JiraApi {
  inbox(): Promise<InboxResult>
}

export type AgentState = 'working' | 'needs-you' | 'stopped'

export interface StatusApi {
  list(): Promise<Record<string, AgentState>>
  /** Returns the unsubscribe function. */
  onChange(cb: (id: string, state: AgentState) => void): () => void
  /** A notification was clicked: select that workspace. */
  onOpen(cb: (id: string) => void): () => void
}

export interface AtrilApi {
  status: StatusApi
  doctor(): Promise<DoctorReport>
  repos: ReposApi
  workspaces: WorkspacesApi
  term: TermApi
  jira: JiraApi
  /** Dev snapshot only: the workspace to select on startup. */
  snapshotWorkspace(): Promise<boolean>
}
