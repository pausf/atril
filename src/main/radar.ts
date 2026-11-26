import type { RadarHit } from '../preload/api'
import { listChanges } from './flow/changes'
import { quietly } from './flow/quiet'
import type { Runner } from './run'
import { readRecordsOrNone, workBase } from './workspaces'

/** W166: per non-review work, the other works of its repo that change a file it changes too. */
export async function radar(run: Runner): Promise<Record<string, RadarHit[]>> {
  // W308: a merged work is out on both sides.
  const recs = (await readRecordsOrNone()).filter((r) => r.mode !== 'review' && !r.merged)
  // W167: each list goes through the work's watcher, so a quiet work spawns nothing.
  const files = await Promise.all(
    recs.map(async (r) => new Set((await quietly(r.path, `radar:${r.baseCommit}`, run, async () => listChanges(r.path, await workBase(r, run), run))).map((f) => f.path)))
  )
  const out: Record<string, RadarHit[]> = {}
  recs.forEach((r, i) => {
    out[r.id] = recs.flatMap((o, j) => {
      if (j === i || o.repoId !== r.repoId) return []
      const shared = [...files[i]!].filter((f) => files[j]!.has(f)).sort()
      return shared.length ? [{ id: o.id, branch: o.branch, files: shared }] : []
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
