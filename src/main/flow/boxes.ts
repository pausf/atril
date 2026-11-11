import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileChange, FlowBox, FlowBoxes } from '../../preload/api'
import type { Runner } from '../run'
import { fileDiff, listChanges } from './changes'
import { checklistSource, listBoxes, type BoxItem } from './checklist'

interface Range {
  from: string
  /** Absent: up to the working tree. */
  to?: string
}

interface Plan {
  items: BoxItem[]
  ranges: (Range | null)[]
  /** Short id of the commit that closed each box, when one did. */
  commits: (string | undefined)[]
}

// A box is matched across commits by its text; the same text twice is told apart by order.
const keys = (items: BoxItem[]): string[] => {
  const seen = new Map<string, number>()
  return items.map((i) => {
    const n = seen.get(i.text) ?? 0
    seen.set(i.text, n + 1)
    return `${n}\0${i.text}`
  })
}

interface Cached {
  key: string
  plan: Plan | null
  /** Lists of committed ranges only, by `from..to`: what two commits differ in never changes. */
  files: Map<string, Promise<FileChange[]>>
}

// F42–F44: each spawn costs ~125 ms on the person's Mac, so the plan is kept until HEAD, the base or the checklist moves.
const plans = new Map<string, Cached>()

/** Drops every cached plan of that workspace folder (closing or forgetting it). */
export function forgetPlans(path: string): void {
  for (const k of plans.keys()) if (k.startsWith(`${path}\0`)) plans.delete(k)
}

async function cachedPlan(path: string, base: string, change: string, run: Runner): Promise<Cached> {
  const dir = join(path, '.agents', 'changes', change)
  const [head, source] = await Promise.all([run('git', ['-C', path, 'rev-parse', 'HEAD']), checklistSource(dir)])
  const st = source ? await stat(join(dir, source.file)).catch(() => null) : null
  const key = JSON.stringify([base, head.stdout.trim(), source?.file, st?.mtimeMs, st?.size])
  const id = `${path}\0${change}`
  const old = plans.get(id)
  if (head.code === 0 && old?.key === key) return old
  const fresh: Cached = { key, plan: source ? await plan(path, base, change, source, run) : null, files: old?.files ?? new Map() }
  if (head.code === 0) plans.set(id, fresh)
  return fresh
}

async function plan(path: string, base: string, change: string, source: { file: string; text: string }, run: Runner): Promise<Plan> {
  const isProposal = source.file === 'proposal.md'
  const rel = `.agents/changes/${change}/${source.file}`
  const g = (args: string[]) => run('git', ['--literal-pathspecs', '-C', path, ...args])
  const at = async (rev: string): Promise<BoxItem[]> => {
    const r = await g(['show', `${rev}:${rel}`])
    return r.code === 0 ? listBoxes(r.stdout, isProposal) : []
  }

  // Each commit that ticks a box cuts the branch; a box's closing commit is the last one that ticked it.
  const log = await g(['log', '--format=%H', '--reverse', `${base}..HEAD`, '--', rel])
  const cuts: string[] = []
  const closedBy = new Map<string, string>()
  for (const sha of log.code === 0 ? log.stdout.split('\n').filter(Boolean) : []) {
    const [before, after] = await Promise.all([at(`${sha}^`), at(sha)])
    const was = new Set(keys(before).filter((_, i) => before[i]!.closed))
    let ticked = false
    keys(after).forEach((k, i) => {
      if (!after[i]!.closed) closedBy.delete(k)
      else if (!was.has(k)) {
        closedBy.set(k, sha)
        ticked = true
      }
    })
    if (ticked) cuts.push(sha)
  }

  const items = listBoxes(source.text, isProposal)
  const itemKeys = keys(items)
  const last = cuts.at(-1) ?? base
  const open = items.findIndex((i) => !i.closed)
  const ranges = items.map((item, i): Range | null => {
    if (!item.closed) return i === open ? { from: last } : null
    const sha = closedBy.get(itemKeys[i]!)
    // Ticked in the working tree only: it shares what is being written now.
    return sha ? { from: cuts[cuts.indexOf(sha) - 1] ?? base, to: sha } : { from: last }
  })
  return { items, ranges, commits: items.map((item, i) => (item.closed ? closedBy.get(itemKeys[i]!)?.slice(0, 7) : undefined)) }
}

const code = (files: FileChange[]): FileChange[] => files.filter((f) => !f.path.startsWith('.agents/'))

/** F36: the checklist's boxes with the code of each one's range. */
export async function boxRanges(path: string, base: string, change: string | undefined, run: Runner): Promise<FlowBoxes> {
  const [all, c] = await Promise.all([listChanges(path, base, run), change ? cachedPlan(path, base, change, run) : null])
  const total = all.reduce((n, f) => n + f.added + f.removed, 0)
  const p = c?.plan
  if (!c || !p) return { boxes: [], total }
  const open = new Map<string, Promise<FileChange[]>>()
  const filesOf = (r: Range): Promise<FileChange[]> => {
    // The open range is listed on every read, so an uncommitted edit shows at once (F43).
    const kept = r.to ? c.files : open
    const k = `${r.from}..${r.to ?? ''}`
    if (!kept.has(k)) kept.set(k, listChanges(path, r.from, run, r.to).then(code))
    return kept.get(k)!
  }
  const current = p.items.findIndex((i) => !i.closed)
  const boxes = await Promise.all(
    p.items.map(async (item, index): Promise<FlowBox> => {
      const box: FlowBox = { index, text: item.text, state: item.closed ? 'closed' : index === current ? 'current' : 'pending' }
      const commit = p.commits[index]
      if (commit) box.commit = commit
      const range = p.ranges[index]
      if (range) box.files = await filesOf(range)
      return box
    })
  )
  return { boxes, total }
}

/** F37: one file's diff over one box's range; empty for a file outside it. */
export async function boxDiff(path: string, base: string, change: string | undefined, index: number, file: string, run: Runner): Promise<string> {
  const c = change ? await cachedPlan(path, base, change, run) : null
  const range = c?.plan?.ranges[index]
  if (!c || !range) return ''
  // fileDiff answers '' for a file that is not in the range's list, so listing it here again would only cost three more git spawns.
  if (file.startsWith('.agents/')) return ''
  if (!range.to) return fileDiff(path, range.from, file, run)
  const k = `${range.from}..${range.to}`
  if (!c.files.has(k)) c.files.set(k, listChanges(path, range.from, run, range.to).then(code))
  return fileDiff(path, range.from, file, run, range.to, await c.files.get(k)!)
}
