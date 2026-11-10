import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IdeaJiraResult, IdeaResult, JiraBoard, LibrettoCounts, LibrettoInFlight, LibrettoQueued, LibrettoState, WorkspaceResult } from '../preload/api'
import type { JiraCreds } from './credentials/check'
import { t } from './lang'
import { readChecklist } from './flow/checklist'
import { changeFolders } from './flow/stage'
import { readRepos } from './repos'
import { run as defaultRun, type Runner } from './run'
import { openWorktree } from './workspaces'

const QUEUED = /^Queued:[ \t]*(\d{4}-\d{2}-\d{2})[ \t]*$/m
const MAX_NAME = 40
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]*$/i

const changesDir = (root: string): string => join(root, '.agents', 'changes')
const rel = (name: string): string => join('.agents', 'changes', name, 'proposal.md')

// The queue marker only counts above the first heading, as `/libretto-queue` writes it.
const header = (text: string): string => text.split(/^## /m)[0] ?? ''

function reading(text: string): string | undefined {
  const body = /^## Reading[ \t]*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(text)?.[1]
  return body?.split('\n').find((l) => l.trim() !== '')?.trim()
}

const ASK = /^## The ask, verbatim[ \t]*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m
const unquote = (l: string): string => l.replace(/^> ?/, '').trimEnd()
const askLines = (text: string): string[] => (ASK.exec(text)?.[1] ?? '').split('\n').map(unquote)
const askText = (text: string): string => askLines(text).join('\n').trim()
const firstLine = (text: string): string | undefined => askLines(text).find((l) => l.trim() !== '')?.trim()
const quote = (ask: string): string => ask.split('\n').map((l) => `> ${l.trimEnd()}`.trimEnd()).join('\n')

export async function librettoState(repoPath: string, run: Runner = defaultRun): Promise<LibrettoState> {
  const dir = changesDir(repoPath)
  if (!(await stat(dir).then((s) => s.isDirectory(), () => false))) return { none: true }
  const branches = new Set((await run('git', ['-C', repoPath, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/feat/'])).stdout.split('\n'))
  const queued: LibrettoQueued[] = []
  const inFlight: LibrettoInFlight[] = []
  for (const name of await changeFolders(dir)) {
    const text = await readFile(join(dir, name, 'proposal.md'), 'utf8').catch(() => '')
    const date = QUEUED.exec(header(text))?.[1]
    if (date !== undefined) {
      const r = reading(text) ?? firstLine(text)
      queued.push({ name, date, ask: askText(text), ...(r !== undefined && { reading: r }), started: branches.has(`feat/${name}`) })
      continue
    }
    const c = await readChecklist(join(dir, name))
    inFlight.push({ name, closed: c?.closed ?? 0, total: c?.total ?? 0, ...(c?.firstOpen !== undefined && { firstOpen: c.firstOpen }) })
  }
  queued.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
  return { queued, inFlight }
}

export async function librettoCounts(repoPath: string, run: Runner = defaultRun): Promise<LibrettoCounts> {
  const s = await librettoState(repoPath, run)
  return 'queued' in s ? { none: false, queued: s.queued.length, inFlight: s.inFlight.length } : { none: true, queued: 0, inFlight: 0 }
}

const slug = (text: string): string =>
  (text.split('\n')[0] ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const taken = (dir: string, name: string): Promise<boolean> => stat(join(dir, name)).then(() => true, () => false)

async function freeName(dir: string, text: string): Promise<string> {
  const base = slug(text).slice(0, MAX_NAME).replace(/-+$/, '') || 'idea'
  if (!(await taken(dir, base))) return base
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const name = `${base.slice(0, MAX_NAME - suffix.length).replace(/-+$/, '')}${suffix}`
    if (!(await taken(dir, name))) return name
  }
}

/** What `/libretto-queue` does in its steps 2–3, without a model. The commit names the file so nothing else staged rides along. */
export async function queueIdea(repoPath: string, text: string, run: Runner = defaultRun): Promise<{ name: string } | { error: string }> {
  const ask = text.trim()
  if (ask === '') return { error: t('Escribe la idea antes de encolarla.') }
  const dir = changesDir(repoPath)
  if (!(await stat(dir).then((s) => s.isDirectory(), () => false))) return { error: t('Este repo no usa Libretto') }

  const name = await freeName(dir, ask)
  await mkdir(join(dir, name))
  await writeFile(join(repoPath, rel(name)), `# ${name}\n\nTracker: none\nQueued: ${today()}\n\n## The ask, verbatim\n\n${quote(ask)}\n\n## Reading\n\n${ask.split('\n')[0]?.trim()}\n`)
  const add = await run('git', ['-C', repoPath, 'add', '--', rel(name)])
  const commit = add.code === 0 ? await run('git', ['-C', repoPath, 'commit', '-q', '-m', `docs(queue): capture ${name}`, '--', rel(name)]) : add
  if (commit.code !== 0) {
    await run('git', ['-C', repoPath, 'reset', '-q', '--', rel(name)])
    await rm(join(dir, name), { recursive: true, force: true })
    return { error: commit.stderr.trim() || t('git commit falló') }
  }
  return { name }
}

/**
 * `/libretto-next` step 3 by hand: the branch is the workspace's, `Queued:` goes in a commit there, and the agent's first
 * message is step 4. The commit runs before the agent exists, so its first message is the argv prompt, not a typed reply.
 */
export async function startQueued(repoId: string, name: string, run: Runner = defaultRun): Promise<WorkspaceResult> {
  if (typeof name !== 'string' || !SAFE_NAME.test(name) || name.includes('..')) return { error: t('Esa idea no existe') }
  const repo = (await readRepos()).find((r) => r.id === repoId)
  if (!repo) return { error: t('No hay ningún repo «{id}»', { id: repoId }) }
  const prepare = async (path: string): Promise<string | undefined> => {
    const file = join(path, rel(name))
    const text = await readFile(file, 'utf8').catch(() => null)
    if (text === null || !QUEUED.test(header(text))) return t('Esa idea no existe')
    const [head, ...rest] = text.split(/^## /m)
    await writeFile(file, [(head ?? '').replace(QUEUED, '').replace(/\n{3,}/g, '\n\n'), ...rest].join('## '))
    const commit = await run('git', ['-C', path, 'commit', '-q', '-m', `docs(queue): start ${name}`, '--', rel(name)])
    return commit.code === 0 ? undefined : commit.stderr.trim() || t('git commit falló')
  }
  return openWorktree({ repoId, branch: `feat/${name}`, agent: 'claude', prompt: `/libretto:write-spec ${name}` }, run, prepare)
}

const unsafe = (name: unknown): boolean => typeof name !== 'string' || !SAFE_NAME.test(name) || name.includes('..')

/** Only an idea that is still queued may be edited, dropped or sent: a `Queued:` line and no `feat/<name>` branch. */
async function queuedProposal(repoPath: string, name: string, run: Runner): Promise<{ file: string; text: string } | { error: string }> {
  const missing = { error: t('Esa idea no existe') }
  if (unsafe(name)) return missing
  const file = join(repoPath, rel(name))
  const text = await readFile(file, 'utf8').catch(() => null)
  if (text === null || !QUEUED.test(header(text))) return missing
  const branch = await run('git', ['-C', repoPath, 'rev-parse', '--verify', '--quiet', `refs/heads/feat/${name}`])
  return branch.code === 0 ? { error: t('Esa idea ya está empezada') } : { file, text }
}

export async function editIdea(repoPath: string, name: string, text: string, run: Runner = defaultRun): Promise<IdeaResult> {
  const ask = typeof text === 'string' ? text.trim() : ''
  if (ask === '') return { error: t('Escribe la idea antes de guardarla.') }
  const found = await queuedProposal(repoPath, name, run)
  if ('error' in found) return found
  if (!ASK.test(found.text)) return { error: t('Esa idea no existe') }
  // A replacer function: the request may hold «$&» and the like.
  const next = found.text.replace(ASK, () => `## The ask, verbatim\n\n${quote(ask)}\n\n`)
  if (next === found.text) return { ok: true }
  await writeFile(found.file, next)
  const commit = await run('git', ['-C', repoPath, 'commit', '-q', '-m', `docs(queue): edit ${name}`, '--', rel(name)])
  if (commit.code === 0) return { ok: true }
  await writeFile(found.file, found.text)
  return { error: commit.stderr.trim() || t('git commit falló') }
}

export async function dropIdea(repoPath: string, name: string, run: Runner = defaultRun, message = `docs(queue): drop ${name}`): Promise<IdeaResult> {
  const found = await queuedProposal(repoPath, name, run)
  if ('error' in found) return found
  const folder = join('.agents', 'changes', name)
  const rm1 = await run('git', ['-C', repoPath, 'rm', '-r', '-q', '--ignore-unmatch', '--', folder])
  const commit = rm1.code === 0 ? await run('git', ['-C', repoPath, 'commit', '-q', '-m', message, '--', folder]) : rm1
  if (commit.code !== 0) {
    await run('git', ['-C', repoPath, 'reset', '-q', '--', folder])
    await run('git', ['-C', repoPath, 'checkout', '--', folder])
    return { error: commit.stderr.trim() || t('git commit falló') }
  }
  await rm(join(repoPath, folder), { recursive: true, force: true })
  return { ok: true }
}

interface JiraDeps {
  run?: Runner
  /** null: Jira not connected. */
  creds: JiraCreds | null
  board: JiraBoard | null
  fetchImpl?: typeof fetch
}

interface IssueType {
  id?: unknown
  name?: unknown
  subtask?: unknown
}

const SUMMARY_MAX = 255

class JiraStatus extends Error {}

const adf = (lines: string[]): unknown => ({
  type: 'doc',
  version: 1,
  content: lines.map((l) => ({ type: 'paragraph', content: l === '' ? [] : [{ type: 'text', text: l }] }))
})

/** Creates the issue and returns its key, or an error that never carries what Jira or the network said (it can echo the token). */
async function createIssue(request: string, creds: JiraCreds, board: JiraBoard, fetchImpl: typeof fetch): Promise<{ key: string } | { error: string }> {
  const origin = new URL(creds.site.trim()).origin
  const headers = { Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.token}`).toString('base64')}`, Accept: 'application/json' }
  const call = async (path: string, init: RequestInit = {}): Promise<unknown> => {
    const res = await fetchImpl(new URL(path, origin), { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new JiraStatus(t('Jira respondió {status}.', { status: res.status }))
    return res.json()
  }
  try {
    const projectKey = ((await call(`/rest/agile/1.0/board/${board.id}`)) as { location?: { projectKey?: unknown } }).location?.projectKey
    if (typeof projectKey !== 'string') return { error: t('El tablero no tiene un proyecto.') }
    const meta = (await call(`/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`)) as { issueTypes?: IssueType[]; values?: IssueType[] }
    const types = meta.issueTypes ?? meta.values ?? []
    const pick = types.find((x) => x.name === 'Task') ?? types.find((x) => x.subtask === false)
    if (typeof pick?.id !== 'string') return { error: t('El proyecto no admite tareas.') }
    const created = (await call('/rest/api/3/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          issuetype: { id: pick.id },
          summary: (request.split('\n')[0] ?? '').slice(0, SUMMARY_MAX),
          description: adf(request.split('\n'))
        }
      })
    })) as { key?: unknown }
    return typeof created.key === 'string' ? { key: created.key } : { error: t('Jira no devolvió la clave.') }
  } catch (err) {
    if (err instanceof JiraStatus) return { error: err.message }
    return { error: err instanceof Error && err.name === 'TimeoutError' ? t('Jira no ha respondido en 10 s.') : t('No se ha podido conectar con Jira.') }
  }
}

export async function ideaToJira(repoPath: string, name: string, deps: JiraDeps): Promise<IdeaJiraResult> {
  const { run = defaultRun, creds, board, fetchImpl = fetch } = deps
  const found = await queuedProposal(repoPath, name, run)
  if ('error' in found) return found
  if (!creds || !board) return { error: t('Conecta Jira y elige un tablero en Ajustes.') }
  const issue = await createIssue(askText(found.text), creds, board, fetchImpl)
  if ('error' in issue) return issue
  const dropped = await dropIdea(repoPath, name, run, `docs(queue): ${issue.key} en Jira, ${name}`)
  return 'error' in dropped ? { key: issue.key, error: dropped.error } : { key: issue.key }
}
