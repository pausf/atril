import { lstat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { QaBugRequest, QaBugResult, QaEntry, QaReport, QaResult, QaStep } from '../preload/api'
import type { JiraBoard } from '../preload/api'
import type { JiraCreds } from './credentials/check'
import { t } from './lang'
import { createIssue } from './libretto'
import { launchQa, qaPane, reportFile, shotsDir } from './qa'
import { qaTargets } from './qa-targets'
import { readCriteria } from './qa-criteria'
import type { Runner } from './run'
import { liveWorkspace, replyGone } from './status'
import { pasteText, sendText } from './tmux'
import { readRecords } from './workspaces'

const MAX_TEXT = 400
const MAX_STEPS = 30
const MAX_FILE = 1024 * 1024
const STATUSES = ['pass', 'fail', 'untested'] as const

const cut = (v: unknown): string => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : '')
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** A step's screenshot counts only as a bare file name of the QA folder: never a path, never a link. */
async function shotOf(dir: string, name: unknown): Promise<{ shot: string; shotAt: number } | null> {
  if (typeof name !== 'string' || name === '' || name === '..' || /[\\/\0]/.test(name)) return null
  const st = await lstat(join(dir, name)).catch(() => null)
  return st?.isFile() ? { shot: name, shotAt: st.mtimeMs } : null
}

async function validStep(dir: string, raw: unknown): Promise<QaStep | null> {
  if (!isObject(raw) || typeof raw['text'] !== 'string') return null
  const ms = raw['ms']
  return {
    text: cut(raw['text']),
    ...(typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 && { ms }),
    ...(await shotOf(dir, raw['shot']))
  }
}

/** W114: report.json is a model's text: only what validates is answered. */
async function readEntries(id: string, ids: Set<string>): Promise<{ entries: QaEntry[]; at: number }> {
  const file = reportFile(id)
  const st = await lstat(file).catch(() => null)
  if (!st?.isFile() || st.size > MAX_FILE) return { entries: [], at: 0 }
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return { entries: [], at: 0 }
  }
  const list = isObject(parsed) ? parsed['criteria'] : null
  if (!Array.isArray(list)) return { entries: [], at: st.mtimeMs }
  const byId = new Map<string, QaEntry>()
  for (const raw of list) {
    if (!isObject(raw) || typeof raw['id'] !== 'string' || !ids.has(raw['id'])) continue
    const status = STATUSES.find((s) => s === raw['status'])
    if (!status) continue
    const steps = (await Promise.all((Array.isArray(raw['steps']) ? raw['steps'] : []).slice(0, MAX_STEPS).map((s) => validStep(shotsDir(id), s)))).filter((s): s is QaStep => s !== null)
    byId.delete(raw['id'])
    byId.set(raw['id'], { id: raw['id'], status, note: cut(raw['note']), steps })
  }
  return { entries: [...byId.values()], at: st.mtimeMs }
}

async function recordOf(id: string) {
  return (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
}

/** W113: what the QA screen reads every 3 s; null for a workspace that is not in the list. */
export async function qaReport(id: string, run: Runner): Promise<QaReport | null> {
  const ws = await recordOf(id)
  if (!ws) return null
  const { change, criteria } = await readCriteria(ws.path)
  const [{ entries, at }, listed, head] = await Promise.all([
    readEntries(id, new Set(criteria.map((c) => c.id))),
    qaTargets(id),
    run('git', ['-C', ws.path, 'rev-parse', '--short', 'HEAD'])
  ])
  const targets = listed?.targets ?? []
  return { change, criteria, entries, at, target: targets.find((x) => x.key === listed?.chosen) ?? null, targets, note: listed?.note ?? null, branch: ws.branch, head: head.code === 0 ? head.stdout.trim() : '' }
}

/** W116: types the request into the live QA pane, or launches QA with it at the end of its prompt. */
export async function qaRetest(id: string, criterion: string | null, run: Runner): Promise<QaResult> {
  const ws = await recordOf(id)
  if (!ws) return { error: t('Ese trabajo ya no existe') }
  const { criteria } = await readCriteria(ws.path)
  const found = criterion === null ? null : criteria.find((c) => c.id === criterion)
  if (criterion !== null && !found) return { error: t('Ese criterio ya no está en el cambio') }
  const request = found
    ? t('Prueba solo el criterio {id}: {text}. Actualiza report.json.', { id: found.id, text: found.text.replace(/\.+$/, '') })
    : t('Prueba otra vez todos los criterios y actualiza report.json.')
  const pane = await qaPane(id, run)
  if (!pane) return launchQa(id, run, request)
  return (await sendText(pane, request, run)) ? { ok: true } : { error: t('No se pudo escribir en el QA') }
}

interface BugDeps {
  run: Runner
  creds: JiraCreds | null
  board: JiraBoard | null
  fetchImpl?: typeof fetch
}

/** W118: one issue in Jira, or one bracketed paste into the workspace's agent pane. */
export async function qaBug(id: string, req: QaBugRequest, deps: BugDeps): Promise<QaBugResult> {
  const { title, body } = (isObject(req) ? req : {}) as Partial<QaBugRequest>
  if (typeof title !== 'string' || typeof body !== 'string' || title.trim() === '' || (req.to !== 'jira' && req.to !== 'agent')) return { error: t('El bug no tiene título') }
  if (!(await recordOf(id))) return { error: t('Ese trabajo ya no existe') }
  if (req.to === 'jira') {
    if (!deps.creds || !deps.board) return { error: t('Conecta Jira y elige un tablero en Ajustes.') }
    return createIssue(deps.creds, deps.board, title.trim(), body, deps.fetchImpl)
  }
  const ws = await liveWorkspace(id, deps.run)
  if (!ws) return { error: replyGone() }
  return (await pasteText(ws.paneId, `${title.trim()}\n\n${body}`, deps.run)) ? { ok: true } : { error: replyGone() }
}
