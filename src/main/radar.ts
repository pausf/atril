import { lstat, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RadarHit } from '../preload/api'
import { listChanges } from './flow/changes'
import { quietly } from './flow/quiet'
import type { Runner } from './run'
import { readRecordsOrNone, workBase } from './workspaces'

const CRITERION = /^- \*\*([A-Z]+\d+)\*\*/
const MAX_DOC = 1024 * 1024
const byId = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true })

/** W310: ids a `- **X123**` line defines in the work's change documents, `(amended …)` lines aside; no link is followed. */
async function changeIds(path: string): Promise<Set<string>> {
  const ids = new Set<string>()
  const root = join(path, '.agents', 'changes')
  for (const d of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!d.isDirectory()) continue
    for (const f of await readdir(join(root, d.name), { withFileTypes: true }).catch(() => [])) {
      const file = join(root, d.name, f.name)
      const st = f.name.endsWith('.md') ? await lstat(file).catch(() => null) : null
      if (!st?.isFile() || st.size > MAX_DOC) continue
      for (const line of (await readFile(file, 'utf8').catch(() => '')).split('\n')) {
        const m = CRITERION.exec(line)
        if (m && !line.includes('(amended')) ids.add(m[1]!)
      }
    }
  }
  return ids
}

/** W310: the ids already defined anywhere under `.agents/` at `base`: nobody's to clash on. */
async function idsAt(path: string, base: string, run: Runner): Promise<Set<string>> {
  const r = await run('git', ['-C', path, 'grep', '-h', '-E', '^- \\*\\*[A-Z]+[0-9]+\\*\\*', base, '--', '.agents'])
  return new Set(r.stdout.split('\n').flatMap((l) => CRITERION.exec(l)?.[1] ?? []))
}

/** What a work changes and the criterion ids it owns, against W303's base. */
async function footprint(r: { path: string; baseCommit: string; baseRef?: string }, run: Runner): Promise<{ files: Set<string>; ids: Set<string> }> {
  const base = await workBase(r, run)
  const [changes, mine, old] = await Promise.all([listChanges(r.path, base, run), changeIds(r.path), idsAt(r.path, base, run)])
  return { files: new Set(changes.map((f) => f.path)), ids: new Set([...mine].filter((i) => !old.has(i))) }
}

/** W166: per non-review work, the other works of its repo that change a file it changes too. */
export async function radar(run: Runner): Promise<Record<string, RadarHit[]>> {
  // W308: a merged work is out on both sides.
  const recs = (await readRecordsOrNone()).filter((r) => r.mode !== 'review' && !r.merged)
  // W167: each footprint goes through the work's watcher, so a quiet work spawns nothing.
  const prints = await Promise.all(recs.map((r) => quietly(r.path, `radar:${r.baseCommit}`, run, () => footprint(r, run))))
  const out: Record<string, RadarHit[]> = {}
  recs.forEach((r, i) => {
    out[r.id] = recs.flatMap((o, j) => {
      if (j === i || o.repoId !== r.repoId) return []
      const files = [...prints[i]!.files].filter((f) => prints[j]!.files.has(f)).sort()
      const ids = [...prints[i]!.ids].filter((x) => prints[j]!.ids.has(x)).sort(byId)
      return files.length || ids.length ? [{ id: o.id, branch: o.branch, files, ids }] : []
    })
  })
  return out
}

export type Clash = { a: string; b: string; file: string; more: number }

/** W182: per pair of works, the files they newly share; the first answer only sets the baseline. */
export function createClashWatch(): (answer: Record<string, RadarHit[]>) => Clash[] {
  let prev: Map<string, Set<string>> | undefined
  return (answer) => {
    const now = new Map<string, Set<string>>()
    for (const [a, hits] of Object.entries(answer)) for (const h of hits) if (a < h.id) now.set(`${a}\n${h.id}`, new Set(h.files))
    const out: Clash[] = []
    if (prev)
      for (const [pair, files] of [...now].sort(([x], [y]) => x.localeCompare(y))) {
        const fresh = [...files].filter((f) => !prev!.get(pair)?.has(f)).sort()
        const [a, b] = pair.split('\n') as [string, string]
        if (fresh.length) out.push({ a, b, file: fresh[0]!, more: fresh.length - 1 })
      }
    prev = now
    return out
  }
}
