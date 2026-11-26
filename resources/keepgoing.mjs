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
  let first
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
    if (listed && BOX.test(line)) {
      open++
      first ??= line.replace(BOX, '').replace(/\s+/g, ' ').trim()
    }
  }
  return { open, first }
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
      const { open, first } = countOpen(readFileSync(file, 'utf8'))
      if (open > 0) out.push({ change, open, first })
    } catch {
      /* no proposal here */
    }
  }
  return out
}

const EDGE = /^[\s*_`"'»”)]+|[\s*_`"'»”)]+$/g

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** W292: the last sentence of the agent's words, for «Para porque:». */
export function lastSentence(text) {
  const last = (typeof text === 'string' ? text.split('\n').filter((l) => l.trim()).at(-1) : '') ?? ''
  const pieces = last.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter(Boolean)
  return clip(pieces.at(-1) ?? '', 200)
}

/** W291: the box the agent is on, for the cap's card. */
export const boxOf = (open) => clip(open[0]?.first ?? '', 120)

/** W219: the last line of the agent's words when they end with a question to the person, else ''. */
export function proseQuestion(text) {
  const end = typeof text === 'string' ? text.replace(/[\s*_`"'»”)]+$/, '') : ''
  if (!end.endsWith('?')) return ''
  const last = end.split('\n').filter((l) => l.trim()).at(-1) ?? ''
  const q = last.replace(/\s+/g, ' ').replace(EDGE, '')
  return q.length > 200 ? `${q.slice(0, 199)}…` : q
}

const STARTED = 'Command running in background with ID: '
const ENDED = /<task-id>([^<\s]+)<\/task-id>/

/** W229: whether a background shell started in this tail has not ended yet; quoted text never counts. */
export function shellsRunning(tail) {
  const open = new Set()
  for (const line of typeof tail === 'string' ? tail.split('\n') : []) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const msg = entry?.message
    if ((msg?.role ?? entry?.type) !== 'user') continue
    const content = msg?.content
    if (typeof content === 'string') {
      const id = content.startsWith('<task-notification>') ? ENDED.exec(content)?.[1] : undefined
      if (id) open.delete(id)
      continue
    }
    if (!Array.isArray(content)) continue
    for (const b of content) {
      const text = b?.type === 'tool_result' && typeof b.content === 'string' ? b.content : ''
      if (text.startsWith(STARTED)) open.add(text.slice(STARTED.length).split(/[.\s]/)[0])
    }
  }
  return open.size > 0
}

/** W217: the instruction Claude continues with; English, never shown to the person. */
export const reason = (open) =>
  `Not done yet: ${open.map((c) => `.agents/changes/${c.change}/proposal.md has ${c.open} open box${c.open === 1 ? '' : 'es'} under ## Checklist`).join('; ')}. ` +
  'Keep going with the next open box. If a box cannot be done, or you need the person, ask with AskUserQuestion instead of stopping.'

/** W217, W218, W225: block, fall back to a turn end, or leave it to W219/W220 (`undefined`). */
export function decideStop({ open, active, blocks, paused }) {
  const prior = active === false ? 0 : Number.isInteger(blocks) ? blocks : 0
  if (open.length === 0) return { outcome: undefined, blocks: prior }
  if (paused || prior >= MAX_BLOCKS) return { outcome: 'turn-end', blocks: prior, cap: !paused }
  return { outcome: 'block', blocks: prior + 1 }
}
