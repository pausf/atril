import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { FlowStage, StageName } from '../../preload/api'
import type { Runner } from '../run'
import { readChecklist } from './checklist'

const exists = (p: string): Promise<boolean> =>
  stat(p).then(
    () => true,
    () => false
  )

// A folder's own mtime only moves when entries come and go, so the newest file counts too.
async function lastModified(dir: string): Promise<number> {
  let latest = (await stat(dir)).mtimeMs
  for (const f of await readdir(dir)) latest = Math.max(latest, (await stat(join(dir, f)).catch(() => null))?.mtimeMs ?? 0)
  return latest
}

async function changeFolders(changes: string): Promise<string[]> {
  const entries = await readdir(changes, { withFileTypes: true }).catch(() => [])
  const dirs = await Promise.all(
    entries.filter((e) => e.isDirectory()).map(async (e) => ({ name: e.name, at: await lastModified(join(changes, e.name)) }))
  )
  return dirs.sort((a, b) => b.at - a.at || a.name.localeCompare(b.name)).map((d) => d.name)
}

export async function stageOf(workspacePath: string, baseCommit: string, run: Runner): Promise<FlowStage> {
  const agents = join(workspacePath, '.agents')
  if (!(await exists(agents))) return { stage: 'sin-libretto', others: [] }

  const [latest, ...others] = await changeFolders(join(agents, 'changes'))
  if (!latest) {
    const ahead = await run('git', ['-C', workspacePath, 'rev-list', '--count', `${baseCommit}..HEAD`])
    return { stage: ahead.code === 0 && Number(ahead.stdout) > 0 ? 'aterrizado' : 'entrada', others: [] }
  }

  const dir = join(agents, 'changes', latest)
  const checklist = await readChecklist(dir)
  let stage: StageName
  if (checklist) stage = checklist.closed === checklist.total ? 'terminado' : 'construir'
  else {
    const proposal = await readFile(join(dir, 'proposal.md'), 'utf8').catch(() => null)
    if (proposal === null || !/^##\s+Verification criteria\b/m.test(proposal)) stage = 'entrada'
    else stage = /^##\s+Approach\b/m.test(proposal) ? 'plan' : 'spec'
  }
  return checklist ? { stage, change: latest, others, checklist } : { stage, change: latest, others }
}
