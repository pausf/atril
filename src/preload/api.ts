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

/** W154: `missing` the folder is gone, `not-git` git says it is not a repo. */
export type RepoHealth = 'ok' | 'missing' | 'not-git'

export interface RepoView {
  id: string
  path: string
  mode: Mode
  reason: string
  override?: Mode
  health: RepoHealth
}

/** W144/W148: Atril's two state files; the window names one to reveal, never a path. */
export type StateFile = 'workspaces' | 'repos'
/** A state file that exists but cannot be used: nothing is written over it until the person fixes it. */
export interface StateProblem {
  error: string
  detail: string
  fix: 'reveal'
  file: StateFile
}
export type Listed<T> = T[] | { problem: StateProblem }

export type AddRepoResult =
  | { repo: RepoView }
  | StateProblem
  | { error: 'not-a-git-repo' }
  | { error: 'invalid-id' }
  | { error: 'id-taken'; suggested: string }

export interface ReposApi {
  list(): Promise<Listed<RepoView>>
  /** Opens the folder picker in main; null when the person cancels. */
  add(): Promise<(AddRepoResult & { path: string }) | null>
  addWithId(path: string, id: string): Promise<AddRepoResult>
  setOverride(id: string, mode: Mode | null): Promise<Listed<RepoView>>
  /** W157: forgets the repo; its folder is never touched. */
  remove(id: string): Promise<RepoResult>
  /** W158: main opens the folder picker; null when the person cancels. */
  relocate(id: string): Promise<RepoResult | null>
}

export type RepoResult = { ok: true } | { error: string } | StateProblem


export type Agent = 'claude'
export type Model = 'default' | 'opus' | 'sonnet' | 'haiku'
/** Claude Code's `--effort`; 'default' adds no flag (W137). */
export type Effort = 'default' | 'low' | 'medium' | 'high' | 'xhigh'

export interface WorkspaceRecord {
  id: string
  repoId: string
  branch: string
  /** `review`: a review session in the repo's own folder, no branch or worktree of Atril's (W90). */
  mode: Mode | 'review'
  path: string
  baseCommit: string
  previousBranch?: string
  agent: Agent
  model?: Model
  /** Set only for a level from the list, never 'default'. */
  effort?: Effort
  jiraKey?: string
  /** Automatic: Libretto's attacca instead of flow; set only when true (W58). */
  auto?: boolean
  session: string
  paneId: string
  /** Epoch seconds; records older than W95 have none. */
  createdAt?: number
}

export interface WorkspaceView extends WorkspaceRecord {
  alive: boolean
}

/**
 * W7/W8: `fix: 'worktree'` means opening again with `worktree: true` gets past it; `'terminal'` opens Terminal in the
 * folder (W131/W132); `'forget'` drops a work whose folder is gone (W133); `'reveal'` shows `file` in Finder (W147);
 * `'settings'` opens Ajustes (W155); `'git'` installs Xcode's tools (W156).
 * `detail` is git's or tmux's own output.
 */
export type WorkFix = 'worktree' | 'terminal' | 'forget' | 'reveal' | 'settings' | 'git'
/** W150: what fixes a failed request to Jira, GitHub or GitLab. */
/** `forge`: «Abrir en {forge} ↗», the MR's own page (M50). */
export type NetFix = 'settings' | 'retry' | 'forge'
export type WorkRefusal = { error: string; detail?: string; fix?: WorkFix; file?: StateFile }
export type WorkspaceResult = { workspace: WorkspaceView } | WorkRefusal
export type RemoveResult = { ok: true } | WorkRefusal

export interface WorkspacesApi {
  list(): Promise<Listed<WorkspaceView>>
  /** `task`: an own task's text; main turns it into the Libretto flow's request (W40). */
  open(repoId: string, branch: string, agent: Agent, model?: Model, task?: string, auto?: boolean, worktree?: boolean, effort?: Effort): Promise<WorkspaceResult>
  remove(id: string): Promise<RemoveResult>
  /** W133: drops a broken work's record, session and files; no git but `worktree prune`. */
  forget(id: string): Promise<RemoveResult>
  /** W141: starts a stopped work's agent again in its folder; `more` goes one effort level up. */
  reopen(id: string, more: boolean): Promise<WorkspaceResult>
  /** W134: Terminal in the repo's or the work's folder, looked up by id in main. */
  terminal(target: { repoId: string } | { id: string }): Promise<{ ok: true } | { error: string }>
}

export type TermAttach = { ok: boolean } | { error: string; detail: string }

export interface TermApi {
  /** W160: `ok: false` for an unknown or stopped work; never rejects. */
  attach(id: string, cols: number, rows: number): Promise<TermAttach>
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
export type StartProposalResult = StartProposal | { error: string } | StateProblem

export interface StartRequest extends StartIssue {
  repoId: string
  branch: string
  model: Model
  effort?: Effort
  auto?: boolean
  /** W130: a worktree this once, even for an in-place repo. */
  worktree?: boolean
}
/** The workspace stays open when only the Jira transition failed. */
export type StartResult = { workspace: WorkspaceView; transitionError?: string } | WorkRefusal

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
  /** I18: the code, folded under «Ver detalle». */
  detail?: string
}

export type InboxResult =
  | { issues: JiraIssue[]; groups: InboxGroup[]; notice?: InboxNotice }
  /** I3: Jira not connected; a token Jira rejects is 'failed' (I29). */
  | { error: 'unconfigured' }
  | { error: 'failed'; message: string; detail: string; fix: NetFix }

export interface JiraApi {
  inbox(): Promise<InboxResult>
  proposeStart(issue: StartIssue, repoId?: string, model?: Model, auto?: boolean, effort?: Effort): Promise<StartProposalResult>
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

export type JiraSaveResult = { account: string } | { error: string; detail?: string }

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
    save(forge: ForgeId, creds: { site?: string; token: string }): Promise<{ account: string } | { error: string; detail?: string }>
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
  /** Comments as the listing counts them: GitHub's search `comments`, GitLab's `user_notes_count`. */
  notes?: number
  /** The source branch (GitHub `head.ref` from the detail call, GitLab `source_branch`). */
  branch?: string
  /** M39, from the detail call: the target branch, and whether the forge says it merges or conflicts; unknown is unset. */
  target?: string
  mergeable?: true
  conflict?: true
}

export type MrListName = 'mine' | 'review' | 'following'
/** M33: how an MR opens in Atril. `review` and `continue` take one press; `existing` is a record of that same kind. */
export type MrWork = { kind: 'review' } | { kind: 'continue' } | { kind: 'existing'; workspaceId: string } | { kind: 'none'; reason: string }

export interface MrLists {
  /** Forges with a saved token; empty means nothing to list (M7). */
  connected: ForgeId[]
  mine: MrItem[]
  review: MrItem[]
  following: MrItem[]
  /** Per list, the forges that had more than the 50 rows shown (M8). */
  more: Record<MrListName, ForgeId[]>
  /** One per failing forge (M6): the W150 sentence in the person's language, its code and its fix. */
  errors: Array<{ forge: ForgeId; error: string; detail: string; fix: NetFix }>
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

/** One comment as the forge sent it; never translated, shown as plain text. */
export interface MrComment {
  id: string
  author: string
  /** ISO 8601. */
  at: string
  body: string
}

/** M18: one discussion. `id` 'general' holds the comments on no line; GitLab alone says `resolved`. */
export interface MrThread {
  id: string
  forge: ForgeId
  file?: string
  line?: number
  /** M18: `old` when the line is a number of the old side (GitHub `LEFT`, GitLab `old_line` alone). */
  side?: 'old'
  /** M18: GitHub's `line` is null, so `line` is the original one and no longer in the diff. */
  outdated?: true
  /** GitHub only: the code line the comment points at. */
  code?: string
  resolved?: boolean
  /** Oldest first. */
  comments: MrComment[]
  /** M20. */
  yourTurn: boolean
}

/** `more`: an endpoint had more than the 3 pages read (M19). Errors are already in the person's language. */
export type MrThreads = { threads: MrThread[]; more: boolean } | { error: string }
/** `detail` and `fix` when the forge itself failed (W150). */
export type MrReply = { comment: MrComment } | { error: string; detail?: string; fix?: NetFix }

export type LensName = 'intent' | 'security' | 'design' | 'reliability' | 'tests'
export type LensSeverity = 'high' | 'medium' | 'low'

/** M26: one finding of the lens review. Claude's words, never translated, shown as text. */
export interface MrDraft {
  id: string
  lens: LensName
  severity: LensSeverity
  file?: string
  line?: number
  text: string
  state: 'open' | 'published' | 'sent'
  /** M37: why a published draft went to the general comment instead of its line. */
  note?: string
}

/** `head` is set once a review is stored (zero findings included); `stale` when the MR has a newer head (M26). */
export interface MrDrafts {
  head?: string
  stale: boolean
  drafts: MrDraft[]
  /** M28: exactly one live workspace on the MR's branch in a repo of its project. */
  canSend: boolean
}
export type MrDraftsResult = MrDrafts | { error: string }

/** M46: one diff line; `old`/`new` are its numbers on each side (an added line has no old one). */
export interface MrPageLine {
  kind: 'context' | 'added' | 'removed'
  old?: number
  new?: number
  text: string
}
/** M46: one file of the MR's diff. `cut`: past the 1 MB shown; `tooLarge`: GitLab did not send it. Both carry no lines. */
export interface MrPageFile {
  path: string
  oldPath: string
  added: number
  removed: number
  lines: MrPageLine[]
  cut?: true
  tooLarge?: true
}
export interface MrReviewer {
  name: string
  state: 'approved' | 'changes' | 'commented' | 'pending'
}
/** M46: what the page reads when it opens. `cut`: GitHub would not send the diff at all; a failed reviewers request is its own problem. */
export type MrPage =
  | { files: MrPageFile[]; cut?: true; reviewers: MrReviewer[] | { error: string; detail?: string; fix?: NetFix }; contract?: string }
  | { error: string; detail?: string; fix?: NetFix }
export type MrFixCiResult = { sent: string } | { error: string }
/** M41, M50: `list` when the merge went through but listing again did not. A refusal never rejects. */
export type MrMergeResult = { merged: true; list?: { error: string; detail: string; fix: NetFix } } | { error: string; detail?: string; fix: NetFix }

export interface MrApi {
  list(): Promise<MrLists>
  /** Opens an MR of the latest listing in the browser; anything else is ignored (W52). */
  open(url: string): Promise<void>
  /** Queues a score for an MR of Mías or Me toca revisar; resolves when it is done (M14, M17). */
  score(url: string): Promise<MrScoreState>
  /** The state of each URL: queued, running, stored or failed. */
  scoreOf(urls: string[]): Promise<Record<string, MrScoreState>>
  onScoreChange(cb: (url: string, state: MrScoreState) => void): () => void
  /** The threads of an MR of the latest listing (M18, M22). */
  threads(url: string): Promise<MrThreads>
  /** Posts one reply to a thread of that MR as the person (M21). */
  reply(url: string, threadId: string, body: string): Promise<MrReply>
  /** Runs the lens review of an MR of Mías or Me toca revisar; resolves with its drafts when done (M25). */
  review(url: string): Promise<MrDraftsResult>
  /** The stored drafts of an MR (M26). */
  draftsOf(url: string): Promise<MrDraftsResult>
  /** Posts an open draft once as the MR's general comment (M27). */
  publishDraft(url: string, id: string): Promise<MrDraftsResult>
  /** Types an open draft into the one agent on the MR's branch (M28). */
  sendDraft(url: string, id: string): Promise<MrDraftsResult>
  /** M31: the branch of the one agent working on this MR, or null. */
  ciAgent(url: string): Promise<string | null>
  /** M30: asks that agent to fix the MR's failing CI. */
  fixCi(url: string): Promise<MrFixCiResult>
  discardDraft(url: string, id: string): Promise<MrDraftsResult>
  /** M46: the diff as files, the reviewers and the contract of an MR of the latest listing. */
  page(url: string): Promise<MrPage>
  /** M41: merges an MR of Mías that the forge says can merge; main refuses without `confirmed === true`. */
  merge(url: string, confirmed: boolean): Promise<MrMergeResult>
  /** M33: how an MR of the latest listing opens in Atril. */
  workFor(url: string): Promise<MrWork>
  /** M34: opens it as review session or continued workspace; a record of that kind already there is returned. */
  openWork(url: string): Promise<WorkspaceResult>
}

/** `agent` is a notice stored before `ask` and `done` were apart. */
export type AvisoKind = 'review' | 'comment' | 'ci' | 'cipass' | 'following' | 'opened' | 'gone' | 'merged' | 'closed' | 'agent' | 'ask' | 'done' | 'stopped' | 'idle' | 'radar' | 'qa' | 'quota'

/** One notice; `title` is the MR's title or the work's name (its Jira key, else its branch), never translated. */
export interface Aviso {
  id: string
  kind: AvisoKind
  /** Epoch ms. */
  at: number
  read: boolean
  title: string
  url?: string
  workspaceId?: string
  forge?: ForgeId
  /** The agent's own words as the hook wrote them (V3). */
  detail?: string
  /** An MR's source branch and project (W187). */
  branch?: string
  project?: string
  /** A work's repo, the Mac notification's subtitle (W177). */
  repo?: string
  /** What qa, radar, idle and quota notices fill in at the moment of showing (W48). */
  vars?: Record<string, string | number | null>
}

/** The 14 notice types of Ajustes → Notificaciones; `merged` also rules `closed` and `gone`, `ask` the legacy `agent`. */
export type NotifyType = 'ask' | 'done' | 'stopped' | 'idle' | 'radar' | 'qa' | 'review' | 'comment' | 'ci' | 'cipass' | 'merged' | 'following' | 'opened' | 'quota'
/** Mac: Avisos and the Mac; list: only Avisos; mute: neither. */
export type NotifyRoute = 'mac' | 'list' | 'mute'
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
/** V7: `$ATRIL_HOME/notifications.json`. */
export interface NotifySettings {
  types: Record<NotifyType, NotifyRoute>
  /** 5–120, a multiple of 5. */
  idleMinutes: number
  focus: boolean
  group: boolean
  /** `from`/`to` as HH:MM; `days` are quiet all day. */
  quiet: { on: boolean; from: string; to: string; days: Weekday[] }
}
export interface NotifyPatch {
  types?: Partial<Record<NotifyType, NotifyRoute>>
  idleMinutes?: number
  focus?: boolean
  group?: boolean
  quiet?: Partial<NotifySettings['quiet']>
}

/** W194: what a Mac notification asks the window to open. */
export type NotifyTarget = { kind: 'mr'; url: string } | { kind: 'avisos' } | { kind: 'fixCi'; url: string } | { kind: 'close'; id: string }
export type NotifyPermission = 'allowed' | 'blocked' | 'unknown'
export interface NotifyApi {
  /** V7. */
  get(): Promise<NotifySettings>
  /** V8: the stored settings after merging, or why they could not be saved. */
  set(patch: NotifyPatch): Promise<NotifySettings | { error: string; detail: string }>
  /** W193: that type's example on the Mac, past every rule. */
  test(type: NotifyType): Promise<'shown' | 'blocked'>
  /** W192. */
  permission(): Promise<NotifyPermission>
  /** W192: Ajustes del Sistema → Notificaciones. */
  openSystem(): Promise<void>
  /** Returns the unsubscribe function. */
  onOpen(cb: (target: NotifyTarget) => void): () => void
}

export interface AvisosApi {
  /** Newest first. */
  list(): Promise<Aviso[]>
  /** Returns the list after marking. */
  markRead(ids: string[] | 'all'): Promise<Aviso[]>
  /** V21: the person opened that workspace; its agent notices are read. */
  seen(workspaceId: string): Promise<Aviso[]>
  /** V15: the work a merged or closed MR's notice can close (W187's match), or null. */
  closable(id: string): Promise<string | null>
  /** Returns the unsubscribe function. */
  onChange(cb: (items: Aviso[]) => void): () => void
}

export type ForgeStatus = { saved: false } | { saved: true; account?: string; site?: string }

export type AgentState = 'working' | 'needs-you' | 'paused' | 'stopped'

/** W75: an option of the question due now, or one of main's own actions; main chooses the keys and words. */
export type QuickChoice = { option: number; question: number } | { allow: true } | { deny: true } | { continue: true }
/** The question due now as numbers a Mac reply can answer (N3). */
export interface QuickReplies {
  options: string[]
  multiSelect: boolean
  question: number
}
export interface WaitQuestion {
  question: string
  header: string
  options: { label: string; description: string }[]
  multiSelect: boolean
}
export type WaitKind = 'question' | 'permission' | 'turn-end'
/** W197–W202: what a needs-you agent waits for, as the card shows it. */
export interface AgentWait {
  /** Missing when the hook's text says nothing known (read by its prefix, as before W197). */
  kind?: WaitKind
  /** The hook's text, in Atril's words (W203). */
  text?: string
  questions: WaitQuestion[]
  /** The question main will answer next (W75). */
  next: number
  permission?: { tool: string; summary?: string }
  idle: boolean
}
export type QuickAnswer = { ok: true } | { error: string }

export interface StatusApi {
  list(): Promise<Record<string, AgentState>>
  /** What that workspace's agent waits for; null while it is not needs-you. */
  wait(workspaceId: string): Promise<AgentWait | null>
  /** W204: the composer's text, pasted into that workspace's agent pane, then Enter. */
  compose(workspaceId: string, text: string): Promise<QuickAnswer>
  /** Sends one answer to that workspace's agent (W75). */
  answer(workspaceId: string, choice: QuickChoice): Promise<QuickAnswer>
  /** Escape into a working agent and marks it paused (W86). */
  pause(workspaceId: string): Promise<QuickAnswer>
  /** Asks a paused agent to go on and clears the mark (W87). */
  resume(workspaceId: string): Promise<QuickAnswer>
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

export interface SubagentEntry {
  id: string
  type: string
  /** From the subagent's meta file (or stored by an older hook), cut at 120 characters; absent without one. */
  description?: string
  /** Epoch seconds. */
  startedAt: number
  /** Epoch seconds; absent while it runs. */
  endedAt?: number
}

/** One line of a subagent's own transcript, Claude Code style; `more` is how many result lines were hidden. */
export interface SubagentLine {
  kind: 'prompt' | 'text' | 'tool' | 'result' | 'thinking'
  text: string
  more?: number
}

export interface SubagentsApi {
  /** In file order (oldest first). */
  get(workspaceId: string): Promise<SubagentEntry[]>
  /** The subagent's transcript as lines, read in main from the path the hook stored; [] when there is none. */
  log(workspaceId: string, agentId: string): Promise<SubagentLine[]>
  /** Returns the unsubscribe function. */
  onChange(cb: (workspaceId: string, entries: SubagentEntry[]) => void): () => void
}

/** W93: a workspace's usage at API prices; `usd` is null when no model in it has a price. */
export interface WorkCost {
  tokens: number
  usd: number | null
  /** Models seen without a price, so their tokens count and their cost does not. */
  unpriced: string[]
}

export interface CostApi {
  /** Null when the hook has not said where the workspace's transcript is. */
  get(workspaceId: string): Promise<WorkCost | null>
  /** Main reads at most every 30 s and pushes only a changed total. Returns the unsubscribe function. */
  onChange(cb: (workspaceId: string, cost: WorkCost | null) => void): () => void
}

/** W95: one line of $ATRIL_HOME/history.jsonl per workspace removed; never content. */
export interface HistoryEntry {
  branch: string
  repoId: string
  jiraKey?: string
  mode: WorkspaceRecord['mode']
  stage?: StageName
  change?: string
  createdAt?: number
  closedAt: number
  cost: WorkCost | null
  /** W172: seconds in each Libretto step; a step whose ends are unknown is absent. */
  steps?: HistorySteps
}

export interface HistorySteps {
  spec?: number
  plan?: number
  construir?: number
  cierre?: number
}

export interface HistoryApi {
  /** Every line of the file (at most 200), newest first. */
  list(): Promise<HistoryEntry[]>
  /** Main pushes the whole list after each line it appends. Returns the unsubscribe function. */
  onChange(cb: (entries: HistoryEntry[]) => void): () => void
}

export type QaKind = 'expo' | 'react-native' | 'flutter' | 'android' | 'ios' | 'web'

/** W120: what QA can open a project in. */
export type QaPlatform = 'chrome' | 'safari' | 'android' | 'ios'

/** W120–W122: one way to test a workspace; `key` is `platform:dir`, `dir` relative to the workspace ('' for its root). */
export interface QaTarget {
  key: string
  platform: QaPlatform
  dir: string
  command: string
  why: string
  source: 'detected' | 'file' | 'manual'
}

export interface QaTargets {
  targets: QaTarget[]
  /** The repo's chosen key, else the first target's; null with no targets. */
  chosen: string | null
  /** W121's line when .atril/qa.json could not be used. */
  note: string | null
}

export interface QaManualRequest {
  platform: QaPlatform
  dir: string
  command: string
}

/** One screenshot of a QA run: `src` is a data URL, so the window never opens a local file. */
export interface QaShot {
  name: string
  /** mtime in ms. */
  at: number
  src: string
}

export interface QaStatus {
  /** The repo's chosen target; null when none is known (screenshots still come). */
  target: QaTarget | null
  /** The QA pane is still in tmux. */
  live: boolean
  /** Newest first, the 12 newest of at most 2 MB each. */
  shots: QaShot[]
}

export type QaResult = { ok: true } | { error: string }

/** W125: the fixes main knows; the window sends only one of these names. */
export type QaFix = 'pick-manual' | 'install-node' | 'install-android-studio' | 'create-avd' | 'update-xcode' | 'open-xcode' | 'open-workspace'

/** W125: why QA cannot launch, what that stops, its one fix and the technical detail. */
export interface QaProblem {
  what: string
  cant: string
  fix: QaFix
  detail: string
}

export type QaLaunchResult = { ok: true } | { error: string; problem?: QaProblem }

/** `open`: the workspace the window should open («Ver el otro QA»). */
export type QaFixResult = { ok: true; open?: string } | { error: string }

export interface QaCriterion {
  id: string
  text: string
}

export interface QaStep {
  text: string
  ms?: number
  /** A bare file name in the workspace's QA folder, with its mtime in `shotAt`. */
  shot?: string
  shotAt?: number
}

export interface QaEntry {
  id: string
  status: 'pass' | 'fail' | 'untested'
  note: string
  steps: QaStep[]
}

/** W113/W114: the current change's criteria and what the QA agent's report.json said about them, validated by main. */
export interface QaReport {
  change: string | null
  criteria: QaCriterion[]
  entries: QaEntry[]
  /** report.json's mtime in ms; 0 when there is none. */
  at: number
  /** W123: the chosen target, every target and W121's line. */
  target: QaTarget | null
  targets: QaTarget[]
  note: string | null
  branch: string
  head: string
}

export interface QaBugRequest {
  to: 'jira' | 'agent'
  title: string
  body: string
}

export type QaBugResult = { key: string } | { ok: true } | { error: string }

/** W174: the work's own MR, null when it has none. */
export type QaMr = { url: string } | null

/** W170/W171: the MR it reached, or W150's sentence with its fix and folded code. */
export type QaPublishResult = { url: string } | { error: string; detail?: string; fix?: NetFix }

export interface QaApi {
  /** null: no such workspace. */
  report(workspaceId: string): Promise<QaReport | null>
  /** `criterion` null: test them all again (W116). */
  retest(workspaceId: string, criterion: string | null): Promise<QaResult>
  bug(workspaceId: string, req: QaBugRequest): Promise<QaBugResult>
  /** null: no such workspace. */
  status(workspaceId: string): Promise<QaStatus | null>
  /** `key`: the target to launch; the repo's chosen one when absent. */
  launch(workspaceId: string, key?: string): Promise<QaLaunchResult>
  /** W125: runs the named fix; `pick-manual` is the window's own. */
  fix(workspaceId: string, fix: QaFix): Promise<QaFixResult>
  stop(workspaceId: string): Promise<QaResult>
  /** W123: the tab pressed, remembered for the repo. */
  choose(workspaceId: string, key: string): Promise<QaTargets | { error: string }>
  /** W122: «Elegir a mano»; refused with a sentence. */
  manual(workspaceId: string, req: QaManualRequest): Promise<QaTargets | { error: string }>
  unmanual(workspaceId: string, key: string): Promise<QaTargets | { error: string }>
  /** W174: the work's MR among the person's own (Mías), by repo and branch. */
  mrFor(workspaceId: string): Promise<QaMr>
  /** W170: one general comment with the QA's result on that MR. */
  publish(workspaceId: string): Promise<QaPublishResult>
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

/** F36: one checklist box with the code of its range; pending boxes carry none. */
export interface FlowBox {
  /** Position in the current checklist, from 0. */
  index: number
  text: string
  state: 'closed' | 'current' | 'pending'
  /** Short id of the commit that closed it; absent when it was ticked without one. */
  commit?: string
  files?: FileChange[]
}

export interface FlowBoxes {
  boxes: FlowBox[]
  /** Added plus removed lines of the whole branch (F25). */
  total: number
}

export interface FlowDocs {
  change: string
  files: FlowDoc[]
}

export interface LibrettoQueued {
  name: string
  /** YYYY-MM-DD from the `Queued:` line. */
  date: string
  /** The request as written, without the quote marks; what «Editar» opens. */
  ask: string
  reading?: string
  /** A local branch feat/<name> exists. */
  started: boolean
}
/** `total` 0 means the folder has no checklist. */
export interface LibrettoInFlight {
  name: string
  closed: number
  total: number
  firstOpen?: string
}
export type LibrettoState = { none: true } | { queued: LibrettoQueued[]; inFlight: LibrettoInFlight[] } | { error: string }

/** What each repo card on the Libretto screen counts; `none` is a repo without `.agents/changes/`. */
export interface LibrettoCounts {
  none: boolean
  queued: number
  inFlight: number
}
export type IdeaResult = { ok: true } | { error: string }
/** `key` with `error`: the issue exists but the idea could not be removed. */
export type IdeaJiraResult = { key: string; error?: string } | { error: string }

export interface LibrettoApi {
  state(repoId: string): Promise<LibrettoState>
  /** Counts for every registered repo, by id. */
  repos(): Promise<Record<string, LibrettoCounts>>
  queue(repoId: string, text: string): Promise<{ name: string } | { error: string }>
  start(repoId: string, name: string): Promise<WorkspaceResult>
  edit(repoId: string, name: string, text: string): Promise<IdeaResult>
  drop(repoId: string, name: string): Promise<IdeaResult>
  jira(repoId: string, name: string): Promise<IdeaJiraResult>
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
  /** F36: the checklist boxes of the current change, each with the code of its range. */
  boxes(workspaceId: string): Promise<FlowBoxes>
  /** F37: one file's diff over one box's range; empty for anything outside it. */
  boxDiff(workspaceId: string, index: number, path: string): Promise<string>
}

export interface UsageWindow {
  pct: number
  /** ISO timestamp, null when the endpoint omits it. */
  resetsAt: string | null
}

export type UsageResult =
  | { fiveHour: UsageWindow; sevenDay: UsageWindow; /** Set when the latest read failed: these values are from `since`. */ stale?: { since: number } }
  | { error: string; detail: string; fix: 'retry' | 'claude' }

export interface UsageApi {
  get(): Promise<UsageResult>
  /** W20: opens Terminal running `claude`, where the person signs in again. */
  fix(): Promise<{ ok: true } | { error: string }>
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
  | { kind: 'palette' }
  | { kind: 'focusMode' }
  | { kind: 'back' }
  | { kind: 'overview' }
  | { kind: 'bigCode' }

export type Theme = 'light' | 'dark' | 'auto'
export type Palette = 'original' | 'grafito'

/** What the app remembers about itself in ~/.atril/ui.json. */
export interface UiState {
  tutorialSeen: boolean
  /** «Ya lo tengo» on «Primeros pasos» (W97); missing reads as not dismissed. */
  setupDismissed?: boolean
  /** The repo last picked on the Libretto screen (W104). */
  librettoRepo?: string
  theme: Theme
  /** Independent of the theme; missing reads as Original. */
  palette?: Palette
  /** Section id to folded; a missing id means the section's own default. */
  folded: Record<string, boolean>
  /** The person's choice (S14); missing reads as Sistema. */
  language?: LangChoice
  /** The language main resolved from it; main sets it, the window only reads it (W48). */
  lang?: Lang
  /** F25: per workspace, the branch-size threshold the person chose «Dejarla así» for; merges key by key. */
  bigDismissed?: Record<string, number>
  /** K16: the person ticked «No volver a preguntar» on the first skills write; only `true` is kept. */
  skillsWriteOk?: true
  /** W216: «Enviar los fallos a GitHub como PR» (crash R6); only `'on'` is kept, anything else reads as off. */
  crashReports?: 'on'
  /** crash R3/R7: the last send, with the PR's URL or why it failed; main writes it. */
  crashLast?: CrashLast
}

export type CrashLast = { at: number; url: string } | { at: number; error: string }

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
  /**
   * Whether the window is in focus mode, so main keeps needs-you notifications quiet while it is in front (W78),
   * and whether it could be turned on (Trabajo shown with a workspace selected, W77).
   */
  setFocus(on: boolean, available: boolean): void
  /** Trabajo shown with at least one workspace: «Todos» can be toggled (W81). */
  setOverview(available: boolean): void
  /** F40: Trabajo shows «Uno» with a workspace selected, so the code can be enlarged. */
  setBig(available: boolean): void
  /** Returns the unsubscribe function. */
  onAction(cb: (a: MenuAction) => void): () => void
}

/** W166: another work of the same repo changing the same files; `files` relative to the repo, sorted. */
export interface RadarHit {
  id: string
  branch: string
  files: string[]
}

export interface RadarApi {
  /** Per work id (reviews left out), its collisions; empty when it shares no file. */
  get(): Promise<Record<string, RadarHit[]>>
}

/** W208–W209: Haiku's questions about a request, or why there are none. */
export type RefineResult = { questions: string[] } | { error: string; detail: string; fix: 'retry' }

export interface RefineApi {
  /** Only when the person presses «Que Claude me pregunte» (I31); one at a time. */
  ask(text: string): Promise<RefineResult>
}

/** K1: where Claude Code loads a skill or command from. */
export type SkillOrigin = 'personal' | 'project' | 'plugin' | 'atril'
/** K3: `skillOverrides` values in Claude Code's settings; absent = `on`. */
export type SkillState = 'on' | 'name-only' | 'user-invocable-only' | 'off'

export interface SkillItem {
  name: string
  kind: 'skill' | 'command'
  origin: SkillOrigin
  /** `name@marketplace` for plugin items, `libretto` for Atril's. */
  plugin?: string
  path: string
  description?: string
  whenToUse?: string
  argumentHint?: string
  allowedTools?: string[]
  model?: string
  effort?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  body: string
  broken?: true
  state: SkillState
  /** Plugin and Atril items: whether the plugin is on (K3). */
  enabled?: boolean
  /** K4: why it is not loaded. */
  shadowedBy?: 'personal' | 'skill'
  /** K12: the settings file a change to this item is written to (personal, project and plugin items). */
  writesTo?: string
  /** K12: the repo-relative settings file that fixes its key over `writesTo`, so a change would do nothing. */
  lockedBy?: string
}

/** K13: one item (never a plugin's, never Atril's) with its new state, or a whole plugin on or off. */
export type SkillSet =
  | { origin: SkillOrigin; name: string; repoId?: string; state: SkillState }
  | { plugin: string; enabled: boolean; repoId?: string }
/** K17: enough to recompute `writesTo` in main; the renderer never sends a path. */
export interface SkillRef {
  origin: SkillOrigin
  name: string
  kind?: 'skill' | 'command'
  plugin?: string
  repoId?: string
}

export interface SkillsList {
  items: SkillItem[]
  warnings: string[]
}

/** K26: a listed personal or project item, by its `path`. */
export interface SkillFileRef {
  path: string
  repoId?: string
}
/** K19: `base` is the text the person opened; main compares it with the disk, never a date. */
export interface SkillSave extends SkillFileRef {
  base: string
  text: string
  force?: boolean
  allowBroken?: boolean
}
export type SkillSaved = { list: SkillsList } | { conflict: true; disk: string } | { brokenHeader: true }
/** K21 */
export interface SkillCreate {
  origin: 'personal' | 'project'
  repoId?: string
  name: string
}

/** K27: what `claude plugin list --available --json` says, reduced to the fields Atril reads. */
export interface PluginCatalog {
  installed: { pluginId: string; scope: string; projectPath?: string }[]
  available: { pluginId: string; name: string; marketplace: string; description?: string; version?: string }[]
}
/** K28/K31 */
export interface PluginRequest {
  action: 'install' | 'uninstall' | 'update'
  plugin: string
  scope: 'user' | 'local'
  repoId?: string
}
/** K30: main never rejects for these; `code` says which clause. */
export type PluginFailure = { error: string; code: 'invalid' | 'busy' | 'missing' | 'timeout' | 'failed' }
export type PluginCatalogResult = { catalog: PluginCatalog } | PluginFailure
export type PluginActionResult = { list: SkillsList } | PluginFailure

/** K35: one name's uses in the last 30 days: the newest `timestamp` and uses per local day, index 0 today. */
export interface SkillUse {
  last: string
  days: number[]
}
/** K39: main never rejects; with no sessions folder the answer is `{ usage: {} }`. */
export type SkillsUsage = { usage: Record<string, SkillUse> } | { error: string }

export interface SkillsApi {
  /** K35: what was invoked, read from Claude Code's sessions on this Mac; never Claude. */
  usage(): Promise<SkillsUsage>
  /** K27: the plugins the added marketplaces offer and what is installed, from the Claude Code CLI. */
  catalog(repoId?: string): Promise<PluginCatalogResult>
  /** K28: installs, updates or removes one plugin through the CLI; answers the new list. */
  plugin(req: PluginRequest): Promise<PluginActionResult>
  /** K29: adds a marketplace by its source; answers the new catalog. */
  marketplace(req: { source: string; repoId?: string }): Promise<PluginCatalogResult>
  /** K31: the same action, typed in Terminal where the person can read and accept it. */
  pluginTerminal(req: PluginRequest): Promise<{ ok: true } | { error: string }>
  /** Read-only: folders and settings, never Claude (K1). */
  list(repoId?: string): Promise<SkillsList>
  /** K13/K14: writes one key in one settings file and answers the new list; rejects naming the file or the reason. */
  set(req: SkillSet): Promise<SkillsList>
  /** K17: shows the item's `writesTo` in Finder (its folder when the file does not exist). */
  reveal(ref: SkillRef): Promise<void>
  /** K26: the whole file of a listed personal or project item, header included. */
  read(ref: SkillFileRef): Promise<string>
  /** K19/K20: saves the file unless it changed underneath; a conflict or a broken header is an answer, not a throw. */
  save(req: SkillSave): Promise<SkillSaved>
  /** K21: a new `skills/<name>/SKILL.md` with an empty description; answers the new list. */
  create(req: SkillCreate): Promise<SkillsList>
}

/** crash R5/R6: the window's own failures to main, and the last sent PR opened in the browser. */
export interface CrashApi {
  report(r: { message: string; stack: string }): void
  /** Opens `crashLast.url` when it is a PR of the official repo; anything else opens nothing. */
  openLast(): Promise<void>
}

export interface AtrilApi {
  menu: MenuApi
  crash: CrashApi
  ui: UiApi
  usage: UsageApi
  flow: FlowApi
  libretto: LibrettoApi
  forge: ForgeApi
  mr: MrApi
  avisos: AvisosApi
  notify: NotifyApi
  status: StatusApi
  nextup: NextUpApi
  activity: ActivityApi
  subagents: SubagentsApi
  cost: CostApi
  radar: RadarApi
  history: HistoryApi
  qa: QaApi
  refine: RefineApi
  skills: SkillsApi
  doctor(): Promise<DoctorReport>
  installTool(tool: string): Promise<{ ok: true } | { error: string }>
  repos: ReposApi
  workspaces: WorkspacesApi
  /** W147: shows that state file in Finder (Atril's folder if it is missing); any other name shows nothing. */
  revealState(file: StateFile): Promise<boolean>
  term: TermApi
  jira: JiraApi
  settings: SettingsApi
  /** Dev snapshot only: the workspace to select on startup. */
  snapshotWorkspace(): Promise<boolean>
  /** Dev snapshot only: the screen to show on startup. */
  snapshotView(): Promise<string | null>
}
