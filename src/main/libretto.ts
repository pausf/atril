import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LibrettoInFlight, LibrettoQueued, LibrettoState, WorkspaceResult } from '../preload/api'
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
      const r = reading(text)
      queued.push({ name, date, ...(r !== undefined && { reading: r }), started: branches.has(`feat/${name}`) })
      continue
    }
    const c = await readChecklist(join(dir, name))
    inFlight.push({ name, closed: c?.closed ?? 0, total: c?.total ?? 0, ...(c?.firstOpen !== undefined && { firstOpen: c.firstOpen }) })
  }
  queued.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
  return { queued, inFlight }
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
  const quoted = ask.split('\n').map((l) => `> ${l.trimEnd()}`.trimEnd()).join('\n')
  await mkdir(join(dir, name))
  await writeFile(join(repoPath, rel(name)), `# ${name}\n\nTracker: none\nQueued: ${today()}\n\n## The ask, verbatim\n\n${quoted}\n\n## Reading\n\n`)
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
