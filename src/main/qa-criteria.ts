import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { QaCriterion } from '../preload/api'
import { changeFolders } from './flow/stage'

/** W113: the `- **ID**` lines under the current change's `## Verification criteria`, their text up to `Proof:`. */
export async function readCriteria(path: string): Promise<{ change: string | null; criteria: QaCriterion[] }> {
  const [change] = await changeFolders(join(path, '.agents', 'changes'))
  if (!change) return { change: null, criteria: [] }
  const proposal = await readFile(join(path, '.agents', 'changes', change, 'proposal.md'), 'utf8').catch(() => '')
  const criteria: QaCriterion[] = []
  let inSection = false
  let open: { id: string; parts: string[] } | null = null
  const close = (): void => {
    if (open) criteria.push({ id: open.id, text: open.parts.join(' ').split('Proof:')[0]!.replace(/\s+/g, ' ').trim() })
    open = null
  }
  for (const line of proposal.split('\n')) {
    if (/^##\s/.test(line)) {
      close()
      inSection = /^##\s+Verification criteria\b/.test(line)
      continue
    }
    if (!inSection) continue
    const head = /^- \*\*([A-Za-z0-9_.-]+)\*\*\s*(.*)$/.exec(line)
    if (head) {
      close()
      open = { id: head[1]!, parts: [head[2]!] }
    } else if (open && /^\s+\S/.test(line)) open.parts.push(line.trim())
    else close()
  }
  close()
  return { change, criteria }
}
