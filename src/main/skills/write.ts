import { mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { SkillRef, SkillSet, SkillsList, SkillState } from '../../preload/api'
import { t } from '../lang'
import { claudeDir } from '../paths'
import { listSkills, readAll, repoDirOf, type RepoList } from './read'
import { lockOf, writeIndex } from './state'

const STATES: readonly SkillState[] = ['on', 'name-only', 'user-invocable-only', 'off']
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

type Target = { file: string; section: 'skillOverrides' | 'enabledPlugins'; key: string; value: SkillState | boolean; index: number; repoDir?: string }

/** K13/K14: the file and key a request writes to, or the reason it is refused. */
async function target(req: SkillSet, repos: () => Promise<RepoList>): Promise<Target> {
  const warnings: string[] = []
  const repoDir = await repoDirOf(typeof req.repoId === 'string' ? req.repoId : undefined, repos, warnings)
  if ('plugin' in req) {
    if (typeof req.plugin !== 'string' || !req.plugin || typeof req.enabled !== 'boolean') throw new Error(t('Petición no válida.'))
    return { file: join(claudeDir(), 'settings.json'), section: 'enabledPlugins', key: req.plugin, value: req.enabled, index: 0, repoDir }
  }
  if (req.origin === 'atril' || req.origin === 'plugin') throw new Error(t('Un plugin se cambia entero, no skill a skill.'))
  if (req.origin !== 'personal' && req.origin !== 'project') throw new Error(t('Petición no válida.'))
  if (typeof req.name !== 'string' || !req.name) throw new Error(t('Petición no válida.'))
  if (!STATES.includes(req.state)) throw new Error(t('Estado no válido: {state}.', { state: String(req.state) }))
  const index = writeIndex(req.origin)
  if (req.origin === 'project') {
    if (!repoDir) throw new Error(t('Una skill de proyecto necesita un repo.'))
    return { file: join(repoDir, '.claude/settings.local.json'), section: 'skillOverrides', key: req.name, value: req.state, index, repoDir }
  }
  return { file: join(claudeDir(), 'settings.json'), section: 'skillOverrides', key: req.name, value: req.state, index, repoDir }
}

/** The file a ref would write to, for «Ver en Finder» (K17); main recomputes it, never trusts a path. */
export async function revealFile(ref: SkillRef, repos: () => Promise<RepoList>): Promise<string> {
  if (ref.origin !== 'personal' && ref.origin !== 'project' && ref.origin !== 'plugin') throw new Error(t('Petición no válida.'))
  const req: SkillSet =
    ref.origin === 'plugin' && ref.plugin
      ? { plugin: ref.plugin, enabled: true, repoId: ref.repoId }
      : { origin: ref.origin === 'project' ? 'project' : 'personal', name: ref.name || '-', repoId: ref.repoId, state: 'on' }
  return (await target(req, repos)).file
}

/** K13/K14: set one key in the one file that decides; every other byte of intent stays; answers the new list. */
export async function setSkill(req: SkillSet, repos: () => Promise<RepoList>, libretto: string): Promise<SkillsList> {
  if (!isObject(req)) throw new Error(t('Petición no válida.'))
  const tg = await target(req, repos)
  let obj: Record<string, unknown> = {}
  let text: string | null = null
  try {
    text = await readFile(tg.file, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(t('No he podido leer {file}.', { file: tg.file }), { cause: e })
  }
  if (text !== null) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = undefined
    }
    if (!isObject(parsed)) throw new Error(t('{file} no es un JSON con un objeto: no lo toco.', { file: tg.file }))
    if (tg.section in parsed && !isObject(parsed[tg.section])) {
      throw new Error(t('{file} tiene {key} y no es un objeto: no lo toco.', { file: tg.file, key: tg.section }))
    }
    obj = parsed
  }
  const read = await readAll({ claude: claudeDir(), repoDir: tg.repoDir, libretto }, [])
  const lock = lockOf(read.settings, read.where, tg.section, tg.key, tg.index)
  if (lock) throw new Error(t('Lo fija {file}.', { file: lock }))
  obj[tg.section] = { ...(obj[tg.section] as object | undefined), [tg.key]: tg.value }
  // A settings file kept as a symlink (dotfiles) is written through, so the link survives the rename.
  const file = text === null ? tg.file : await realpath(tg.file)
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(obj, null, 2) + '\n')
  await rename(tmp, file)
  return listSkills(req.repoId, repos, libretto)
}
