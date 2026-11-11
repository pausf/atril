import { existsSync } from 'node:fs'
import { agentArgv, effortError, MODELS } from '../agent'
import type { JiraCreds } from '../credentials/check'
import type { Effort, Model, StartIssue, StartProposalResult, StartRequest, StartResult } from '../../preload/api'
import { listRepos, rememberedRepo, rememberRepo } from '../repos'
import { run as defaultRun, type Runner } from '../run'
import { flowPrompt, openWorktree, worktreePath } from '../workspaces'
import { t } from '../lang'
import { netProblem } from '../net-problem'

export const KEY_RE = /^[A-Z][A-Z0-9]+-[0-9]+$/
const BAD_KEY = (key: string): string => t('«{key}» no es una clave de Jira válida (por ejemplo PF-123)', { key })

const memoryKey = ({ key, components }: StartIssue): string => `${key.slice(0, key.lastIndexOf('-'))}|${components[0] ?? ''}`

// What the dialog shows is what main runs: same argv, quoted only for display.
const display = (argv: string[]): string => argv.map((a) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `"${a}"`)).join(' ')

async function freeBranch(repo: { id: string; path: string }, key: string, run: Runner): Promise<{ branch: string; note?: string } | null> {
  const taken = async (b: string): Promise<boolean> =>
    existsSync(worktreePath(repo.id, b)) ||
    (await run('git', ['-C', repo.path, 'rev-parse', '--verify', '--quiet', `refs/heads/${b}`])).code === 0
  if (!(await taken(key))) return { branch: key }
  for (const letter of 'BCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const b = `${key}${letter}`
    if (!(await taken(b))) return { branch: b, note: t('«{key}» ya existe en este repo: se propone «{branch}»', { key, branch: b }) }
  }
  return null
}

export async function proposeStart(
  issue: StartIssue,
  opts: { repoId?: string; model?: Model; auto?: boolean; effort?: Effort } = {},
  run: Runner = defaultRun
): Promise<StartProposalResult> {
  if (!KEY_RE.test(issue.key)) return { error: BAD_KEY(issue.key) }
  const badEffort = effortError(opts.effort)
  if (badEffort) return { error: badEffort }
  // W41: the shown command is built from the same lists as the one that runs.
  if (opts.model !== undefined && !MODELS.includes(opts.model)) return { error: t('«{model}» no es un modelo disponible', { model: String(opts.model) }) }
  const command = display(agentArgv({ model: opts.model, effort: opts.effort, prompt: flowPrompt(issue.key, opts.auto) }))
  const repos = await listRepos(run)
  if (!Array.isArray(repos)) return repos.problem
  const wanted = opts.repoId ?? (await rememberedRepo(memoryKey(issue)))
  const repo = repos.find((r) => r.id === wanted)
  if (!repo) return { command }
  const free = await freeBranch(repo, issue.key, run)
  if (!free) return { error: t('Todas las ramas {key}, {key}B… {key}Z están ocupadas', { key: issue.key }) }
  return { repoId: repo.id, branch: free.branch, mode: repo.mode, reason: repo.reason, command, ...(free.note && { note: free.note }) }
}

interface Deps {
  run?: Runner
  /** null: Jira not connected. */
  creds: JiraCreds | null
  fetchImpl?: typeof fetch
}

export async function start(req: StartRequest, deps: Deps): Promise<StartResult> {
  const { run = defaultRun } = deps
  if (!KEY_RE.test(req.key)) return { error: BAD_KEY(req.key) }
  if (!MODELS.includes(req.model)) return { error: t('«{model}» no es un modelo disponible', { model: String(req.model) }) }
  const badEffort = effortError(req.effort)
  if (badEffort) return { error: badEffort }

  const opened = await openWorktree(
    { repoId: req.repoId, branch: req.branch, agent: 'claude', model: req.model, effort: req.effort, jiraKey: req.key, auto: req.auto, prompt: flowPrompt(req.key, req.auto), ...(req.worktree === true && { worktree: true }) },
    run
  )
  if ('error' in opened) return opened
  await rememberRepo(memoryKey(req), req.repoId)

  // Already in progress: nothing to move.
  if (req.group === 'doing') return { workspace: opened.workspace }
  const transitionError = await moveToInProgress(req.key, deps.creds, deps.fetchImpl)
  return transitionError ? { workspace: opened.workspace, transitionError } : { workspace: opened.workspace }
}

interface Transition {
  id?: unknown
  name?: unknown
  to?: { statusCategory?: { key?: unknown } }
}

// Returns an error message, or null when the issue moved. Never echoes network errors (they can carry the token).
async function moveToInProgress(key: string, creds: JiraCreds | null, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (!creds) return t('No se pudo pasar a In Progress: conecta Jira en Ajustes.')
  const url = new URL(`/rest/api/3/issue/${key}/transitions`, new URL(creds.site.trim()).origin)
  const headers = {
    Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.token}`).toString('base64')}`,
    Accept: 'application/json'
  }
  try {
    const list = await fetchImpl(url, { method: 'GET', headers, signal: AbortSignal.timeout(10_000) })
    if (!list.ok) return t('No se pudo pasar a In Progress: {detail}', { detail: netProblem('Jira', { status: list.status }).error })
    const options = ((await list.json()) as { transitions?: Transition[] }).transitions ?? []
    const open = options.filter((tr) => tr.to?.statusCategory?.key === 'indeterminate')
    const pick = open.find((tr) => typeof tr.name === 'string' && /progress|curso/i.test(tr.name)) ?? open[0]
    if (typeof pick?.id !== 'string') return t('No se pudo pasar a In Progress: Jira no ofrece esa transición desde su estado actual.')

    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transition: { id: pick.id } }),
      signal: AbortSignal.timeout(10_000)
    })
    return res.ok ? null : t('No se pudo pasar a In Progress: {detail}', { detail: netProblem('Jira', { status: res.status }).error })
  } catch (err) {
    return err instanceof Error && err.name === 'TimeoutError'
      ? t('No se pudo pasar a In Progress: Jira no ha respondido en 10 s.')
      : t('No se pudo pasar a In Progress: no se ha podido conectar con Jira.')
  }
}
