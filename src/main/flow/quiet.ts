import { realpathSync, watch, type FSWatcher } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import type { Runner } from '../run'

/** Injectable for tests (the 30 s cap). */
export const clock = { now: (): number => Date.now() }

const MAX_AGE = 30_000
const MAX_WATCHERS = 4
const GIT_FILES = new Set(['HEAD', 'index', 'packed-refs'])

/** `file` relative to `dir` ('' for `dir` itself), or null when it lies outside. */
const inside = (file: string, dir: string): string | null => {
  const r = relative(dir, file)
  return r === '..' || r.startsWith(`..${sep}`) || isAbsolute(r) ? null : r
}

/** F46: whether a change at `file` can change the panel. `gitDirs` are the work's git dir and common dir. */
export function counts(file: string, gitDirs: string[]): boolean {
  if (file.includes(`${sep}node_modules${sep}`)) return false
  // The most specific git dir decides: a worktree's own dir sits inside the common one.
  const hits = gitDirs.map((d) => ({ d, r: inside(file, d) })).filter((h) => h.r !== null)
  if (!hits.length) return true
  const r = hits.sort((a, b) => b.d.length - a.d.length)[0]!.r!
  const [top] = r.split(sep)
  return GIT_FILES.has(r) || ((top === 'refs' || top === 'logs') && r.includes(sep))
}

interface Saved {
  version: number
  at: number
  value: unknown
}

interface Watch {
  version: number
  /** False until armed, and for good once a watch fails: no saved answers then. */
  ok: boolean
  closed: boolean
  ws: FSWatcher[]
  answers: Map<string, Saved>
  ready: Promise<void>
}

// Insertion order is the LRU order: an asked work is moved to the end.
const watchers = new Map<string, Watch>()

const close = (w: Watch): void => {
  w.closed = true
  w.ok = false
  for (const x of w.ws) x.close()
  w.ws = []
}

async function arm(w: Watch, path: string, run: Runner): Promise<void> {
  const r = await run('git', ['-C', path, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir'])
  if (w.closed) return
  // A failed rev-parse closes this watcher; the next ask arms a fresh one instead of computing forever.
  if (r.code !== 0) return close(w)
  try {
    const gitDirs = r.stdout.split('\n').filter(Boolean).map((p) => realpathSync(p))
    const roots = [realpathSync(path), ...gitDirs]
    // A folder inside another watched one (an in-place `.git`, a worktree's dir in the common one) needs no watch of its own.
    const tops = roots.filter((d, i) => roots.indexOf(d) === i && !roots.some((o) => o !== d && inside(d, o) !== null))
    for (const root of tops) {
      const x = watch(root, { recursive: true }, (_e, f) => {
        if (!f || counts(join(root, f.toString()), gitDirs)) w.version++
      })
      x.on('error', () => close(w))
      w.ws.push(x)
    }
    w.ok = true
  } catch {
    close(w)
  }
}

function open(path: string, run: Runner): Watch {
  let w = watchers.get(path)
  watchers.delete(path)
  // A watcher that errored (or never armed) is replaced, never kept as a dead slot.
  if (!w || w.closed) {
    w = { version: 0, ok: false, closed: false, ws: [], answers: new Map(), ready: Promise.resolve() }
    w.ready = arm(w, path, run)
  }
  watchers.set(path, w)
  for (const [p, old] of watchers) {
    if (watchers.size <= MAX_WATCHERS) break
    close(old)
    watchers.delete(p)
  }
  return w
}

/** F46: `compute`'s answer, reused while nothing counted changed in the work and it is under 30 s old. */
export async function quietly<T>(path: string, key: string, run: Runner, compute: () => Promise<T>): Promise<T> {
  const w = open(path, run)
  // Armed before the first compute: an edit during it raises the version and is not lost.
  await w.ready
  if (!w.ok) return compute()
  const version = w.version
  const at = clock.now()
  const saved = w.answers.get(key)
  if (saved && saved.version === version && at - saved.at < MAX_AGE) return saved.value as T
  // The version is read before computing: an edit during the compute (git's own index rewrite included) costs one compute more, never a stale answer.
  const value = await compute()
  if (w.ok) w.answers.set(key, { version, at, value })
  return value
}

/** F48: closing or forgetting a work closes its watcher and drops its saved answers. */
export function closeQuiet(path: string): void {
  const w = watchers.get(path)
  if (!w) return
  close(w)
  watchers.delete(path)
}

export const openWatchers = (): string[] => [...watchers.keys()]
export const version = (path: string): number | undefined => watchers.get(path)?.version
