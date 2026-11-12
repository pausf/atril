import type { Aviso, NotifyPermission, NotifySettings, NotifyType } from '../preload/api'
import { localiseActivity } from '../preload/activity-i18n'
import { route, typeOf } from './avisos'
import { getLang, t } from './lang'
import type { NoticeReply } from './status'

/** What main hands to Electron's `Notification`. */
export interface Shown {
  title: string
  subtitle?: string
  body: string
  hasReply?: boolean
  replyPlaceholder?: string
  actions?: Array<{ type: 'button'; text: string }>
}

/** The part of Electron's `Notification` main uses. */
export interface NoticeLike {
  on(event: 'click' | 'close', cb: () => void): void
  on(event: 'reply', cb: (e: unknown, text: string) => void): void
  on(event: 'action', cb: (e: unknown, index: number) => void): void
  show(): void
}

/** W194: what the window opens when it comes to the front. */
export type NotifyTarget = { kind: 'workspace'; id: string } | { kind: 'mr'; url: string } | { kind: 'avisos' } | { kind: 'fixCi'; url: string } | { kind: 'close'; id: string }

const AGENT_KINDS = new Set(['ask', 'done', 'agent', 'idle'])
/** W177: an MR notice is titled by what happened to it. */
const mrTitle = (kind: Aviso['kind']): string =>
  ({
    review: t('Te piden revisión'),
    comment: t('Comentario nuevo en tu MR'),
    ci: t('La CI falla en tu MR'),
    cipass: t('La CI vuelve a pasar'),
    merged: t('MR fusionada'),
    closed: t('MR cerrada'),
    following: t('MR nueva en lo que sigues'),
    opened: t('Has abierto una MR')
  })[kind as string] ?? t('Ya no está abierta')

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** «A, B y C», with « y {k} más» past the first three. */
export function joinNames(names: string[]): string {
  const first = names.slice(0, 3)
  const more = names.length - first.length
  if (more > 0) return t('{list} y {k} más', { list: first.join(', '), k: more })
  if (first.length < 2) return first[0] ?? ''
  return t('{list} y {last}', { list: first.slice(0, -1).join(', '), last: first.at(-1)! })
}

export function qaCounts(p: number, f: number): string {
  return `${p === 1 ? t('1 pasa') : t('{p} pasan', { p })}, ${f === 1 ? t('1 falla') : t('{f} fallan', { f })}.`
}

export function quotaBody(vars: Record<string, unknown>): string {
  const pct = num(vars['pct'])
  const at = new Date(str(vars['resetsAt']))
  if (vars['window'] === 'sevenDay') {
    const day = Number.isNaN(at.getTime()) ? '' : at.toLocaleDateString(getLang(), { weekday: 'long' })
    return t('7 días al {pct} % · se reinicia el {day}', { pct, day })
  }
  const time = Number.isNaN(at.getTime()) ? '' : at.toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit', hour12: false })
  return t('5 h al {pct} % · se reinicia a las {time}', { pct, time })
}

/** W177: one stored notice as the Mac shows it, in the language of this moment (W48). */
export function present(n: Aviso, extra: { options?: number; closeWork?: boolean } = {}): Shown {
  const work = n.title
  const v = n.vars ?? {}
  const sub = n.repo ? { subtitle: n.repo } : {}
  const reply = (): Pick<Shown, 'hasReply' | 'replyPlaceholder'> => ({
    hasReply: true,
    replyPlaceholder: extra.options ? t('Responde con 1–{n}', { n: extra.options }) : t('Responde a Claude…')
  })
  switch (n.kind) {
    case 'ask':
    case 'agent': {
      const q = n.detail?.startsWith('Te pregunta: ') ? n.detail.slice('Te pregunta: '.length) : ''
      return { title: t('{work} te pregunta', { work }), ...sub, body: q || t('Claude te necesita'), ...reply() }
    }
    case 'done':
      return { title: t('{work} ha terminado su turno', { work }), ...sub, body: localiseActivity(n.detail || 'Claude ha terminado', t), ...reply() }
    case 'idle':
      return { title: t('{work} te espera', { work }), ...sub, body: t('Desde hace {m} min. Solo te lo recuerdo una vez.', { m: num(v['m']) }), ...reply() }
    case 'stopped':
      return { title: t('{work} se ha parado', { work }), ...sub, body: t('Su terminal se ha cerrado.'), actions: [{ type: 'button', text: t('Reabrir') }] }
    case 'qa':
      return { title: t('QA terminada en {work}', { work }), ...sub, body: qaCounts(num(v['p']), num(v['f'])) }
    case 'radar': {
      const body = t('{a} y {b} tocan {file}', { a: work, b: str(v['b']), file: str(v['file']) })
      const more = num(v['more'])
      return { title: t('Dos trabajos tocan lo mismo'), ...sub, body: more ? t('{text} y {n} más', { text: body, n: more }) : body }
    }
    case 'quota':
      return { title: t('Cuota de Claude al 80 %'), body: quotaBody(v) }
    default: {
      const actions =
        n.kind === 'ci' ? [{ type: 'button' as const, text: t('Arreglar con Claude') }] : (n.kind === 'merged' || n.kind === 'closed') && extra.closeWork ? [{ type: 'button' as const, text: t('Cerrar su trabajo') }] : []
      return { title: mrTitle(n.kind), body: n.title, ...(actions.length && { actions }) }
    }
  }
}

/** W194, V6: where a click on a notice takes the window; an external URL opens in the browser instead. */
export function clickTarget(n: Aviso): NotifyTarget | { external: string } | null {
  if (n.kind === 'merged' || n.kind === 'closed' || n.kind === 'gone') return n.url ? { external: n.url } : null
  if (n.url) return { kind: 'mr', url: n.url }
  if (n.workspaceId) return { kind: 'workspace', id: n.workspaceId }
  return null
}

/** W192: whether macOS lets Atril show notifications, read from `defaults export com.apple.ncprefs -`. */
export function parseNcprefs(xml: string, bundleId: string): NotifyPermission {
  const esc = bundleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const at = new RegExp(`<key>bundle-id</key>\\s*<string>${esc}</string>`).exec(xml)
  if (!at || !xml.includes('<key>apps</key>')) return 'unknown'
  // The rest of this app's entry: up to the next app's bundle-id.
  const rest = xml.slice(at.index + at[0].length)
  const next = rest.indexOf('<key>bundle-id</key>')
  const flags = /<key>flags<\/key>\s*<integer>(\d+)<\/integer>/.exec(next < 0 ? rest : rest.slice(0, next))
  if (!flags) return 'unknown'
  return Number(flags[1]) & 0x2000000 ? 'allowed' : 'blocked'
}

export interface NotifierDeps {
  make: (opts: Shown) => NoticeLike
  settings: () => Promise<NotifySettings>
  context: () => { focusOn: boolean; windowFocused: boolean }
  now?: () => number
  markRead: (ids: string[]) => void
  front: (target: NotifyTarget | null) => void
  openExternal: (url: string) => void
  /** N3: 'gone' when the workspace or its pane is no longer there. */
  reply: (n: Aviso, text: string) => Promise<NoticeReply>
  /** W74: the number of options the session's question offers, 0 for none. */
  options: (n: Aviso) => Promise<number>
  /** W141; a refusal's sentence comes back as `error`. */
  reopen: (id: string) => Promise<{ error?: string }>
  /** W187: the non-review workspace of the MR's branch in its repo. */
  closable: (n: Aviso) => Promise<string | undefined>
  windowMs?: number
  max?: number
}

/** A slot of the grouper: one notice, or W179's several stops shown as one. */
type Slot = Aviso[]

/** W177, W186–W191, W193, W194: the Mac side of the notices. */
export function createNotifier(d: NotifierDeps) {
  const now = d.now ?? Date.now
  const max = d.max ?? 50
  const windowMs = d.windowMs ?? 120_000
  // W191: a Notification nobody references can be collected before it is clicked.
  const shown: NoticeLike[] = []
  const hold = (n: NoticeLike): void => {
    shown.push(n)
    if (shown.length > max) shown.shift()
  }
  const drop = (n: NoticeLike): void => {
    const i = shown.indexOf(n)
    if (i >= 0) shown.splice(i, 1)
  }

  /** Shows one notification; `ids` are the stored notices it stands for, marked read by a click (V12). */
  function display(opts: Shown, ids: string[], click: NotifyTarget | { external: string } | null, on: { reply?: (text: string) => void; action?: () => void } = {}): void {
    const n = d.make(opts)
    let repliedAt = 0
    n.on('click', () => {
      drop(n)
      // ponytail: macOS may follow a reply with a click; one within 1 s of a reply is ignored (N3).
      if (now() - repliedAt < 1000) return
      if (ids.length) d.markRead(ids)
      if (click && 'external' in click) d.openExternal(click.external)
      else d.front(click)
    })
    n.on('reply', (_e, text) => {
      drop(n)
      repliedAt = now()
      on.reply?.(text)
    })
    n.on('action', () => {
      drop(n)
      on.action?.()
    })
    n.on('close', () => drop(n))
    hold(n)
    n.show()
  }

  const say = (title: string, body: string): void => display({ title, body }, [], null)

  async function showOne(a: Aviso): Promise<void> {
    const type = typeOf(a.kind)
    const closeWork = a.kind === 'merged' || a.kind === 'closed' ? await d.closable(a) : undefined
    const opts = present(a, { options: AGENT_KINDS.has(a.kind) ? await d.options(a) : 0, closeWork: closeWork !== undefined })
    const on: { reply?: (text: string) => void; action?: () => void } = {}
    if (opts.hasReply)
      on.reply = (text) =>
        void d.reply(a, text).then((r) => {
          if (r === 'gone') say(t('{work}: no se pudo enviar, ese trabajo ya no está', { work: a.title }), '')
          else if (typeof r === 'object') say(t('{work}: {why}', { work: a.title, why: r.error }), '')
        })
    if (type === 'ci' && a.url) {
      const url = a.url
      on.action = () => d.front({ kind: 'fixCi', url })
    }
    if (closeWork) on.action = () => d.front({ kind: 'close', id: closeWork })
    if (a.kind === 'stopped' && a.workspaceId) {
      const id = a.workspaceId
      on.action = () =>
        void d.reopen(id).then((r) => {
          if (r.error) say(t('{work} no se ha podido reabrir', { work: a.title }), r.error)
        })
    }
    display(opts, [a.id], clickTarget(a), on)
  }

  async function showSlot(slot: Slot): Promise<void> {
    if (slot.length === 1) return showOne(slot[0]!)
    display({ title: t('{n} trabajos se han parado', { n: slot.length }), body: joinNames(slot.map((a) => a.title)) }, slot.map((a) => a.id), { kind: 'avisos' })
  }

  // W189: at most one notification per window while «Agrupar» is on.
  let last = -Infinity
  let held: Aviso[] = []
  let timer: NodeJS.Timeout | undefined
  const isMac = async (a: Aviso): Promise<boolean> => route(typeOf(a.kind), await d.settings(), { now: now(), ...d.context() }) === 'mac'

  async function release(): Promise<void> {
    timer = undefined
    const due = held
    held = []
    // Routed again: what focus or quiet hours silenced meanwhile stays in Avisos.
    const still: Aviso[] = []
    for (const a of due) if (await isMac(a)) still.push(a)
    if (still.length === 0) return
    last = now()
    if (still.length === 1) return showOne(still[0]!)
    const agents = still.every((a) => a.workspaceId)
    display(
      { title: agents ? t('{n} agentes te necesitan', { n: still.length }) : t('{n} avisos nuevos', { n: still.length }), body: joinNames(still.map((a) => a.title || present(a).title)) },
      still.map((a) => a.id),
      { kind: 'avisos' }
    )
  }

  async function push(slot: Slot): Promise<void> {
    if (!(await d.settings()).group) return showSlot(slot)
    if (held.length === 0 && now() - last >= windowMs) {
      last = now()
      return showSlot(slot)
    }
    held.push(...slot)
    timer ??= setTimeout(() => void release(), Math.max(0, last + windowMs - now()))
  }

  return {
    /** New stored notices: those `route` sends to the Mac show, one by one or grouped. */
    async notify(added: Aviso[]): Promise<void> {
      for (const a of added) if (await isMac(a)) await push([a])
    },
    /** W179: the stops of one pass; two or more that go to the Mac are one notification. */
    async stopped(added: Aviso[]): Promise<void> {
      const mac: Aviso[] = []
      for (const a of added) if (await isMac(a)) mac.push(a)
      if (mac.length) await push(mac)
    },
    /** W193: the type's example, past every rule, stored nowhere; `blocked` when macOS will not show it. */
    async test(type: NotifyType, permission: () => Promise<NotifyPermission>): Promise<'shown' | 'blocked'> {
      display(present(example(type), { closeWork: type === 'merged' }), [], null)
      return (await permission()) === 'blocked' ? 'blocked' : 'shown'
    },
    held: (): number => shown.length,
    stop: (): void => clearTimeout(timer)
  }
}

/** S42's examples, as stored notices that never reach the feed. */
export function example(type: NotifyType): Aviso {
  const base = { id: 'test', at: 0, read: false, repo: 'shop-web' }
  const mr = (kind: Aviso['kind'], title: string): Aviso => ({ ...base, kind, title, url: 'https://example.com' })
  switch (type) {
    case 'ask':
      return { ...base, kind: 'ask', title: 'WEB-3535', detail: `Te pregunta: ${t('¿Uso la tabla del BOE o la de la API?')}` }
    case 'done':
      return { ...base, kind: 'done', title: 'SHOP-2630', detail: `Claude dice: ${t('Plan listo, 9 tareas.')}` }
    case 'stopped':
      return { ...base, kind: 'stopped', title: 'OPS-4131' }
    case 'idle':
      return { ...base, kind: 'idle', title: 'WEB-3535', vars: { m: 15 } }
    case 'radar':
      return { ...base, kind: 'radar', title: 'WEB-3535', vars: { b: 'PF-4870', file: 'src/Delivery/PromiseDate.php', more: 0 } }
    case 'qa':
      return { ...base, kind: 'qa', title: 'WEB-3535', vars: { p: 5, f: 1 } }
    case 'quota':
      return { ...base, kind: 'quota', title: '', vars: { window: 'fiveHour', pct: 82, resetsAt: new Date(new Date().setHours(14, 0, 0, 0)).toISOString() } }
    case 'review':
      return mr('review', t('Filtros persistentes en el listado del vendedor'))
    case 'comment':
      return mr('comment', t('Festivos por provincia en la fecha prometida'))
    case 'ci':
      return mr('ci', t('Festivos por provincia en la fecha prometida'))
    case 'cipass':
      return mr('cipass', t('Festivos por provincia en la fecha prometida'))
    case 'merged':
      return mr('merged', t('Migrar el cron de stock a colas'))
    case 'following':
      return mr('following', t('Quitar el flag antiguo del carrusel'))
    case 'opened':
      return mr('opened', t('Índices para el listado de ofertas'))
  }
}
