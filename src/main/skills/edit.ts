import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'
import type { SkillCreate, SkillFileRef, SkillItem, SkillSave, SkillSaved, SkillsList } from '../../preload/api'
import { t } from '../lang'
import { claudeDir } from '../paths'
import { parseFrontmatter } from './frontmatter'
import { listSkills, repoDirOf, type RepoList } from './read'

const MAX_BYTES = 256 * 1024
const NAME = /^[a-z][a-z0-9-]{0,63}$/
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const invalid = (): Error => new Error(t('Petición no válida.'))

/** K20: the listed personal or project item whose `path` is exactly the one asked for, under the folders Claude reads. */
async function locate(req: SkillFileRef, repos: () => Promise<RepoList>, libretto: string): Promise<SkillItem> {
  if (!isObject(req) || typeof req.path !== 'string' || (req.repoId !== undefined && typeof req.repoId !== 'string')) throw invalid()
  const { items } = await listSkills(req.repoId, repos, libretto)
  const item = items.find((i) => (i.origin === 'personal' || i.origin === 'project') && i.path === req.path)
  if (!item) throw new Error(t('Esa skill no está en tu lista: no la toco.'))
  const repoDir = item.origin === 'project' ? await repoDirOf(req.repoId, repos, []) : undefined
  const root = item.origin === 'project' ? (repoDir ? join(repoDir, '.claude') : '') : claudeDir()
  if (!root || !item.path.startsWith(root + sep) || item.path.split(sep).includes('..')) throw new Error(t('Esa ruta no está en las carpetas de Claude Code.'))
  return item
}

/** K26/K20: the whole file, header included; past 256 KB it is not opened. */
export async function readSkillFile(req: SkillFileRef, repos: () => Promise<RepoList>, libretto: string): Promise<string> {
  const item = await locate(req, repos, libretto)
  if ((await stat(item.path)).size > MAX_BYTES) throw new Error(t('Es demasiado grande para editarla aquí.'))
  return readFile(item.path, 'utf8')
}

/** Missing (first line not `---`) or broken by the same parser as K2. */
const brokenHeader = (text: string): boolean => text.split(/\r?\n/, 1)[0]?.trim() !== '---' || 'broken' in parseFrontmatter(text)

/** K19: conflict, then broken header, then write through `realpath` via `.tmp` and `rename`. */
export async function saveSkill(req: SkillSave, repos: () => Promise<RepoList>, libretto: string): Promise<SkillSaved> {
  const item = await locate(req, repos, libretto)
  if (typeof req.base !== 'string' || typeof req.text !== 'string') throw invalid()
  if (Buffer.byteLength(req.text) > MAX_BYTES) throw new Error(t('Es demasiado grande para guardarla: el tope son 256 KB.'))
  const file = await realpath(item.path)
  const disk = await readFile(file, 'utf8')
  if (disk !== req.base && !req.force) return { conflict: true, disk }
  if (brokenHeader(req.text) && !req.allowBroken) return { brokenHeader: true }
  const tmp = `${file}.tmp`
  await writeFile(tmp, req.text)
  await rename(tmp, file)
  return { list: await listSkills(req.repoId, repos, libretto) }
}

/** K21: `<root>/skills/<name>/SKILL.md` with an empty description; never over an existing skill or folder. */
export async function createSkill(req: SkillCreate, repos: () => Promise<RepoList>, libretto: string): Promise<SkillsList> {
  if (!isObject(req) || (req.origin !== 'personal' && req.origin !== 'project') || typeof req.name !== 'string') throw invalid()
  if (!NAME.test(req.name)) throw new Error(t('El nombre solo lleva minúsculas, números y guiones, y empieza por una letra.'))
  const repoId = typeof req.repoId === 'string' ? req.repoId : undefined
  let root = claudeDir()
  if (req.origin === 'project') {
    const repoDir = await repoDirOf(repoId, repos, [])
    if (!repoDir) throw new Error(t('Una skill de proyecto necesita un repo.'))
    root = join(repoDir, '.claude')
  }
  const { items } = await listSkills(repoId, repos, libretto)
  if (items.some((i) => i.origin === req.origin && i.kind === 'skill' && i.name === req.name)) throw new Error(t('Ya hay una skill con ese nombre.'))
  const dir = join(root, 'skills', req.name)
  await mkdir(dirname(dir), { recursive: true })
  try {
    await mkdir(dir)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(t('Ya hay una carpeta con ese nombre.'), { cause: e })
    throw e
  }
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${req.name}\ndescription: \n---\n\n`, { flag: 'wx' })
  return listSkills(repoId, repos, libretto)
}
