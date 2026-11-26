import { randomInt } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, rename, rm as unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Agent, Aviso, Effort, FlowBoxes, Model, RemoveResult, WorkRefusal, WorkspaceRecord, WorkspaceResult, WorkspaceView } from '../preload/api'
import { boxDiff, boxRanges } from './flow/boxes'
import { quietly } from './flow/quiet'
import { agentArgv, hasLessons, EFFORTS } from './agent'
import { detectMode, effectiveMode, gitBroken, readRepos, repoHealth } from './repos'
import { readState, StateError, stateBlock, stateProblem, statePath } from './state'
import { run as defaultRun, type Runner, type RunResult } from './run'
import { trustFolder } from './trust'
import { hasPane, hasSession, killSession, newSession, paneDead, sessionListed, sessionName } from './tmux'
import { atrilHome } from './paths'
import { appendHistory, historyEntry } from './history'
import { t } from './lang'
import { inTerminal } from './doctor'

export interface OpenInput {
  repoId: string
  branch: string
  agent: Agent
  model?: Model
  effort?: Effort
  jiraKey?: string
  /** First message the agent receives (Start passes the Libretto flow command). */
  prompt?: string
  /** W58: only `true` counts (the value crosses IPC); starts attacca instead of flow. */
  auto?: boolean
  /** An own task (W40): becomes the flow's request; never a command line of its own. */
  task?: string
  /** W89: the branch already exists on `remote` (default origin): fetched and checked out, never created. */
  existing?: boolean
  remote?: string
  /** W90: a review session in the repo's own folder; Atril runs no git that changes anything. */
  review?: boolean
  /** W129: a worktree this once, even for an in-place repo; the repo keeps its mode. */
  worktree?: boolean
  /** Tests swap the agent for a harmless long-running command; the prompt is still appended. */
  argv?: string[]
}

const home = atrilHome
export const worktreePath = (repoId: string, branch: string): string => join(home(), 'wt', repoId, branch)
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const newId = (): string => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

/** W91: the workspace the Libretto panel, its documents, Cambios and QA may read; a review session has none. */
export async function flowWorkspace(id: string, run: Runner = defaultRun): Promise<WorkspaceView | undefined> {
  return (await listWorkspaces(run)).find((w) => w.id === id && w.mode !== 'review')
}

/** W144: a damaged file throws StateError, never reads as empty. */
export const readRecords = async (): Promise<WorkspaceRecord[]> => (await readState('workspaces')).workspaces

/** W145: readers that only show things see no works while the file is damaged; the sidebar says why. Writers use readRecords. */
const noneIfDamaged = <T>(e: unknown): T[] => {
  if (e instanceof StateError) return []
  throw e
}
export const readRecordsOrNone = (): Promise<WorkspaceRecord[]> => readRecords().catch(noneIfDamaged<WorkspaceRecord>)

export async function writeRecords(workspaces: WorkspaceRecord[]): Promise<void> {
  // Never over a file that could not be read: its works would be lost.
  await readState('workspaces')
  await mkdir(home(), { recursive: true })
  // Readers (watchers, the status poll) run while this writes: a temp file and a rename keep them whole.
  const file = statePath('workspaces')
  const temp = `${file}.${process.pid}.${newId()}.tmp`
  await writeFile(temp, JSON.stringify({ workspaces }, null, 2) + '\n')
  await rename(temp, file)
}

/** W300, W302: origin's default branch after a fetch (or as last fetched); null without origin or any of its refs. */
async function defaultRef(path: string, run: Runner): Promise<{ ref: string; sha: string; fetched: boolean } | null> {
  if ((await run('git', ['-C', path, 'remote', 'get-url', 'origin'])).code !== 0) return null
  const fetched = (await run('git', ['-C', path, 'fetch', 'origin'], { timeoutMs: 15_000 })).code === 0
  const head = await run('git', ['-C', path, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  for (const ref of [...(head.code === 0 && head.stdout.trim() ? [head.stdout.trim()] : []), 'origin/main', 'origin/master']) {
    const sha = await run('git', ['-C', path, 'rev-parse', '--verify', '--quiet', `refs/remotes/${ref}^{commit}`])
    if (sha.code === 0 && sha.stdout.trim()) return { ref, sha: sha.stdout.trim(), fetched }
  }
  return null
}

type Based = Pick<WorkspaceRecord, 'path' | 'baseCommit' | 'baseRef'>

/** W303: where HEAD left the work's base ref; `baseCommit` without one. Cached per work until its git refs move. */
export const workBase = (rec: Based, run: Runner = defaultRun): Promise<string> =>
  rec.baseRef
    ? quietly(rec.path, `base:${rec.baseCommit}:${rec.baseRef}`, run, async () => {
        const mb = await run('git', ['-C', rec.path, 'merge-base', 'HEAD', rec.baseRef!])
        return (mb.code === 0 && mb.stdout.trim()) || rec.baseCommit
      })
    : Promise.resolve(rec.baseCommit)

/** W312: the panel measures from the same base as the hook (W46). */
export const panelBoxes = async (ws: Based, change: string | undefined, run: Runner = defaultRun): Promise<FlowBoxes> =>
  boxRanges(ws.path, await workBase(ws, run), change, run)
export const panelBoxDiff = async (ws: Based, change: string | undefined, index: number, file: string, run: Runner = defaultRun): Promise<string> =>
  boxDiff(ws.path, await workBase(ws, run), change, index, file, run)

/** W306, W307: marks these records merged; re-reads first so a record written meanwhile is kept. */
async function setMerged(ids: Set<string>): Promise<void> {
  if (ids.size === 0) return
  const recs = await readRecords()
  if (!recs.some((r) => ids.has(r.id) && !r.merged)) return
  await writeRecords(recs.map((r) => (ids.has(r.id) ? { ...r, merged: true as const } : r)))
}

/** W306: the work each added `merged` notice belongs to, by W187's match. */
export async function markMergedFrom(added: Aviso[], closable: (a: Aviso) => Promise<string | undefined>): Promise<void> {
  const ids = new Set<string>()
  for (const a of added) {
    if (a.kind !== 'merged') continue
    const id = await closable(a)
    if (id) ids.add(id)
  }
  await setMerged(ids)
}

/** W307: sibling works of the repo whose own commits are all in the default ref by now. */
async function markLanded(repoId: string, repoPath: string, ref: string, run: Runner): Promise<void> {
  const ids = new Set<string>()
  for (const r of await readRecords()) {
    if (r.repoId !== repoId || r.mode === 'review' || r.merged) continue
    const tip = `refs/heads/${r.branch}`
    const own = await run('git', ['-C', repoPath, 'rev-list', '--count', `${r.baseCommit}..${tip}`])
    if (own.code !== 0 || Number(own.stdout.trim()) < 1) continue
    if ((await run('git', ['-C', repoPath, 'merge-base', '--is-ancestor', tip, ref])).code === 0) ids.add(r.id)
  }
  await setMerged(ids)
}

const MAX_TASK = 2000

/** W58: attacca is Libretto's flow without stops. */
export const flowPrompt = (request: string, auto?: boolean): string => `/libretto:libretto-${auto === true ? 'attacca' : 'flow'} ${request}`

/** W41: the flow command and the text are one argv element, so the text can never be a flag. */
export function taskPrompt(task: unknown, auto?: boolean): string | null {
  if (typeof task !== 'string') return null
  const text = task.trim()
  return text === '' || text.length > MAX_TASK || text.includes('\0') ? null : flowPrompt(text, auto)
}

/** W59/W60: the hook reads this marker by session name, never the record. */
const autoMarker = (id: string): string => join(home(), 'auto', sessionName(id))

/** W131/W132: git's or tmux's own words go folded in `detail`, never in the sentence. */
const failed = (error: string, detail: string): { error: string; detail: string; fix: 'terminal' } => ({ error, detail: detail.trim(), fix: 'terminal' })
/** W156: a git that cannot run is said as such, never as the step's own failure. */
const noGit = (stderr: string): WorkRefusal => ({ error: t('git does not work on this Mac.'), detail: stderr.trim(), fix: 'git' })
const gitFailed = (r: RunResult, error: string): WorkRefusal => (gitBroken(r) ? noGit(r.stderr) : failed(error, r.stderr))

const READ_ONLY = new Set(['EACCES', 'EPERM', 'EROFS'])
/** W146: Atril's own folder refused a write; `other` answers any other failure. */
function unwritable(err: unknown, other?: string): WorkRefusal | undefined {
  if (err instanceof StateError) return stateProblem(err)
  const code = (err as NodeJS.ErrnoException).code ?? String(err)
  if (READ_ONLY.has(code)) return { error: t("I can't write to Atril's folder ({home}).", { home: home() }), detail: code, fix: 'reveal', file: 'workspaces' }
  return other === undefined ? undefined : { error: other, detail: code }
}

/** W60, W65 and W92: what the hook keeps by session name dies with the workspace. */
const dropFiles = (id: string): Promise<unknown> =>
  Promise.all([autoMarker(id), join(home(), 'subagents', `${sessionName(id)}.json`), join(home(), 'paused', sessionName(id)), join(home(), 'transcripts', sessionName(id))].map((f) => unlink(f, { force: true })))

/**
 * `prepare` runs in the new folder after the branch exists and before the agent starts (W102); an error it returns
 * undoes the folder and the branch it just made.
 */
export async function openWorktree(
  input: OpenInput,
  run: Runner = defaultRun,
  prepare?: (path: string) => Promise<string | undefined>
): Promise<WorkspaceResult> {
  const { repoId, branch, agent } = input
  const prompt = input.task === undefined ? input.prompt : taskPrompt(input.task, input.auto)
  if (prompt === null) return { error: t('The task text is not valid (max. 2000 characters).') }
  // W6: nothing else runs before the branch name is validated; only git's own words blame the name.
  const name = await run('git', ['check-ref-format', '--branch', branch])
  if (name.code !== 0) {
    if (gitBroken(name)) return noGit(name.stderr)
    if (name.stderr.includes('is not a valid branch name')) return { error: t('“{branch}” is not a valid branch name', { branch }) }
    return failed(t('git could not check the name {branch}.', { branch }), name.stderr)
  }

  const blocked = await stateBlock()
  if (blocked) return blocked
  const repo = (await readRepos()).find((r) => r.id === repoId)
  if (!repo) return { error: t('There is no repo “{id}”', { id: repoId }) }
  // W155: before any git that writes and any tmux.
  const health = await repoHealth(repo.path, run)
  if (typeof health !== 'string') return noGit(health.broken)
  if (health === 'missing') return { error: t('The folder of {repo} no longer exists ({path}).', { repo: repoId, path: repo.path }), fix: 'settings' }
  if (health === 'not-git') return { error: t('The folder of {repo} is not a git repo ({path}).', { repo: repoId, path: repo.path }), fix: 'settings' }

  const review = input.review === true
  const detected = review ? null : repo.override ? { mode: repo.override, reason: '' } : await detectMode(repo.path, run)
  const inPlace = detected !== null && input.worktree !== true && effectiveMode(repo, detected).mode === 'in-place'
  if (inPlace && input.existing === true) return { error: t('This repo works in your own copy: switch branch by hand') }

  let path: string
  let previousBranch: string | undefined
  let fetched: string | undefined
  let madeBranch = !review && input.existing !== true
  let base = madeBranch ? await defaultRef(repo.path, run) : null
  if (review) {
    path = repo.path
  } else if (inPlace) {
    const open = (await readRecords()).find((r) => r.repoId === repoId && r.mode === 'in-place')
    // W7: a worktree this once is the way out that leaves the open work alone.
    if (open) return { error: t('{repo} works in your copy and already has an open work ({branch}).', { repo: repoId, branch: open.branch }), fix: 'worktree' }
    const status = await run('git', ['-C', repo.path, 'status', '--porcelain'])
    if (status.code !== 0) return gitFailed(status, t('I cannot read the git state of {repo}.', { repo: repoId }))
    const dirty = status.stdout.split('\n').filter((l) => l.trim() !== '')
    if (dirty.length > 0) {
      // W8: what is dirty and why the repo works in place go folded; the fix never touches those changes.
      const current = (await run('git', ['-C', repo.path, 'branch', '--show-current'])).stdout.trim() || t('detached HEAD')
      const changes = dirty.length === 1 ? t('1 change') : t('{n} changes', { n: dirty.length })
      return {
        error: t("Your copy of {repo} has {changes} uncommitted on {branch}: I can't move it to {new} without mixing them.", { repo: repoId, changes, branch: current, new: branch }),
        detail: `${dirty.slice(0, 20).join('\n')}\n\n${t('It works in your copy: {reason}', { reason: effectiveMode(repo, detected!).reason })}`,
        fix: 'worktree'
      }
    }
    const current = (await run('git', ['-C', repo.path, 'branch', '--show-current'])).stdout.trim()
    // Detached HEAD has no branch name: the sha is what close switches back to.
    previousBranch = current || (await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])).stdout.trim()
    const exists = (await run('git', ['-C', repo.path, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`])).code === 0
    madeBranch = !exists
    // A branch already there is switched to as it is: it started from wherever it started.
    if (exists) base = null
    const target = exists ? [branch] : base ? ['--no-track', '-c', branch, base.ref] : ['-c', branch]
    const sw = await run('git', ['-C', repo.path, 'switch', ...target])
    if (sw.code !== 0) return gitFailed(sw, t('git will not let me switch your copy to {branch}.', { branch }))
    path = repo.path
  } else {
    path = worktreePath(repoId, branch)
    let where = base ? ['--no-track', '-b', branch, path, base.ref] : ['-b', branch, path]
    if (input.existing === true) {
      const remote = input.remote ?? 'origin'
      const fetch = await run('git', ['-C', repo.path, 'fetch', remote, branch])
      if (fetch.code !== 0) return gitFailed(fetch, t('I could not fetch {branch} from {remote}.', { branch, remote }))
      fetched = (await run('git', ['-C', repo.path, 'rev-parse', `refs/remotes/${remote}/${branch}`])).stdout.trim()
      // W89: the base is where the MR's branch left the main line, so Cambios shows the whole MR at once.
      for (const line of [`refs/remotes/${remote}/HEAD`, `refs/remotes/${remote}/main`, `refs/remotes/${remote}/master`, 'refs/heads/main', 'refs/heads/master']) {
        const mb = await run('git', ['-C', repo.path, 'merge-base', fetched, line])
        if (mb.code === 0 && mb.stdout.trim()) {
          fetched = mb.stdout.trim()
          break
        }
      }
      const local = (await run('git', ['-C', repo.path, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`])).code === 0
      where = local ? [path, branch] : ['--track', '-b', branch, path, `${remote}/${branch}`]
    }
    try {
      await mkdir(join(path, '..'), { recursive: true })
    } catch (err) {
      const refusal = unwritable(err)
      if (refusal) return refusal
      throw err
    }
    const add = await run('git', ['-C', repo.path, 'worktree', 'add', ...where])
    if (add.code !== 0) {
      // Atril runs git with its default English messages: this is git's own wording for a branch held elsewhere.
      const held = /already (checked out|used by worktree)/.test(add.stderr)
      return gitFailed(add, held ? t('Branch {branch} is already open in another folder.', { branch }) : t('git could not create the work folder.'))
    }
  }

  // Undoes only what this attempt made: the folder and the branch it created.
  const undo = async (): Promise<void> => {
    if (inPlace) {
      await run('git', ['-C', path, 'switch', '--discard-changes', previousBranch ?? branch])
    } else if (!review) await run('git', ['-C', repo.path, 'worktree', 'remove', '--force', path])
    if (madeBranch) await run('git', ['-C', repo.path, 'branch', '-D', branch])
  }
  const prepared = prepare ? await prepare(path) : undefined
  if (prepared !== undefined) {
    await undo()
    return { error: prepared }
  }

  const head = fetched ?? base?.sha ?? (await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])).stdout.trim()
  const id = newId()
  // Only folders Atril created: in-place and review run in the person's own checkout, never touched (W31).
  if (!inPlace && !review) await trustFolder(path)
  const auto = input.auto === true
  if (auto) {
    await mkdir(join(home(), 'auto'), { recursive: true })
    await writeFile(autoMarker(id), '')
  }
  const argv = input.argv ? [...input.argv, ...(prompt ? [prompt] : [])] : agentArgv({ model: input.model, effort: input.effort, prompt, lessons: await hasLessons(path) })
  let paneId: string
  try {
    paneId = await newSession(id, path, argv, run)
  } catch (err) {
    // W60: no session, no record: the marker would never be removed. A half-made session goes too.
    if (auto) await unlink(autoMarker(id), { force: true })
    await killSession(id, run)
    await undo()
    return failed(t('tmux could not start the agent.'), err instanceof Error ? err.message : String(err))
  }

  const record: WorkspaceRecord = {
    id,
    repoId,
    branch,
    mode: review ? 'review' : inPlace ? 'in-place' : 'worktree',
    path,
    baseCommit: head,
    ...(base && { baseRef: base.ref }),
    ...(previousBranch !== undefined && { previousBranch }),
    agent,
    ...(input.model && { model: input.model }),
    ...(input.effort && EFFORTS.includes(input.effort) && { effort: input.effort }),
    ...(input.jiraKey && { jiraKey: input.jiraKey }),
    ...(auto && { auto }),
    session: sessionName(id),
    paneId,
    createdAt: Math.floor(Date.now() / 1000)
  }
  try {
    await writeRecords([...(await readRecords()), record])
  } catch (err) {
    // W146: a work Atril cannot list would run on unseen: everything this attempt made goes.
    if (auto) await unlink(autoMarker(id), { force: true })
    await killSession(id, run)
    await undo()
    return unwritable(err, t("I couldn't save the workspace."))!
  }
  // A mark that fails to save costs only the label: the work itself is open.
  if (base?.fetched) await markLanded(repoId, repo.path, base.ref, run).catch(() => undefined)
  return { workspace: { ...record, alive: true } }
}

// Reads state only: starting nothing here is what makes a relaunch safe (W12).
export const listWorkspacesOrNone = (run: Runner = defaultRun): Promise<WorkspaceView[]> => listWorkspaces(run).catch(noneIfDamaged<WorkspaceView>)

export async function listWorkspaces(run: Runner = defaultRun): Promise<WorkspaceView[]> {
  return Promise.all((await readRecords()).map(async (r) => ({ ...r, alive: await sessionListed(r.id, run) })))
}

export async function removeWorkspace(id: string, run: Runner = defaultRun): Promise<RemoveResult> {
  const blocked = await stateBlock()
  if (blocked) return blocked
  const records = await readRecords()
  const rec = records.find((r) => r.id === id)
  if (!rec) return { error: t('That work no longer exists') }
  if (rec.mode === 'review') {
    // W90: the folder is the person's own repo; ending the session is all there is to undo.
    await killSession(id, run)
    await writeRecords(records.filter((r) => r.id !== id))
    await dropFiles(id)
    return { ok: true }
  }

  const repo = (await readRepos()).find((r) => r.id === rec.repoId)
  if (!repo) return { error: t('There is no repo “{id}”', { id: rec.repoId }) }

  const branch = rec.branch
  if (!existsSync(rec.path)) return { error: t('The folder of {branch} no longer exists.', { branch }), fix: 'forget' }
  const status = await run('git', ['-C', rec.path, 'status', '--porcelain'])
  if (status.code !== 0) return gitFailed(status, t('I cannot read the git state of {branch}.', { branch }))
  const dirty = status.stdout.split('\n').filter((l) => l.trim() !== '')
  if (dirty.length > 0) {
    const changes = dirty.length === 1 ? t('1 change') : t('{n} changes', { n: dirty.length })
    return { error: t('{branch} has {changes} uncommitted: I will not close it so they are not lost.', { branch, changes }), detail: dirty.slice(0, 20).join('\n'), fix: 'terminal' }
  }

  if (rec.mode === 'in-place') {
    // The main checkout is shared with the person: never switch them off a branch they chose by hand.
    const current = (await run('git', ['-C', rec.path, 'branch', '--show-current'])).stdout.trim()
    if (current !== branch) return { error: t('Your copy is on {current}, not {branch}: go back to {branch} before closing.', { current: current || t('detached HEAD'), branch }), fix: 'terminal' }
  }

  // W95: read before the folder and the transcript list go; written only once the removal got through.
  const entry = await historyEntry(rec, run)
  const done = async (): Promise<RemoveResult> => {
    await writeRecords(records.filter((r) => r.id !== id))
    await dropFiles(id)
    await appendHistory(entry).catch(() => undefined)
    return { ok: true }
  }
  await killSession(id, run)
  if (rec.mode === 'in-place') {
    // Never delete the branch: the person's commits live there.
    const prev = rec.previousBranch ?? ''
    const back = await run('git', ['-C', rec.path, 'switch', ...(/^[0-9a-f]{40}$/.test(prev) ? ['--detach'] : []), prev])
    if (back.code !== 0) return gitFailed(back, t('git could not close {branch}; its agent is already stopped.', { branch }))
    return done()
  }
  // No --force: git itself refuses anything the status check missed.
  const rm = await run('git', ['-C', repo.path, 'worktree', 'remove', rec.path])
  if (rm.code !== 0) return gitFailed(rm, t('git could not close {branch}; its agent is already stopped.', { branch }))
  return done()
}

/** W133: for a work whose folder or git is broken; the folder itself is never touched. */
export async function forgetWorkspace(id: string, run: Runner = defaultRun): Promise<RemoveResult> {
  const blocked = await stateBlock()
  if (blocked) return blocked
  const records = await readRecords()
  const rec = records.find((r) => r.id === id)
  if (!rec) return { error: t('That work no longer exists') }
  await killSession(id, run)
  await writeRecords(records.filter((r) => r.id !== id))
  await dropFiles(id)
  const repo = rec.mode === 'worktree' ? (await readRepos()).find((r) => r.id === rec.repoId) : undefined
  // prune only drops entries whose folder is gone, so the branch is free to open again.
  if (repo) await run('git', ['-C', repo.path, 'worktree', 'prune'])
  return { ok: true }
}

/** W141: none or medium → high, low → medium, high → xhigh; undefined at the top. */
const oneUp = (effort: Effort | undefined): Effort | undefined =>
  effort === 'low' ? 'medium' : effort === 'high' ? 'xhigh' : effort === 'xhigh' ? undefined : 'high'

/** W141/W142: a stopped work starts again in its folder, in a session of the same name; never a second session. */
// Two reopens of one work at once (a reloaded window) would both see no session; the second's cleanup would kill the first's.
const reopening = new Set<string>()

export async function reopenWorkspace(id: string, opts: { more?: boolean }, run: Runner = defaultRun): Promise<WorkspaceResult> {
  if (reopening.has(id)) return { error: t('This work is already open.') }
  reopening.add(id)
  try {
    return await reopenOnce(id, opts, run)
  } finally {
    reopening.delete(id)
  }
}

async function reopenOnce(id: string, opts: { more?: boolean }, run: Runner): Promise<WorkspaceResult> {
  const blocked = await stateBlock()
  if (blocked) return blocked
  const records = await readRecords()
  const rec = records.find((r) => r.id === id)
  if (!rec) return { error: t('That work no longer exists') }
  const live = await hasSession(id, run)
  // Pane ids are reused after a server restart: only the record's pane in this session counts (W16).
  if (live && (await hasPane(id, rec.paneId, run)) && !(await paneDead(rec.paneId, run))) return { error: t('This work is already open.') }
  if (!existsSync(rec.path)) return { error: t('The folder of {branch} no longer exists.', { branch: rec.branch }), fix: 'forget' }
  const effort = opts.more === true ? oneUp(rec.effort) : rec.effort
  if (effort === undefined && opts.more === true) return { error: t('It is already at the highest effort.') }
  if (live) await killSession(id, run)
  const resume = existsSync(join(home(), 'transcripts', sessionName(id))) ? (true as const) : undefined
  let paneId: string
  try {
    paneId = await newSession(id, rec.path, agentArgv({ model: rec.model, effort, resume, lessons: await hasLessons(rec.path) }), run)
  } catch (err) {
    await killSession(id, run)
    return failed(t('tmux could not start the agent.'), err instanceof Error ? err.message : String(err))
  }
  const updated: WorkspaceRecord = { ...rec, paneId, ...(effort !== undefined && { effort }) }
  // Re-read: the list may have changed while tmux started.
  await writeRecords((await readRecords()).map((r) => (r.id === id ? updated : r)))
  return { workspace: { ...updated, alive: true } }
}

/** W134: the window sends an id; the folder comes from main's own records. */
export async function terminalAt(target: { repoId: string } | { id: string }, run: Runner = defaultRun): Promise<{ ok: true } | { error: string }> {
  const t0 = target as { repoId?: unknown; id?: unknown } | null
  let path: string | undefined
  if (typeof t0?.repoId === 'string') {
    path = (await readRepos()).find((r) => r.id === t0.repoId)?.path
    if (path === undefined) return { error: t('There is no repo “{id}”', { id: t0.repoId }) }
  } else if (typeof t0?.id === 'string') {
    path = (await readRecords()).find((r) => r.id === t0.id)?.path
  }
  if (path === undefined) return { error: t('That work no longer exists') }
  return inTerminal(`cd '${path.replace(/'/g, "'\\''")}' && git status`, run)
}
