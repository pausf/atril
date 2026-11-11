import type { RadarHit } from '../preload/api'
import { listChanges } from './flow/changes'
import { quietly } from './flow/quiet'
import type { Runner } from './run'
import { readRecordsOrNone } from './workspaces'

/** W166: per non-review work, the other works of its repo that change a file it changes too. */
export async function radar(run: Runner): Promise<Record<string, RadarHit[]>> {
  const recs = (await readRecordsOrNone()).filter((r) => r.mode !== 'review')
  // W167: each list goes through the work's watcher, so a quiet work spawns nothing.
  const files = await Promise.all(
    recs.map(async (r) => new Set((await quietly(r.path, `radar:${r.baseCommit}`, run, () => listChanges(r.path, r.baseCommit, run))).map((f) => f.path)))
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
