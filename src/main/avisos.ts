import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Aviso, AvisoKind, CiState, ForgeId, MrItem, MrListName, MrLists, NotifyPatch, NotifyRoute, NotifySettings, NotifyType, Weekday } from '../preload/api'
import { atrilHome } from './paths'
import { quietedByFocus } from './focus'

const KEEP = 300
const WEEK = 7 * 86_400_000
const LISTS: readonly MrListName[] = ['mine', 'review', 'following']

interface Seen {
  forge: ForgeId
  lists: MrListName[]
  title: string
  notes?: number
  ci?: CiState
  /** V16: the last `pass` or `fail`, kept across `running` and `none`. */
  ciSettled?: 'pass' | 'fail'
  branch?: string
  project?: string
}

interface Stored {
  /** Per URL, what the latest good listing of its forge said. */
  baseline: Record<string, Seen>
  /** Forges whose latest listing answered without error, with the lists that were cut at the cap. */
  forges: Partial<Record<ForgeId, MrListName[]>>
  /** Newest first. */
  items: Aviso[]
}

type Found = Omit<Aviso, 'id' | 'at' | 'read'>
/** W184: what the forge says of MRs that left Mías; an URL it does not answer is «Ya no está abierta». */
export type OutcomeOf = (gone: Array<{ url: string; forge: ForgeId }>) => Promise<Record<string, 'merged' | 'closed'>>

const file = (): string => join(atrilHome(), 'avisos.json')

async function load(): Promise<Stored> {
  try {
    const s = JSON.parse(await readFile(file(), 'utf8')) as Partial<Stored>
    return { baseline: s.baseline ?? {}, forges: s.forges ?? {}, items: Array.isArray(s.items) ? s.items : [] }
  } catch {
    return { baseline: {}, forges: {}, items: [] }
  }
}

/** The Ajustes row that rules a notice kind. */
export const typeOf = (kind: AvisoKind): NotifyType => (kind === 'closed' || kind === 'gone' ? 'merged' : kind === 'agent' ? 'ask' : kind)

const settled = (c: CiState | undefined): 'pass' | 'fail' | undefined => (c === 'pass' || c === 'fail' ? c : undefined)
const mrNotice = (kind: AvisoKind, m: { title: string; forge: ForgeId; branch?: string; project?: string }, url: string): Found => ({
  kind,
  title: m.title,
  url,
  forge: m.forge,
  ...(m.branch && { branch: m.branch }),
  ...(m.project && { project: m.project })
})

/** V1, V16: what one listing says against the previous one, per forge; `left` are the URLs that left Mías (V17). */
function diff(prev: Stored, lists: MrLists): { baseline: Record<string, Seen>; forges: Stored['forges']; found: Found[]; left: Array<{ url: string; seen: Seen }> } {
  const failed = new Set(lists.errors.map((e) => e.forge))
  const now = new Map<string, MrItem & { list: MrListName }>()
  for (const l of LISTS) for (const m of lists[l]) if (!now.has(m.url)) now.set(m.url, { ...m, list: l })
  const forges: Stored['forges'] = {}
  for (const f of lists.connected) if (!failed.has(f)) forges[f] = LISTS.filter((l) => lists.more[l].includes(f))

  const baseline: Record<string, Seen> = {}
  // A failed forge keeps what it had: a broken refresh never looks like «everything closed».
  for (const [url, s] of Object.entries(prev.baseline)) if (failed.has(s.forge)) baseline[url] = s
  for (const [url, m] of now) {
    if (failed.has(m.forge)) continue
    const was = prev.baseline[url]
    const ciSettled = settled(m.ci) ?? was?.ciSettled ?? settled(was?.ci)
    const branch = m.branch ?? was?.branch
    baseline[url] = {
      forge: m.forge,
      lists: [m.list],
      title: m.title,
      project: m.project,
      ...(m.notes !== undefined && { notes: m.notes }),
      ...(m.ci && { ci: m.ci }),
      ...(ciSettled && { ciSettled }),
      ...(branch && { branch })
    }
  }

  const found: Found[] = []
  const say = (kind: AvisoKind, url: string): void => void found.push(mrNotice(kind, baseline[url]!, url))
  // Only a forge that answered cleanly both times may speak; a list cut at its cap, either time, says nothing new or gone.
  const speaks = (f: ForgeId): boolean => forges[f] !== undefined && prev.forges[f] !== undefined
  const cut = (f: ForgeId, l: MrListName): boolean => !!forges[f]?.includes(l) || !!prev.forges[f]?.includes(l)

  for (const [url, m] of now) {
    if (!speaks(m.forge)) continue
    const was = prev.baseline[url]
    const fresh = !cut(m.forge, m.list)
    // A listing shows each MR once (M2): only an MR new to you, or one you merely followed, is a request.
    if (m.list === 'review' && fresh && (!was || was.lists.every((l) => l === 'following'))) say('review', url)
    if (m.list === 'following' && fresh && !was) say('following', url)
    if (m.list === 'mine' && fresh && !was) say('opened', url)
    if ((m.list === 'mine' || m.list === 'review') && was?.notes !== undefined && m.notes !== undefined && m.notes > was.notes) say('comment', url)
    const before = was?.ciSettled ?? settled(was?.ci)
    if (m.list === 'mine' && before === 'pass' && m.ci === 'fail') say('ci', url)
    if (m.list === 'mine' && before === 'fail' && m.ci === 'pass') say('cipass', url)
  }
  const left = Object.entries(prev.baseline)
    .filter(([url, s]) => s.lists.includes('mine') && !now.has(url) && speaks(s.forge) && !cut(s.forge, 'mine'))
    .map(([url, seen]) => ({ url, seen }))
  return { baseline, forges, found, left }
}

export interface AvisosDeps {
  /** W184; without it every departure is «Ya no está abierta». */
  outcome?: OutcomeOf
  settings?: () => Promise<NotifySettings>
}

type Work = { id: string; branch: string; repoId: string; jiraKey?: string }
type WorkKind = 'ask' | 'done' | 'stopped' | 'idle' | 'qa' | 'radar'
/** The notices a person answers by answering the agent (V11, V18, V21). */
const ANSWERED = new Set<AvisoKind>(['ask', 'done', 'idle', 'agent'])
/** W177: a work is named by its Jira key, else its branch. */
export const workName = (ws: { branch: string; jiraKey?: string }): string => ws.jiraKey || ws.branch

/** V3: an end of turn says «Claude dice: » or is «Claude ha terminado»; anything else is a question. */
export const kindOf = (text: string | undefined): 'ask' | 'done' =>
  text !== undefined && (text.startsWith('Claude dice: ') || text === 'Claude ha terminado') ? 'done' : 'ask'

/** V19, V4: read notices go after a week; past 300 the oldest read go first, then the oldest. Items are newest first. */
function prune(items: Aviso[], now: number): Aviso[] {
  const out = items.filter((n) => !(n.read && now - n.at > WEEK))
  for (let i = out.length - 1; out.length > KEEP && i >= 0; i--) if (out[i]!.read) out.splice(i, 1)
  return out.slice(0, KEEP)
}

function readAgent(s: Stored, workspaceId: string): Aviso[] {
  s.items = s.items.map((n) => (n.workspaceId === workspaceId && !n.read && ANSWERED.has(n.kind) ? { ...n, read: true } : n))
  return s.items
}

/** The notices feed: derived from listings and agent states. */
export function createAvisos(onChange: (items: Aviso[]) => void = () => {}, deps: AvisosDeps = {}) {
  const settings = deps.settings ?? readNotifySettings
  let state: Promise<Stored> | null = null
  let queue: Promise<unknown> = Promise.resolve()

  // One change at a time, each written before the next reads.
  const change = <T>(fn: (s: Stored) => T | Promise<T>): Promise<T> => {
    const next = queue.then(async () => {
      state ??= load()
      const s = await state
      const out = await fn(s)
      s.items = prune(s.items, Date.now())
      await mkdir(atrilHome(), { recursive: true })
      await writeFile(`${file()}.tmp`, JSON.stringify(s))
      await rename(`${file()}.tmp`, file())
      onChange(s.items)
      return out
    })
    queue = next.catch(() => undefined)
    return next
  }
  /** V9: a muted kind is dropped here; what is stored is returned so main can show it. */
  const add = async (s: Stored, found: Found[]): Promise<Aviso[]> => {
    const types = (await settings()).types
    const at = Date.now()
    const added = found.filter((n) => types[typeOf(n.kind)] !== 'mute').map((n) => ({ ...n, id: randomUUID(), at, read: false }))
    s.items.unshift(...added)
    return added
  }

  return {
    async list(): Promise<Aviso[]> {
      await queue
      state ??= load()
      return (await state).items
    },
    /** Returns the notices it added. */
    onListing: (lists: MrLists): Promise<Aviso[]> =>
      change(async (s) => {
        const d = diff(s, lists)
        s.baseline = d.baseline
        s.forges = d.forges
        const ask = d.left.length > 0 && (await settings()).types.merged !== 'mute' ? deps.outcome : undefined
        const answers: Record<string, 'merged' | 'closed'> = ask ? await ask(d.left.map((l) => ({ url: l.url, forge: l.seen.forge }))).catch(() => ({})) : {}
        const gone = d.left.map((l) => mrNotice(answers[l.url] ?? 'gone', l.seen, l.url))
        return add(s, [...d.found, ...gone])
      }),
    /** V3 and the other work notices: titled by the work's name, linked to it, with the agent's words or the numbers to show. */
    onAgent: (ws: Work, kind: WorkKind, detail?: string, vars?: Aviso['vars']): Promise<Aviso[]> =>
      change(async (s) => {
        const added = await add(s, [{ kind, title: workName(ws), workspaceId: ws.id, repo: ws.repoId, ...(detail && { detail }), ...(vars && { vars }) }])
        const [n] = added
        if (!n || !ANSWERED.has(kind)) return added
        // V18: one unread agent notice per workspace; the newest takes the place (and the id) of the ones before.
        const before = s.items.filter((o) => o !== n && o.workspaceId === ws.id && !o.read && ANSWERED.has(o.kind))
        if (before.length) {
          s.items = s.items.filter((o) => !before.includes(o))
          n.id = before[0]!.id
        }
        return added
      }),
    /** W183. */
    onQuota: (vars: Aviso['vars']): Promise<Aviso[]> => change((s) => add(s, [{ kind: 'quota', title: '', ...(vars && { vars }) }])),
    /** V11: a workspace that left needs-you, or the list, has had its questions answered. */
    expire: (workspaceId: string): Promise<Aviso[]> => change((s) => readAgent(s, workspaceId)),
    /** V21: the person opened that workspace. */
    seen: (workspaceId: string): Promise<Aviso[]> => change((s) => readAgent(s, workspaceId)),
    markRead: (ids: string[] | 'all'): Promise<Aviso[]> =>
      change((s) => {
        s.items = s.items.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n))
        return s.items
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
