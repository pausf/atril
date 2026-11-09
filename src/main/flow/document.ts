import { readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentState, FlowDocs } from '../../preload/api'
import { t } from '../lang'
import { changeFolders } from './stage'

const CHANGE_RE = /^[a-z0-9][a-z0-9-]*$/
const DOC_RE = /^(proposal|spec-[a-z0-9-]+)\.md$/

/** The current change's Libretto documents: proposal.md first, then each spec-*.md. */
export async function readDocs(workspacePath: string): Promise<FlowDocs | null> {
  const changes = join(workspacePath, '.agents', 'changes')
  const [change] = await changeFolders(changes)
  if (!change) return null
  const dir = join(changes, change)
  const names = (await readdir(dir)).filter((n) => DOC_RE.test(n)).sort((a, b) => (a === 'proposal.md' ? -1 : b === 'proposal.md' ? 1 : a.localeCompare(b)))
  const files = await Promise.all(
    names.map(async (name) => {
      const p = join(dir, name)
      const [text, st] = await Promise.all([readFile(p, 'utf8'), stat(p)])
      return { name, text, mtimeMs: st.mtimeMs }
    })
  )
  return { change, files }
}

/**
 * F16: refuses while the agent works, outside the change's own Libretto files, or when the
 * file moved since it was read; otherwise replaces it whole via a rename, never half-written.
 */
export async function saveDoc(
  workspacePath: string,
  state: AgentState,
  change: string,
  name: string,
  text: string,
  mtimeMs: number
): Promise<{ mtimeMs: number } | { error: string }> {
  if (state === 'working') return { error: t('Claude está escribiendo: no se ha guardado') }
  const dir = join(workspacePath, '.agents', 'changes', change)
  const isDir = await stat(dir).then((s) => s.isDirectory(), () => false)
  if (!CHANGE_RE.test(change) || !DOC_RE.test(name) || !isDir) return { error: t('Ese archivo no se puede editar desde Atril') }
  const file = join(dir, name)
  const current = await stat(file).catch(() => null)
  if (!current || current.mtimeMs !== mtimeMs) return { error: t('Claude ha cambiado el archivo mientras editabas: copia tu texto y vuelve a abrirlo') }
  // ponytail: a crash between write and rename leaves this hidden file; the next save replaces it.
  const tmpFile = join(dir, `.${name}.atril-tmp`)
  await writeFile(tmpFile, text)
  await rename(tmpFile, file)
  return { mtimeMs: (await stat(file)).mtimeMs }
}
