import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, sep } from 'node:path'
import type { QaManualRequest, QaPlatform, QaTarget, QaTargets } from '../preload/api'
import { t } from './lang'
import { atrilHome } from './paths'
import { detectQa, type QaInfo } from './qa'
import { readRecords } from './workspaces'

export const PLATFORMS: readonly QaPlatform[] = ['chrome', 'safari', 'android', 'ios']
const SKIP = new Set(['node_modules', 'Pods', 'build', 'dist', 'vendor'])
const MAX_FOLDERS = 200
const MAX_DEPTH = 2
const MAX_FILE = 64 * 1024
const MAX_COMMAND = 200

const make = (platform: QaPlatform, dir: string, command: string, why: string, source: QaTarget['source']): QaTarget => ({ key: `${platform}:${dir}`, platform, dir, command, why, source })
const isDir = (p: string): Promise<boolean> => lstat(p).then((s) => s.isDirectory(), () => false)

async function expand(info: QaInfo, root: string, dir: string): Promise<QaTarget[]> {
  const at = (p: QaPlatform): QaTarget => make(p, dir, info.command, info.why, 'detected')
  switch (info.kind) {
    case 'web':
      return [at('chrome'), at('safari')]
    case 'expo':
      return [at('android'), at('ios')]
    case 'android':
    case 'ios':
      return [at(info.kind)]
    default: {
      const [android, ios] = await Promise.all([isDir(join(root, dir, 'android')), isDir(join(root, dir, 'ios'))])
      return [...(android ? [at('android')] : []), ...(ios ? [at('ios')] : [])]
    }
  }
}

/** W120: breadth first, so the 200-folder cap cuts the deepest folders first. */
async function detected(root: string): Promise<QaTarget[]> {
  const found: QaTarget[] = []
  let level = ['']
  let read = 0
  for (let depth = 0; depth <= MAX_DEPTH && level.length > 0; depth++) {
    const next: string[] = []
    for (const dir of level) {
      if (read >= MAX_FOLDERS) break
      read++
      const info = await detectQa(join(root, dir))
      if (info) {
        found.push(...(await expand(info, root, dir)))
        continue
      }
      if (depth === MAX_DEPTH) continue
      const entries = await readdir(join(root, dir), { withFileTypes: true }).catch(() => [])
      // Dirent.isDirectory() is false for a symlink: links are never followed.
      const subs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name)).map((e) => (dir ? `${dir}/${e.name}` : e.name))
      next.push(...subs.sort())
    }
    level = next
  }
  return found
}

const byFolder = (a: QaTarget, b: QaTarget): number => (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0)
const once = (ts: QaTarget[]): QaTarget[] => ts.filter((x, i) => ts.findIndex((y) => y.key === x.key) === i)

/** W121, W122: an entry from .atril/qa.json or the window is untrusted: a sentence when it is refused. */
async function checkTarget(root: string, raw: unknown): Promise<QaManualRequest | string> {
  const v = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const platform = PLATFORMS.find((p) => p === v['platform'])
  if (!platform) return t('La plataforma tiene que ser Chrome, Safari, Android o iOS')
  if (typeof v['dir'] !== 'string') return t('La carpeta tiene que estar dentro del repo, sin «..»')
  const dir = v['dir'].replace(/^(\.\/)+/, '').replace(/\/+$/, '')
  const clean = dir === '.' ? '' : dir
  if (isAbsolute(clean) || /[\\\0]/.test(clean) || clean.split('/').includes('..')) return t('La carpeta tiene que estar dentro del repo, sin «..»')
  const missing = t('La carpeta {dir} no existe en este trabajo', { dir: clean })
  try {
    const [real, base] = await Promise.all([realpath(join(root, clean)), realpath(root)])
    // A link inside the repo may still point out of it.
    if ((real !== base && !real.startsWith(base + sep)) || !(await stat(real)).isDirectory()) return missing
  } catch {
    return missing
  }
  if (typeof v['command'] !== 'string' || v['command'].trim() === '') return t('Falta el comando')
  if (v['command'].length > MAX_COMMAND) return t('El comando pasa de {n} caracteres', { n: MAX_COMMAND })
  return { platform, dir: clean, command: v['command'].trim() }
}

/** W121: null with no file; [] when it exists and nothing in it is valid. */
async function fileTargets(root: string): Promise<QaTarget[] | null> {
  const file = join(root, '.atril', 'qa.json')
  const st = await lstat(file).catch(() => null)
  if (!st) return null
  if (!st.isFile() || st.size > MAX_FILE) return []
  let list: unknown
  try {
    list = (JSON.parse(await readFile(file, 'utf8')) as { targets?: unknown })?.targets
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  const why = t('Lo dice .atril/qa.json')
  const ok = await Promise.all(list.map((raw) => checkTarget(root, raw)))
  return ok.flatMap((r) => (typeof r === 'string' ? [] : [make(r.platform, r.dir, r.command, why, 'file')]))
}

/** W120, W121: what a folder can be tested in, before anything chosen by hand. */
export async function findTargets(root: string): Promise<{ targets: QaTarget[]; note: string | null }> {
  const file = await fileTargets(root)
  if (file && file.length > 0) return { targets: once(file.sort(byFolder)), note: null }
  return { targets: once((await detected(root)).sort(byFolder)), note: file ? t('.atril/qa.json no se entiende: uso lo que detecto') : null }
}

type Store = Record<string, { chosen?: string; manual: QaManualRequest[] }>
const storeFile = (): string => join(atrilHome(), 'qa-targets.json')

async function readStore(): Promise<Store> {
  try {
    const raw = JSON.parse(await readFile(storeFile(), 'utf8')) as unknown
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Store) : {}
  } catch {
    return {}
  }
}

// Two saves at once must not both read the old file and lose one.
let queue: Promise<unknown> = Promise.resolve()

function update(repoId: string, change: (e: { chosen?: string; manual: QaManualRequest[] }) => void): Promise<void> {
  const next = queue.then(async () => {
    const store = await readStore()
    const entry = { manual: [], ...store[repoId] }
    change(entry)
    store[repoId] = entry
    await mkdir(atrilHome(), { recursive: true })
    const temp = `${storeFile()}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temp, JSON.stringify(store, null, 2) + '\n')
    await rename(temp, storeFile())
  })
  queue = next.catch(() => undefined)
  return next
}

const recordOf = async (id: string) => (await readRecords()).find((r) => r.id === id && r.mode !== 'review')

/** W120–W123: the workspace's targets, those picked by hand last, and the repo's choice; null for a workspace not in the list. */
export async function qaTargets(id: string): Promise<QaTargets | null> {
  const ws = await recordOf(id)
  if (!ws) return null
  const [{ targets: found, note }, store] = await Promise.all([findTargets(ws.path), readStore()])
  const entry = store[ws.repoId]
  const why = t('Lo elegiste a mano')
  const manual = (Array.isArray(entry?.manual) ? entry.manual : [])
    .filter((m) => PLATFORMS.includes(m?.platform) && typeof m.dir === 'string' && typeof m.command === 'string')
    .map((m) => make(m.platform, m.dir, m.command, why, 'manual'))
  const mine = new Set(manual.map((m) => m.key))
  const targets = [...found.filter((x) => !mine.has(x.key)), ...manual]
  const chosen = targets.find((x) => x.key === entry?.chosen)?.key ?? targets[0]?.key ?? null
  return { targets, chosen, note }
}

/** W122: a hand-picked target replaces any of the repo's with the same platform and folder. */
export async function addManual(id: string, raw: unknown): Promise<QaTargets | { error: string }> {
  const ws = await recordOf(id)
  if (!ws) return { error: t('Ese trabajo ya no existe') }
  const checked = await checkTarget(ws.path, raw)
  if (typeof checked === 'string') return { error: checked }
  await update(ws.repoId, (e) => {
    e.manual = [...e.manual.filter((m) => `${m.platform}:${m.dir}` !== `${checked.platform}:${checked.dir}`), checked]
  })
  return (await qaTargets(id))!
}

export async function removeManual(id: string, key: unknown): Promise<QaTargets | { error: string }> {
  const ws = await recordOf(id)
  if (!ws) return { error: t('Ese trabajo ya no existe') }
  await update(ws.repoId, (e) => {
    e.manual = e.manual.filter((m) => `${m.platform}:${m.dir}` !== key)
  })
  return (await qaTargets(id))!
}

/** W123: the tab pressed, remembered for every workspace of the repo. */
export async function chooseTarget(id: string, key: unknown): Promise<QaTargets | { error: string }> {
  const ws = await recordOf(id)
  if (!ws) return { error: t('Ese trabajo ya no existe') }
  if (typeof key !== 'string' || key.length > 300) return { error: t('Ese objetivo no existe') }
  await update(ws.repoId, (e) => {
    e.chosen = key
  })
  return (await qaTargets(id))!
}
