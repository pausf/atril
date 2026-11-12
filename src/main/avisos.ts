import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Aviso, AvisoKind, CiState, ForgeId, MrItem, MrListName, MrLists, NotifyPatch, NotifyRoute, NotifySettings, NotifyType, Weekday } from '../preload/api'
import { atrilHome } from './paths'
import { quietedByFocus } from './focus'

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
    // A listing shows each MR once (M2): only an MR new to you, or one you merely followed, is a request.
    if (m.list === 'review' && fresh && (!was || was.lists.every((l) => l === 'following'))) say('review', m, url)
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

/** The type table of notify-core: each key's default. */
export const NOTIFY_DEFAULTS: Record<NotifyType, NotifyRoute> = {
  ask: 'mac',
  done: 'mac',
  stopped: 'mac',
  idle: 'list',
  radar: 'list',
  qa: 'mac',
  review: 'list',
  comment: 'list',
  ci: 'mac',
  cipass: 'list',
  merged: 'list',
  following: 'list',
  opened: 'list',
  quota: 'mac'
}
const ROUTES: readonly NotifyRoute[] = ['mac', 'list', 'mute']
const WEEKDAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const defaults = (): NotifySettings => ({ types: { ...NOTIFY_DEFAULTS }, idleMinutes: 15, focus: true, group: true, quiet: { on: false, from: '19:00', to: '09:00', days: ['sat', 'sun'] } })
const notifyFile = (): string => join(atrilHome(), 'notifications.json')
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** V7/V8: each valid field of `raw` over `base`; anything else keeps `base`'s value. */
function cleanOver(base: NotifySettings, raw: unknown): NotifySettings {
  const r = obj(raw)
  const q = obj(r['quiet'])
  const types = { ...base.types }
  for (const [k, v] of Object.entries(obj(r['types']))) if (k in NOTIFY_DEFAULTS && ROUTES.includes(v as NotifyRoute)) types[k as NotifyType] = v as NotifyRoute
  const m = r['idleMinutes']
  const days = q['days']
  const validDays = Array.isArray(days) && days.every((d) => WEEKDAYS.includes(d as Weekday)) && new Set(days).size === days.length
  return {
    types,
    idleMinutes: typeof m === 'number' && Number.isInteger(m) && m >= 5 && m <= 120 && m % 5 === 0 ? m : base.idleMinutes,
    focus: typeof r['focus'] === 'boolean' ? r['focus'] : base.focus,
    group: typeof r['group'] === 'boolean' ? r['group'] : base.group,
    quiet: {
      on: typeof q['on'] === 'boolean' ? q['on'] : base.quiet.on,
      from: typeof q['from'] === 'string' && HHMM.test(q['from']) ? q['from'] : base.quiet.from,
      to: typeof q['to'] === 'string' && HHMM.test(q['to']) ? q['to'] : base.quiet.to,
      days: validDays ? (days as Weekday[]) : base.quiet.days
    }
  }
}

/** V7: a missing or damaged file, or any invalid field, reads as its default. */
export async function readNotifySettings(): Promise<NotifySettings> {
  try {
    return cleanOver(defaults(), JSON.parse(await readFile(notifyFile(), 'utf8')))
  } catch {
    return defaults()
  }
}

let notifyQueue: Promise<unknown> = Promise.resolve()

/** V8: merged into what is stored, written atomically, one patch at a time. */
export function patchNotifySettings(patch: NotifyPatch): Promise<NotifySettings> {
  const next = notifyQueue.then(async () => {
    const out = cleanOver(await readNotifySettings(), patch)
    await mkdir(atrilHome(), { recursive: true })
    await writeFile(`${notifyFile()}.tmp`, JSON.stringify(out, null, 2))
    await rename(`${notifyFile()}.tmp`, notifyFile())
    return out
  })
  notifyQueue = next.catch(() => undefined)
  return next
}

const minutes = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

/** W190: a quiet day, or a time in [from, to), wrapping past midnight; never while off. */
export function inQuiet(now: number, quiet: NotifySettings['quiet']): boolean {
  if (!quiet.on) return false
  const d = new Date(now)
  if (quiet.days.includes(WEEKDAYS[d.getDay()]!)) return true
  const m = d.getHours() * 60 + d.getMinutes()
  const from = minutes(quiet.from)
  const to = minutes(quiet.to)
  return from < to ? m >= from && m < to : from > to && (m >= from || m < to)
}

/** V10: where a new notice goes at this moment. */
export function route(type: NotifyType, s: NotifySettings, at: { now: number; focusOn: boolean; windowFocused: boolean }): NotifyRoute {
  const r = s.types[type]
  if (r !== 'mac') return r
  return quietedByFocus(s.focus, at.focusOn, at.windowFocused) || inQuiet(at.now, s.quiet) ? 'list' : 'mac'
}
