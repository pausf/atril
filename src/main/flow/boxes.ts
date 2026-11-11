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

async function plan(path: string, base: string, change: string, run: Runner): Promise<Plan | null> {
  const dir = join(path, '.agents', 'changes', change)
  const source = await checklistSource(dir)
  if (!source) return null
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
  const [all, p] = await Promise.all([listChanges(path, base, run), change ? plan(path, base, change, run) : null])
  const total = all.reduce((n, f) => n + f.added + f.removed, 0)
  if (!p) return { boxes: [], total }
  const cache = new Map<string, Promise<FileChange[]>>()
  const filesOf = (r: Range): Promise<FileChange[]> => {
    const k = `${r.from}..${r.to ?? ''}`
    if (!cache.has(k)) cache.set(k, listChanges(path, r.from, run, r.to).then(code))
    return cache.get(k)!
  }
  const open = p.items.findIndex((i) => !i.closed)
  const boxes = await Promise.all(
    p.items.map(async (item, index): Promise<FlowBox> => {
      const box: FlowBox = { index, text: item.text, state: item.closed ? 'closed' : index === open ? 'current' : 'pending' }
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
  const range = change ? (await plan(path, base, change, run))?.ranges[index] : null
  if (!range) return ''
  if (!code(await listChanges(path, range.from, run, range.to)).some((f) => f.path === file)) return ''
  return fileDiff(path, range.from, file, run, range.to)
}
