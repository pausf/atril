import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Aviso, AvisoKind, CiState, ForgeId, MrItem, MrListName, MrLists } from '../preload/api'
import { atrilHome } from './paths'

const KEEP = 200
const LISTS: readonly MrListName[] = ['mine', 'review', 'following']

interface Seen {
  forge: ForgeId
  lists: MrListName[]
  title: string
  notes?: number
  ci?: CiState
}

interface Stored {
  /** Per URL, what the latest good listing of its forge said. */
  baseline: Record<string, Seen>
  /** Forges whose latest listing answered without error, with the lists that were cut at the cap. */
  forges: Partial<Record<ForgeId, MrListName[]>>
  /** Newest first. */
  items: Aviso[]
}

const file = (): string => join(atrilHome(), 'avisos.json')

async function load(): Promise<Stored> {
  try {
    const s = JSON.parse(await readFile(file(), 'utf8')) as Partial<Stored>
    return { baseline: s.baseline ?? {}, forges: s.forges ?? {}, items: Array.isArray(s.items) ? s.items : [] }
  } catch {
    return { baseline: {}, forges: {}, items: [] }
  }
}

/** V1: what one listing says against the previous one, per forge. */
function diff(prev: Stored, lists: MrLists): { baseline: Record<string, Seen>; forges: Stored['forges']; found: Array<Omit<Aviso, 'id' | 'at' | 'read'>> } {
  const failed = new Set(lists.errors.map((e) => e.forge))
  const now = new Map<string, MrItem & { list: MrListName }>()
  for (const l of LISTS) for (const m of lists[l]) if (!now.has(m.url)) now.set(m.url, { ...m, list: l })
  const forges: Stored['forges'] = {}
  for (const f of lists.connected) if (!failed.has(f)) forges[f] = LISTS.filter((l) => lists.more[l].includes(f))

  const baseline: Record<string, Seen> = {}
  // A failed forge keeps what it had: a broken refresh never looks like «everything closed».
  for (const [url, s] of Object.entries(prev.baseline)) if (failed.has(s.forge)) baseline[url] = s
  for (const [url, m] of now)
    if (!failed.has(m.forge)) baseline[url] = { forge: m.forge, lists: [m.list], title: m.title, ...(m.notes !== undefined && { notes: m.notes }), ...(m.ci && { ci: m.ci }) }

  const found: Array<Omit<Aviso, 'id' | 'at' | 'read'>> = []
  const say = (kind: AvisoKind, m: { title: string; forge: ForgeId }, url: string): void => void found.push({ kind, title: m.title, url, forge: m.forge })
  // Only a forge that answered cleanly both times may speak; a list cut at its cap, either time, says nothing new or gone.
  const speaks = (f: ForgeId): boolean => forges[f] !== undefined && prev.forges[f] !== undefined
  const cut = (f: ForgeId, l: MrListName): boolean => !!forges[f]?.includes(l) || !!prev.forges[f]?.includes(l)

  for (const [url, m] of now) {
    if (!speaks(m.forge)) continue
    const was = prev.baseline[url]
    const fresh = !cut(m.forge, m.list)
    if (m.list === 'review' && fresh && !was?.lists.includes('review')) say('review', m, url)
    if (m.list === 'following' && fresh && !was) say('following', m, url)
    if (m.list === 'mine' && fresh && !was) say('opened', m, url)
    if ((m.list === 'mine' || m.list === 'review') && was?.notes !== undefined && m.notes !== undefined && m.notes > was.notes) say('comment', m, url)
    if (m.list === 'mine' && was?.ci && was.ci !== 'fail' && m.ci === 'fail') say('ci', m, url)
  }
  for (const [url, s] of Object.entries(prev.baseline))
    if (s.lists.includes('mine') && !now.has(url) && speaks(s.forge) && !cut(s.forge, 'mine')) say('gone', s, url)
  return { baseline, forges, found }
}

/** The notices feed: derived from listings and agent states, never from an extra forge request. */
export function createAvisos(onChange: (items: Aviso[]) => void = () => {}) {
  let state: Promise<Stored> | null = null
  let queue: Promise<unknown> = Promise.resolve()

  // One change at a time, each written before the next reads.
  const change = (fn: (s: Stored) => Stored | void): Promise<Aviso[]> => {
    const next = queue.then(async () => {
      state ??= load()
      const s = await state
      const out = fn(s) ?? s
      out.items = out.items.slice(0, KEEP)
      state = Promise.resolve(out)
      await mkdir(atrilHome(), { recursive: true })
      await writeFile(`${file()}.tmp`, JSON.stringify(out))
      await rename(`${file()}.tmp`, file())
      onChange(out.items)
      return out.items
    })
    queue = next.catch(() => undefined)
    return next
  }
  const add = (s: Stored, found: Array<Omit<Aviso, 'id' | 'at' | 'read'>>): void => {
    const at = Date.now()
    s.items.unshift(...found.map((n) => ({ ...n, id: randomUUID(), at, read: false })))
  }

  return {
    async list(): Promise<Aviso[]> {
      await queue
      state ??= load()
      return (await state).items
    },
    onListing: (lists: MrLists): Promise<Aviso[]> =>
      change((s) => {
        const d = diff(s, lists)
        const out = { baseline: d.baseline, forges: d.forges, items: s.items }
        add(out, d.found)
        return out
      }),
    onNeedsYou: (ws: { id: string; branch: string }): Promise<Aviso[]> => change((s) => add(s, [{ kind: 'agent', title: ws.branch, workspaceId: ws.id }])),
    markRead: (ids: string[] | 'all'): Promise<Aviso[]> =>
      change((s) => {
        s.items = s.items.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n))
      })
  }
}
