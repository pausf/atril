import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Checklist } from '../../preload/api'

const BOX = /^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/

export interface BoxItem {
  text: string
  closed: boolean
}

// Libretto's own rule (find-work, Source 1): fences toggle on any ``` line, and in
// proposal.md only the section opened by `## Checklist` counts.
export function listBoxes(text: string, isProposal: boolean): BoxItem[] {
  let fenced = false
  let listed = false
  const items: BoxItem[] = []
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
    if (m) items.push({ text: (m[2] ?? '').trim(), closed: m[1] !== ' ' })
  }
  return items
}

export function parseBoxes(text: string, isProposal: boolean): Omit<Checklist, 'file'> {
  const items = listBoxes(text, isProposal)
  const closed = items.filter((i) => i.closed).length
  const firstOpen = items.find((i) => !i.closed)?.text
  return firstOpen === undefined ? { total: items.length, closed } : { total: items.length, closed, firstOpen }
}

/** The file whose boxes count, with its text: proposal.md, else tasks.md, else plan.md. */
export async function checklistSource(changeDir: string): Promise<{ file: string; text: string } | null> {
  for (const file of ['proposal.md', 'tasks.md', 'plan.md']) {
    let text: string
    try {
      text = await readFile(join(changeDir, file), 'utf8')
    } catch {
      continue
    }
    if (parseBoxes(text, file === 'proposal.md').total > 0) return { file, text }
    // A proposal without boxes falls through to the older names; tasks.md ends the search.
    if (file !== 'proposal.md') return null
  }
  return null
}

export async function readChecklist(changeDir: string): Promise<Checklist | null> {
  const source = await checklistSource(changeDir)
  return source ? { file: source.file, ...parseBoxes(source.text, source.file === 'proposal.md') } : null
}
