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

export interface AtrilApi {
  doctor(): Promise<DoctorReport>
  repos: ReposApi
}
