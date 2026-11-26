// Pure rules for a Stop (W217–W220): no Claude, only the repo's checklists and the agent's last words.
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const MAX_BLOCKS = 5
const BOX = /^\s*[-*]\s+\[ \]/

function repoRoot(cwd) {
  let dir = cwd
  for (;;) {
    try {
      lstatSync(join(dir, '.git'))
      return dir
    } catch {
      /* not here */
    }
    const up = dirname(dir)
    if (up === dir) return undefined
    dir = up
  }
}

function countOpen(text) {
  let open = 0
  let listed = false
  let fenced = false
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    if (/^##\s/.test(line)) {
      listed = /^##\s+Checklist\s*$/.test(line)
      continue
    }
    if (listed && BOX.test(line)) open++
  }
  return open
}

/** W217: every change of the repo around `cwd` whose checklist has open boxes. */
export function openBoxes(cwd) {
  if (typeof cwd !== 'string' || !cwd) return []
  const root = repoRoot(cwd)
  if (!root) return []
  const dir = join(root, '.agents', 'changes')
  let names
  try {
    names = readdirSync(dir).sort()
  } catch {
    return []
  }
  const out = []
  for (const change of names) {
    const file = join(dir, change, 'proposal.md')
    try {
      if (!lstatSync(file).isFile()) continue
      const open = countOpen(readFileSync(file, 'utf8'))
      if (open > 0) out.push({ change, open })
    } catch {
      /* no proposal here */
    }
  }
  return out
}

/** W217: the instruction Claude continues with; English, never shown to the person. */
export const reason = (open) =>
  `Not done yet: ${open.map((c) => `.agents/changes/${c.change}/proposal.md has ${c.open} open box${c.open === 1 ? '' : 'es'} under ## Checklist`).join('; ')}. ` +
  'Keep going with the next open box. If a box cannot be done, or you need the person, ask with AskUserQuestion instead of stopping.'

/** W217, W218, W225: block, fall back to a turn end, or leave it to W219/W220 (`undefined`). */
export function decideStop({ open, active, blocks, paused }) {
  const prior = active === false ? 0 : Number.isInteger(blocks) ? blocks : 0
  if (open.length === 0) return { outcome: undefined, blocks: prior }
  if (paused || prior >= MAX_BLOCKS) return { outcome: 'turn-end', blocks: prior }
  return { outcome: 'block', blocks: prior + 1 }
}
