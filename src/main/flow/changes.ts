import { lstat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileChange } from '../../preload/api'
import type { Runner } from '../run'

const MAX_DIFF = 1024 * 1024
const CUT_NOTE = 'Diff recortado a 1 MB'

type Entry = FileChange & { untracked: boolean }

const nulFields = (out: string): string[] => out.split('\0').filter((x) => x !== '')

async function untrackedCounts(file: string): Promise<{ added: number; removed: number }> {
  // A link is one line to git (its target path); its target is never opened.
  const st = await lstat(file).catch(() => null)
  if (!st?.isFile()) return { added: st?.isSymbolicLink() ? 1 : 0, removed: 0 }
  const bytes = await readFile(file).catch(() => Buffer.alloc(0))
  // git's own rule: a NUL in the first 8000 bytes makes it binary.
  if (bytes.subarray(0, 8000).includes(0)) return { added: 0, removed: 0 }
  const text = bytes.toString('utf8')
  const lines = (text.match(/\n/g)?.length ?? 0) + (text !== '' && !text.endsWith('\n') ? 1 : 0)
  return { added: lines, removed: 0 }
}

async function entries(path: string, base: string, run: Runner): Promise<Entry[]> {
  const g = (args: string[]) => run('git', ['--literal-pathspecs', '-C', path, ...args])
  const [numstat, status, others] = await Promise.all([
    g(['diff', '--no-renames', '-z', '--numstat', base]),
    g(['diff', '--no-renames', '-z', '--name-status', base]),
    g(['ls-files', '-z', '--others', '--exclude-standard'])
  ])
  if (numstat.code !== 0 || status.code !== 0) return []

  const counts = new Map<string, { added: number; removed: number }>()
  for (const rec of nulFields(numstat.stdout)) {
    const [a, r, ...rest] = rec.split('\t')
    counts.set(rest.join('\t'), { added: a === '-' ? 0 : Number(a), removed: r === '-' ? 0 : Number(r) })
  }
  const out: Entry[] = []
  const fields = nulFields(status.stdout)
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const letter = fields[i]!.charAt(0)
    const file = fields[i + 1]!
    out.push({ path: file, status: letter === 'A' ? 'A' : letter === 'D' ? 'D' : 'M', ...(counts.get(file) ?? { added: 0, removed: 0 }), untracked: false })
  }
  if (others.code === 0) {
    for (const file of nulFields(others.stdout)) out.push({ path: file, status: 'A', ...(await untrackedCounts(join(path, file))), untracked: true })
  }
  // Code first: Libretto's own documents have their Spec and Plan buttons, so they go last.
  const docs = (p: string): number => (p.startsWith('.agents/') ? 1 : 0)
  return out.sort((a, b) => docs(a.path) - docs(b.path) || a.path.localeCompare(b.path))
}

/** F18: every file that differs from the workspace's base — committed, uncommitted and untracked. */
export async function listChanges(path: string, base: string, run: Runner): Promise<FileChange[]> {
  return (await entries(path, base, run)).map((e) => ({ path: e.path, status: e.status, added: e.added, removed: e.removed }))
}

/** F19, F23: the diff of one listed file only, cut at 1 MB. */
export async function fileDiff(path: string, base: string, file: string, run: Runner): Promise<string> {
  const entry = (await entries(path, base, run)).find((e) => e.path === file)
  if (!entry) return ''
  const r = entry.untracked
    ? await run('git', ['--literal-pathspecs', '-C', path, 'diff', '--no-index', '--', '/dev/null', file])
    : await run('git', ['--literal-pathspecs', '-C', path, 'diff', '--no-renames', base, '--', file])
  // --no-index exits 1 when the files differ, which is the point here.
  if (r.code !== 0 && !(entry.untracked && r.code === 1)) return ''
  const bytes = Buffer.from(r.stdout, 'utf8')
  if (bytes.length <= MAX_DIFF) return r.stdout
  // ponytail: the runner buffers the whole output first; stream it if a diff ever threatens memory.
  const head = bytes.subarray(0, MAX_DIFF).toString('utf8')
  return `${head.slice(0, head.lastIndexOf('\n') + 1)}${CUT_NOTE}`
}
