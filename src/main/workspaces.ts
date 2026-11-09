import { randomInt } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Agent, RemoveResult, WorkspaceRecord, WorkspaceResult, WorkspaceView } from '../preload/api'
import { agentArgv } from './agent'
import { detectMode, effectiveMode, type Repo } from './repos'
import { run as defaultRun, type Runner } from './run'
import { hasSession, killSession, newSession, sessionName } from './tmux'

export interface OpenInput {
  repoId: string
  branch: string
  agent: Agent
  /** Tests swap the agent for a harmless long-running command. */
  argv?: string[]
}

const home = (): string => process.env['ATRIL_HOME'] ?? join(homedir(), '.atril')
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
  if (effectiveMode(repo, detected).mode === 'in-place') return { error: 'in-place llega en la casilla 4' }

  const path = join(home(), 'wt', repoId, branch)
  await mkdir(join(path, '..'), { recursive: true })
  const add = await run('git', ['-C', repo.path, 'worktree', 'add', '-b', branch, path])
  if (add.code !== 0) return { error: add.stderr.trim() || 'git worktree add falló' }

  const head = await run('git', ['-C', repo.path, 'rev-parse', 'HEAD'])
  const id = newId()
  const paneId = await newSession(id, path, input.argv ?? agentArgv(), run)

  const record: WorkspaceRecord = {
    id,
    repoId,
    branch,
    mode: 'worktree',
    path,
    baseCommit: head.stdout.trim(),
    agent,
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

  await killSession(id, run)
  // No --force: git itself refuses anything the status check missed.
  const rm = await run('git', ['-C', repo.path, 'worktree', 'remove', rec.path])
  if (rm.code !== 0) return { error: rm.stderr.trim() || 'git worktree remove falló' }
  await writeRecords(records.filter((r) => r.id !== id))
  return { ok: true }
}
