import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Checklist } from '../../preload/api'

const BOX = /^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/

// Libretto's own rule (find-work, Source 1): fences toggle on any ``` line, and in
// proposal.md only the section opened by `## Checklist` counts.
export function parseBoxes(text: string, isProposal: boolean): Omit<Checklist, 'file'> {
  let fenced = false
  let listed = false
  let total = 0
  let closed = 0
  let firstOpen: string | undefined
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    if (isProposal && /^##\s/.test(line)) {
      listed = /^##\s+Checklist\s*$/.test(line)
      continue
    }
    if (isProposal && !listed) continue
    const m = BOX.exec(line)
    if (!m) continue
    total++
    if (m[1] !== ' ') closed++
    else firstOpen ??= m[2]?.trim()
  }
  return firstOpen === undefined ? { total, closed } : { total, closed, firstOpen }
}

export async function readChecklist(changeDir: string): Promise<Checklist | null> {
  for (const file of ['proposal.md', 'tasks.md', 'plan.md']) {
    let text: string
    try {
      text = await readFile(join(changeDir, file), 'utf8')
    } catch {
      continue
    }
    const boxes = parseBoxes(text, file === 'proposal.md')
    if (boxes.total > 0) return { file, ...boxes }
    // A proposal without boxes falls through to the older names; tasks.md ends the search.
    if (file !== 'proposal.md') return null
  }
  return null
}
