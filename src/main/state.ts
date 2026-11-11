import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { StateFile, StateProblem, WorkspaceRecord } from '../preload/api'
import type { Repo } from './repos'
import { atrilHome } from './paths'
import { t } from './lang'

export const statePath = (file: StateFile): string => join(atrilHome(), `${file}.json`)

/** W144/W148: the file exists but cannot be used; `detail` is the code or the parse message. */
export class StateError extends Error {
  constructor(
    readonly file: StateFile,
    readonly detail: string
  ) {
    super(`${file}.json: ${detail}`)
  }
}

// The fields every other part of Atril reads without checking.
const REQUIRED: Record<StateFile, string[]> = { workspaces: ['id', 'path', 'branch', 'session'], repos: ['id', 'path'] }

export async function readState(file: 'workspaces'): Promise<{ workspaces: WorkspaceRecord[] }>
export async function readState(file: 'repos'): Promise<{ repos: Repo[]; jiraRepos?: Record<string, string> }>
export async function readState(file: StateFile): Promise<Record<string, unknown>> {
  let raw: string
  try {
    raw = await readFile(statePath(file), 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { [file]: [] }
    throw new StateError(file, code ?? String(err))
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new StateError(file, err instanceof Error ? err.message : String(err))
  }
  const list = (data as Record<string, unknown> | null)?.[file]
  if (typeof data !== 'object' || data === null || Array.isArray(data) || !Array.isArray(list)) throw new StateError(file, `"${file}" is not a list`)
  list.forEach((entry: unknown, n) => {
    const missing = REQUIRED[file].find((k) => typeof (entry as Record<string, unknown> | null)?.[k] !== 'string')
    if (missing) throw new StateError(file, `entry ${n} has no string "${missing}"`)
  })
  return data as Record<string, unknown>
}

export const stateProblem = (err: StateError): StateProblem => ({
  error:
    err.file === 'workspaces'
      ? t('No puedo leer workspaces.json: está dañado. No abro ni cierro trabajos hasta que se arregle.')
      : t('No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.'),
  detail: err.detail,
  fix: 'reveal',
  file: err.file
})

/** Both files read strictly before anything is changed; the problem of the first damaged one. */
export async function stateBlock(): Promise<StateProblem | undefined> {
  try {
    await readState('workspaces')
    await readState('repos')
    return undefined
  } catch (err) {
    if (err instanceof StateError) return stateProblem(err)
    throw err
  }
}

/** Runs `fn`; a damaged state file becomes its problem instead of a rejection. */
export async function orProblem<T>(fn: () => Promise<T>): Promise<T | StateProblem> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof StateError) return stateProblem(err)
    throw err
  }
}

/** W147: only the two state files by name; a missing one shows Atril's folder. */
export function revealState(file: unknown, show: (path: string) => void): boolean {
  if (file !== 'workspaces' && file !== 'repos') return false
  const path = statePath(file)
  show(existsSync(path) ? path : atrilHome())
  return true
}
