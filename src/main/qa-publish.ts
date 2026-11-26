import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ForgeId, MrLists, MrReply, QaMr, QaPrepared, QaPublishResult, QaReport } from '../preload/api'
import { remoteNaming } from './forge/openmr'
import { qaBlock, qaLines, qaTitle, type createQaHosting, type MrRef, type MrState, type Problem } from './forge/qa-hosting'
import { t } from './lang'
import { atrilHome } from './paths'
import { createPictures } from './qa-pictures'
import { qaReport } from './qa-report'
import { readRepos } from './repos'
import type { Runner } from './run'
import { readRecords } from './workspaces'

type T = (es: string, vars?: Record<string, string | number>) => string

const FRESH_MS = 60_000
const BEFORE_READS = 5
const LEDGER_ROWS = 500

/** W170: the comment, in the language `t` speaks; blank lines keep a quote from swallowing the next line. */
export function qaSummary(report: QaReport, t: T): string {
  const lines = [qaTitle(report, t), ...qaLines(report, t).map((l) => `${l.word} · ${l.text}${l.why ? `\n> ${l.why}` : ''}`)]
  lines.push(t('The screenshots are in Atril.'))
  return lines.join('\n\n')
}

/** W249: one published picture of a view, and the MR it went to. */
interface ViewRow {
  view: string
  link: string
  mr: string
  forge: ForgeId
  ref: string
  at: number
}
const ledgerFile = (repoId: string): string => join(atrilHome(), 'qa-views', `${repoId}.json`)

async function readLedger(repoId: string): Promise<ViewRow[]> {
  try {
    const rows = (JSON.parse(await readFile(ledgerFile(repoId), 'utf8')) as { rows?: unknown }).rows
    return Array.isArray(rows) ? (rows as ViewRow[]).filter((r) => typeof r?.view === 'string' && typeof r.link === 'string' && typeof r.ref === 'string') : []
  } catch {
    // A damaged ledger only costs the «Antes» pictures; the next send writes a good one.
    return []
  }
}

async function writeLedger(repoId: string, rows: ViewRow[]): Promise<void> {
  const file = ledgerFile(repoId)
  await mkdir(join(atrilHome(), 'qa-views'), { recursive: true })
  await writeFile(`${file}.tmp`, JSON.stringify({ rows: rows.slice(-LEDGER_ROWS) }))
  await rename(`${file}.tmp`, file)
}

interface Extra {
  url: string
  mr: MrRef
  repoId: string
  description: string | null
  target: string
  report: QaReport
}

interface Deps {
  run: Runner
  /** main's latest MR listing and when it was made; null before the first. */
  last: () => { at: number; lists: MrLists } | null
  /** Lists again the way `atril:mr:list` does, which replaces `last`. */
  list: () => Promise<MrLists>
  /** One general comment on a listed MR (threads' own session: the token stays there). */
  post: (url: string, body: string) => Promise<MrReply>
  now?: () => number
  /** W243: reads a picture's text on this Mac. */
  ocr: (file: string) => Promise<string | null>
  /** This Mac's names, which no picture may show. */
  host: string
  user: string
  hosting: Pick<ReturnType<typeof createQaHosting>, 'readMr' | 'host' | 'replaceBlock'>
  /** The listed MR behind an URL: its forge and API path. */
  target: (url: string) => MrRef | undefined
  home: string
}

const isProblem = (x: object): x is Problem => 'error' in x

/** W170, W174: the QA result of a work, posted on its own MR when the person presses. */
export function createQaPublish({ run, last, list, post, now = Date.now, ocr, host, user, hosting, target, home }: Deps) {
  const pictures = createPictures<Extra>({ home, host, user, ocr, now })
  async function mrFor(id: string): Promise<QaMr> {
    const ws = (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
    if (!ws) return null
    const repo = (await readRepos()).find((r) => r.id === ws.repoId)
    if (!repo) return null
    const kept = last()
    const lists = kept && now() - kept.at < FRESH_MS ? kept.lists : await list()
    const candidates = lists.mine.filter((m) => m.branch === ws.branch).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    for (const m of candidates) if (await remoteNaming(run, repo.path, m.project, new URL(m.url).hostname)) return { url: m.url }
    return null
  }

  const noMr = (): Problem => ({ error: t('Open the MR to publish the QA here.') })

  async function comment(id: string): Promise<QaPublishResult> {
    const mr = await mrFor(id)
    const report = mr && (await qaReport(id, run))
    if (!mr || !report) return noMr()
    const r = await post(mr.url, qaSummary(report, t))
    return 'error' in r ? r : { url: mr.url }
  }

  /** W249: the newest recorded picture of the view from another MR merged into the same target. */
  async function befores(x: Extra, views: string[]): Promise<Record<string, string>> {
    const rows = (await readLedger(x.repoId)).filter((r) => r.mr !== x.url).sort((a, b) => b.at - a.at)
    const states = new Map<string, Promise<MrState | Problem>>()
    const out: Record<string, string> = {}
    for (const view of new Set(views)) {
      for (const r of rows.filter((r) => r.view === view).slice(0, BEFORE_READS)) {
        if (!states.has(r.ref)) states.set(r.ref, hosting.readMr({ forge: r.forge, ref: r.ref }))
        const s = await states.get(r.ref)!
        if (!isProblem(s) && s.merged && s.target === x.target) {
          out[view] = r.link
          break
        }
      }
    }
    return out
  }

  return {
    mrFor,

    /** W241: the preview and its token; reads the MR, writes nothing anywhere. */
    async preparePublish(id: string): Promise<QaPrepared> {
      const mr = await mrFor(id)
      const report = mr && (await qaReport(id, run))
      const ws = (await readRecords()).find((r) => r.id === id)
      const ref = mr && target(mr.url)
      if (!mr || !report || !ws || !ref) return noMr()
      if (!report.entries.some((e) => e.steps.some((s) => s.shot))) return { rows: [], token: null }
      const state = await hosting.readMr(ref)
      if (isProblem(state)) return state
      return pictures.prepare(id, report, { url: mr.url, mr: ref, repoId: ws.repoId, description: state.description, target: state.target, report })
    },

    /** W170 without a token or with nothing to send; else W245–W249. */
    async publish(id: string, token?: string): Promise<QaPublishResult> {
      if (!token) return comment(id)
      const taken = await pictures.take(token, id)
      if ('error' in taken) return taken
      const x = taken.extra
      if (taken.pictures.length === 0) {
        const r = await comment(id)
        if (!('error' in r)) pictures.done(token)
        return r
      }
      const links = await hosting.host(x.mr, taken.pictures)
      if (isProblem(links)) return links
      const before = await befores(x, taken.pictures.flatMap((p) => (p.view ? [p.view] : [])))
      const map = Object.fromEntries(taken.pictures.map((p) => [p.id, { after: links[p.name]!, ...(p.view && before[p.view] && { before: before[p.view] }) }]))
      const written = await hosting.replaceBlock(x.mr, x.description, qaBlock(x.report, map, home))
      if (isProblem(written)) return written
      pictures.done(token)
      const at = now()
      const added: ViewRow[] = taken.pictures.flatMap((p) => (p.view ? [{ view: p.view, link: links[p.name]!, mr: x.url, forge: x.mr.forge, ref: x.mr.ref, at }] : []))
      if (added.length > 0) await writeLedger(x.repoId, [...(await readLedger(x.repoId)), ...added])
      return { url: x.url }
    }
  }
}
