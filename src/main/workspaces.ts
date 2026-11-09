import { randomInt } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Agent, Model, RemoveResult, WorkspaceRecord, WorkspaceResult, WorkspaceView } from '../preload/api'
import { agentArgv } from './agent'
import { detectMode, effectiveMode, type Repo } from './repos'
import { run as defaultRun, type Runner } from './run'
import { trustFolder } from './trust'
import { hasSession, killSession, newSession, sessionName } from './tmux'

export interface OpenInput {
  repoId: string
  branch: string
  agent: Agent
  model?: Model
  jiraKey?: string
  /** First message the agent receives (Start passes the Libretto flow command). */
  prompt?: string
  /** Tests swap the agent for a harmless long-running command. */
  argv?: string[]
}

const home = (): string => process.env['ATRIL_HOME'] ?? join(homedir(), '.atril')
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

const readRecords = async (): Promise<WorkspaceRecord[]> =>
  (await readJson<{ workspaces: WorkspaceRecord[] }>(join(home(), 'workspaces.json'), { workspaces: [] })).workspaces

async function writeRecords(workspaces: WorkspaceRecord[]): Promise<void> {
  await mkdir(home(), { recursive: true })
  await writeFile(join(home(), 'workspaces.json'), JSON.stringify({ workspaces }, null, 2) + '\n')
}

export async function openWorktree(input: OpenInput, run: Runner = defaultRun): Promise<WorkspaceResult> {
  const { repoId, branch, agent } = input
  // W6: nothing else runs before the branch name is validated.
  if ((await run('git', ['check-ref-format', '--branch', branch])).code !== 0) {
    return { error: `«${branch}» no es un nombre de rama válido` }
  }

  const repos = (await readJson<{ repos: Repo[] }>(join(home(), 'repos.json'), { repos: [] })).repos
  const repo = repos.find((r) => r.id === repoId)
  if (!repo) return { error: `No hay ningún repo «${repoId}»` }

  const detected = repo.override ? { mode: repo.override, reason: '' } : await detectMode(repo.path, run)
  const inPlace = effectiveMode(repo, detected).mode === 'in-place'

  let path: string
  let previousBranch: string | undefined
  if (inPlace) {
    if ((await readRecords()).some((r) => r.repoId === repoId && r.mode === 'in-place')) {
      return { error: 'Este repo trabaja in-place y ya tiene un trabajo abierto: ciérralo antes' }
    }
    const status = await run('git', ['-C', repo.path, 'status', '--porcelain'])
    if (status.code !== 0) return { error: status.stderr.trim() || 'git status falló' }
    if (status.stdout.trim() !== '') {
      return { error: 'La copia principal tiene cambios sin commitear: haz commit o descártalos antes' }
    }
    const current = (await run('git', ['-C', repo.path, 'branch', '--show-current'])).stdout.trim()
    // Detached HEAD has no branch name: the sha is what close switches back to.
    previousBranch = current || (await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])).stdout.trim()
    const exists = (await run('git', ['-C', repo.path, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`])).code === 0
    const sw = await run('git', ['-C', repo.path, 'switch', ...(exists ? [] : ['-c']), branch])
    if (sw.code !== 0) return { error: sw.stderr.trim() || 'git switch falló' }
    path = repo.path
  } else {
    path = worktreePath(repoId, branch)
    await mkdir(join(path, '..'), { recursive: true })
    const add = await run('git', ['-C', repo.path, 'worktree', 'add', '-b', branch, path])
    if (add.code !== 0) return { error: add.stderr.trim() || 'git worktree add falló' }
  }

  const head = await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])
  const id = newId()
  // Only folders Atril created: in-place runs in the person's own checkout, never touched (W31).
  if (!inPlace) await trustFolder(path)
  const paneId = await newSession(id, path, input.argv ?? agentArgv({ model: input.model, prompt: input.prompt }), run)

  const record: WorkspaceRecord = {
    id,
    repoId,
    branch,
    mode: inPlace ? 'in-place' : 'worktree',
    path,
    baseCommit: head.stdout.trim(),
    ...(previousBranch !== undefined && { previousBranch }),
    agent,
    ...(input.model && { model: input.model }),
    ...(input.jiraKey && { jiraKey: input.jiraKey }),
    session: sessionName(id),
    paneId
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
  if (!rec) return { error: 'Ese trabajo ya no existe' }
  const repo = (await readJson<{ repos: Repo[] }>(join(home(), 'repos.json'), { repos: [] })).repos.find((r) => r.id === rec.repoId)
  if (!repo) return { error: `No hay ningún repo «${rec.repoId}»` }

  const status = await run('git', ['-C', rec.path, 'status', '--porcelain'])
  if (status.code !== 0) return { error: status.stderr.trim() || 'git status falló' }
  if (status.stdout.trim() !== '') return { error: 'Tiene cambios sin commitear: haz commit o descártalos antes' }

  if (rec.mode === 'in-place') {
    // The main checkout is shared with the person: never switch them off a branch they chose by hand.
    const current = (await run('git', ['-C', rec.path, 'branch', '--show-current'])).stdout.trim()
    if (current !== rec.branch)
      return { error: `El repo está en la rama «${current || 'HEAD suelto'}», no en «${rec.branch}»: vuelve a «${rec.branch}» antes de cerrar` }
  }

  await killSession(id, run)
  if (rec.mode === 'in-place') {
    // Never delete the branch: the person's commits live there.
    const prev = rec.previousBranch ?? ''
    const back = await run('git', ['-C', rec.path, 'switch', ...(/^[0-9a-f]{40}$/.test(prev) ? ['--detach'] : []), prev])
    if (back.code !== 0) return { error: back.stderr.trim() || 'git switch falló' }
    await writeRecords(records.filter((r) => r.id !== id))
    return { ok: true }
  }
  // No --force: git itself refuses anything the status check missed.
  const rm = await run('git', ['-C', repo.path, 'worktree', 'remove', rec.path])
  if (rm.code !== 0) return { error: rm.stderr.trim() || 'git worktree remove falló' }
  await writeRecords(records.filter((r) => r.id !== id))
  return { ok: true }
}
