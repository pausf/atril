import { randomInt } from 'node:crypto'
import { mkdir, readFile, rename, rm as unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Agent, Model, RemoveResult, WorkspaceRecord, WorkspaceResult, WorkspaceView } from '../preload/api'
import { agentArgv } from './agent'
import { detectMode, effectiveMode, type Repo } from './repos'
import { run as defaultRun, type Runner } from './run'
import { trustFolder } from './trust'
import { hasSession, killSession, newSession, sessionName } from './tmux'
import { atrilHome } from './paths'
import { appendHistory, historyEntry } from './history'
import { t } from './lang'

export interface OpenInput {
  repoId: string
  branch: string
  agent: Agent
  model?: Model
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
  /** Tests swap the agent for a harmless long-running command; the prompt is still appended. */
  argv?: string[]
}

const home = atrilHome
export const worktreePath = (repoId: string, branch: string): string => join(home(), 'wt', repoId, branch)
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const newId = (): string => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw err
  }
}

/** W91: the workspace the Libretto panel, its documents, Cambios and QA may read; a review session has none. */
export async function flowWorkspace(id: string, run: Runner = defaultRun): Promise<WorkspaceView | undefined> {
  return (await listWorkspaces(run)).find((w) => w.id === id && w.mode !== 'review')
}

export const readRecords = async (): Promise<WorkspaceRecord[]> =>
  (await readJson<{ workspaces: WorkspaceRecord[] }>(join(home(), 'workspaces.json'), { workspaces: [] })).workspaces

export async function writeRecords(workspaces: WorkspaceRecord[]): Promise<void> {
  await mkdir(home(), { recursive: true })
  // Readers (watchers, the status poll) run while this writes: a temp file and a rename keep them whole.
  const file = join(home(), 'workspaces.json')
  const temp = `${file}.${process.pid}.${newId()}.tmp`
  await writeFile(temp, JSON.stringify({ workspaces }, null, 2) + '\n')
  await rename(temp, file)
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

/** W60, W65 and W92: what the hook keeps by session name dies with the workspace. */
const dropFiles = (id: string): Promise<unknown> =>
  Promise.all([autoMarker(id), join(home(), 'subagents', `${sessionName(id)}.json`), join(home(), 'paused', sessionName(id)), join(home(), 'transcripts', sessionName(id))].map((f) => unlink(f, { force: true })))

export async function openWorktree(input: OpenInput, run: Runner = defaultRun): Promise<WorkspaceResult> {
  const { repoId, branch, agent } = input
  const prompt = input.task === undefined ? input.prompt : taskPrompt(input.task, input.auto)
  if (prompt === null) return { error: t('El texto de la tarea no es válido (máx. 2000 caracteres).') }
  // W6: nothing else runs before the branch name is validated.
  if ((await run('git', ['check-ref-format', '--branch', branch])).code !== 0) {
    return { error: t('«{branch}» no es un nombre de rama válido', { branch }) }
  }

  const repos = (await readJson<{ repos: Repo[] }>(join(home(), 'repos.json'), { repos: [] })).repos
  const repo = repos.find((r) => r.id === repoId)
  if (!repo) return { error: t('No hay ningún repo «{id}»', { id: repoId }) }

  const review = input.review === true
  const detected = review ? null : repo.override ? { mode: repo.override, reason: '' } : await detectMode(repo.path, run)
  const inPlace = detected !== null && effectiveMode(repo, detected).mode === 'in-place'
  if (inPlace && input.existing === true) return { error: t('Este repo trabaja en tu copia: cambia de rama a mano') }

  let path: string
  let previousBranch: string | undefined
  let fetched: string | undefined
  if (review) {
    path = repo.path
  } else if (inPlace) {
    if ((await readRecords()).some((r) => r.repoId === repoId && r.mode === 'in-place')) {
      return { error: t('Este repo trabaja in-place y ya tiene un trabajo abierto: ciérralo antes') }
    }
    const status = await run('git', ['-C', repo.path, 'status', '--porcelain'])
    if (status.code !== 0) return { error: status.stderr.trim() || t('git status falló') }
    if (status.stdout.trim() !== '') {
      return { error: t('La copia principal tiene cambios sin commitear: haz commit o descártalos antes') }
    }
    const current = (await run('git', ['-C', repo.path, 'branch', '--show-current'])).stdout.trim()
    // Detached HEAD has no branch name: the sha is what close switches back to.
    previousBranch = current || (await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])).stdout.trim()
    const exists = (await run('git', ['-C', repo.path, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`])).code === 0
    const sw = await run('git', ['-C', repo.path, 'switch', ...(exists ? [] : ['-c']), branch])
    if (sw.code !== 0) return { error: sw.stderr.trim() || t('git switch falló') }
    path = repo.path
  } else {
    path = worktreePath(repoId, branch)
    let where = ['-b', branch, path]
    if (input.existing === true) {
      const remote = input.remote ?? 'origin'
      const fetch = await run('git', ['-C', repo.path, 'fetch', remote, branch])
      if (fetch.code !== 0) return { error: t('No se pudo traer la rama: {detail}', { detail: fetch.stderr.trim() || fetch.code }) }
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
    await mkdir(join(path, '..'), { recursive: true })
    const add = await run('git', ['-C', repo.path, 'worktree', 'add', ...where])
    if (add.code !== 0) return { error: add.stderr.trim() || t('git worktree add falló') }
  }

  const head = fetched === undefined ? (await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])).stdout.trim() : fetched
  const id = newId()
  // Only folders Atril created: in-place and review run in the person's own checkout, never touched (W31).
  if (!inPlace && !review) await trustFolder(path)
  const auto = input.auto === true
  if (auto) {
    await mkdir(join(home(), 'auto'), { recursive: true })
    await writeFile(autoMarker(id), '')
  }
  const argv = input.argv ? [...input.argv, ...(prompt ? [prompt] : [])] : agentArgv({ model: input.model, prompt })
  const paneId = await newSession(id, path, argv, run).catch(async (err: unknown) => {
    // W60: no session, no record: the marker would never be removed.
    if (auto) await unlink(autoMarker(id), { force: true })
    throw err
  })

  const record: WorkspaceRecord = {
    id,
    repoId,
    branch,
    mode: review ? 'review' : inPlace ? 'in-place' : 'worktree',
    path,
    baseCommit: head,
    ...(previousBranch !== undefined && { previousBranch }),
    agent,
    ...(input.model && { model: input.model }),
    ...(input.jiraKey && { jiraKey: input.jiraKey }),
    ...(auto && { auto }),
    session: sessionName(id),
    paneId,
    createdAt: Math.floor(Date.now() / 1000)
  }
  await writeRecords([...(await readRecords()), record])
  return { workspace: { ...record, alive: true } }
}

// Reads state only: starting nothing here is what makes a relaunch safe (W12).
export async function listWorkspaces(run: Runner = defaultRun): Promise<WorkspaceView[]> {
  return Promise.all((await readRecords()).map(async (r) => ({ ...r, alive: await hasSession(r.id, run) })))
}

export async function removeWorkspace(id: string, run: Runner = defaultRun): Promise<RemoveResult> {
  const records = await readRecords()
  const rec = records.find((r) => r.id === id)
  if (!rec) return { error: t('Ese trabajo ya no existe') }
  if (rec.mode === 'review') {
    // W90: the folder is the person's own repo; ending the session is all there is to undo.
    await killSession(id, run)
    await writeRecords(records.filter((r) => r.id !== id))
    await dropFiles(id)
    return { ok: true }
  }

  const repo = (await readJson<{ repos: Repo[] }>(join(home(), 'repos.json'), { repos: [] })).repos.find((r) => r.id === rec.repoId)
  if (!repo) return { error: t('No hay ningún repo «{id}»', { id: rec.repoId }) }

  const status = await run('git', ['-C', rec.path, 'status', '--porcelain'])
  if (status.code !== 0) return { error: status.stderr.trim() || t('git status falló') }
  if (status.stdout.trim() !== '') return { error: t('Tiene cambios sin commitear: haz commit o descártalos antes') }

  if (rec.mode === 'in-place') {
    // The main checkout is shared with the person: never switch them off a branch they chose by hand.
    const current = (await run('git', ['-C', rec.path, 'branch', '--show-current'])).stdout.trim()
    if (current !== rec.branch)
      return { error: t('El repo está en la rama «{current}», no en «{branch}»: vuelve a «{branch}» antes de cerrar', { current: current || t('HEAD suelto'), branch: rec.branch }) }
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
    if (back.code !== 0) return { error: back.stderr.trim() || t('git switch falló') }
    return done()
  }
  // No --force: git itself refuses anything the status check missed.
  const rm = await run('git', ['-C', repo.path, 'worktree', 'remove', rec.path])
  if (rm.code !== 0) return { error: rm.stderr.trim() || t('git worktree remove falló') }
  return done()
}
