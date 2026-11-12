import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Aviso, NotifySettings } from '../preload/api'
import { NOTIFY_DEFAULTS } from './avisos'
import { setLang } from './lang'
import { createNotifier, present, type NoticeLike, type NotifierDeps, type NotifyTarget, type Shown } from './notify'

const settings = (o: Partial<NotifySettings> = {}): NotifySettings => ({
  types: { ...NOTIFY_DEFAULTS, review: 'mac', cipass: 'mac', merged: 'mac', following: 'mac', opened: 'mac', comment: 'mac', idle: 'mac', radar: 'mac' },
  idleMinutes: 15,
  focus: true,
  group: false,
  quiet: { on: false, from: '19:00', to: '09:00', days: [] },
  ...o
})
let n = 0
const aviso = (kind: Aviso['kind'], o: Partial<Aviso> = {}): Aviso => ({ id: `n${n++}`, kind, at: 0, read: false, title: 'WEB-3535', ...o })
const mr = (kind: Aviso['kind'], o: Partial<Aviso> = {}): Aviso => aviso(kind, { title: 'Festivos por provincia', url: 'https://github.com/acme/web/pull/7', forge: 'github', ...o })

/** A fake Notification: what was built, and the handlers to fire as macOS would. */
class Fake {
  static made: Fake[] = []
  handlers: Record<string, (...a: unknown[]) => void> = {}
  shown = false
  constructor(readonly opts: Shown) {
    Fake.made.push(this)
  }
  on(event: string, cb: (...a: never[]) => void): void {
    this.handlers[event] = cb as (...a: unknown[]) => void
  }
  show(): void {
    this.shown = true
  }
  fire(event: string, ...a: unknown[]): void {
    this.handlers[event]?.(...a)
  }
}

function notifier(o: Partial<NotifierDeps> & { s?: NotifySettings } = {}) {
  const calls = { read: [] as string[][], front: [] as Array<NotifyTarget | null>, external: [] as string[], replies: [] as Array<[string, string]>, reopened: [] as string[] }
  const deps: NotifierDeps = {
    make: (opts) => new Fake(opts) as unknown as NoticeLike,
    settings: async () => o.s ?? settings(),
    context: () => ({ focusOn: false, windowFocused: false }),
    markRead: (ids) => void calls.read.push(ids),
    front: (t) => void calls.front.push(t),
    openExternal: (u) => void calls.external.push(u),
    reply: async (a, text) => (calls.replies.push([a.id, text]), 'sent'),
    options: async () => 0,
    reopen: async (id) => (calls.reopened.push(id), {}),
    closable: async () => undefined,
    ...o
  }
  return { notifier: createNotifier(deps), calls }
}
const flush = (): Promise<void> => new Promise((r) => setImmediate(r))

beforeEach(() => {
  Fake.made = []
  setLang('es')
})
afterEach(() => {
  vi.useRealTimers()
  setLang('es')
})

describe('notify', () => {
  it('every type is titled by what it is about', () => {
    const work = { title: 'WEB-3535', repo: 'shop-web' }
    const cases: Array<[Aviso, string, string]> = [
      [aviso('ask', { ...work, detail: 'Te pregunta: ¿Uso la tabla del BOE?' }), 'WEB-3535 te pregunta', '¿Uso la tabla del BOE?'],
      [aviso('ask', work), 'WEB-3535 te pregunta', 'Claude te necesita'],
      [aviso('done', { ...work, detail: 'Claude dice: Plan listo.' }), 'WEB-3535 ha terminado su turno', 'Claude dice: Plan listo.'],
      [aviso('stopped', work), 'WEB-3535 se ha parado', 'Su terminal se ha cerrado.'],
      [aviso('idle', { ...work, vars: { m: 15 } }), 'WEB-3535 te espera', 'Desde hace 15 min. Solo te lo recuerdo una vez.'],
      [aviso('qa', { ...work, vars: { p: 5, f: 1 } }), 'QA terminada en WEB-3535', '5 pasan, 1 falla.'],
      [aviso('qa', { ...work, vars: { p: 1, f: 2 } }), 'QA terminada en WEB-3535', '1 pasa, 2 fallan.'],
      [aviso('radar', { ...work, vars: { b: 'PF-4870', file: 'src/a.php', more: 0 } }), 'Dos trabajos tocan lo mismo', 'WEB-3535 y PF-4870 tocan src/a.php'],
      [aviso('radar', { ...work, vars: { b: 'PF-4870', file: 'src/a.php', more: 2 } }), 'Dos trabajos tocan lo mismo', 'WEB-3535 y PF-4870 tocan src/a.php y 2 más'],
      [mr('review'), 'Te piden revisión', 'Festivos por provincia'],
      [mr('comment'), 'Comentario nuevo en tu MR', 'Festivos por provincia'],
      [mr('ci'), 'La CI falla en tu MR', 'Festivos por provincia'],
      [mr('cipass'), 'La CI vuelve a pasar', 'Festivos por provincia'],
      [mr('merged'), 'MR fusionada', 'Festivos por provincia'],
      [mr('closed'), 'MR cerrada', 'Festivos por provincia'],
      [mr('gone'), 'Ya no está abierta', 'Festivos por provincia'],
      [mr('following'), 'MR nueva en lo que sigues', 'Festivos por provincia'],
      [mr('opened'), 'Has abierto una MR', 'Festivos por provincia'],
      [aviso('quota', { title: '', vars: { window: 'fiveHour', pct: 82, resetsAt: new Date(2026, 10, 12, 14, 0).toISOString() } }), 'Cuota de Claude al 80 %', '5 h al 82 % · se reinicia a las 14:00']
    ]
    for (const [a, title, body] of cases) {
      const p = present(a)
      expect([p.title, p.body]).toEqual([title, body])
      expect(p.title).not.toBe('Atril')
      // A work's notification carries its repo; an MR's or the quota's does not need one.
      if (a.repo) expect(p.subtitle).toBe('shop-web')
    }
    // The seven-day window names its day.
    expect(present(aviso('quota', { title: '', vars: { window: 'sevenDay', pct: 80, resetsAt: new Date(2026, 10, 12, 9, 0).toISOString() } })).body).toBe('7 días al 80 % · se reinicia el jueves')
    // The language of the moment (W48).
    setLang('en')
    expect(present(cases[0]![0]).title).toBe('WEB-3535 asks you')
    expect(present(cases[2]![0]).body).toBe('Claude says: Plan listo.')
  })

  it('ci offers to fix it with Claude', async () => {
    const { notifier: ntf, calls } = notifier()
    const a = mr('ci')
    await ntf.notify([a])
    const [f] = Fake.made
    expect(f!.opts.actions).toEqual([{ type: 'button', text: 'Arreglar con Claude' }])
    f!.fire('action', {}, 0)
    expect(calls.front).toEqual([{ kind: 'fixCi', url: a.url }])
    // A click opens the MR view.
    f!.fire('click')
    expect(calls.front.at(-1)).toEqual({ kind: 'mr', url: a.url })
  })

  it('a merged MR offers to close its work', async () => {
    const { notifier: ntf, calls } = notifier({ closable: async (a) => (a.branch === 'feat/uno' ? 'ws1' : undefined) })
    await ntf.notify([mr('merged', { branch: 'feat/uno' }), mr('closed', { branch: 'feat/otra' })])
    const [merged, closed] = Fake.made
    expect(merged!.opts.actions).toEqual([{ type: 'button', text: 'Cerrar su trabajo' }])
    expect(closed!.opts.actions).toBeUndefined()
    merged!.fire('action', {}, 0)
    expect(calls.front).toEqual([{ kind: 'close', id: 'ws1' }])
    // Clicking opens the MR in its forge, not the window.
    closed!.fire('click')
    expect(calls.external).toEqual(['https://github.com/acme/web/pull/7'])
    expect(calls.front).toHaveLength(1)
  })

  it('a stopped agent offers to reopen', async () => {
    const { notifier: ntf, calls } = notifier({ reopen: async (id) => (id === 'ws2' ? { error: 'La carpeta ya no existe.' } : {}) })
    await ntf.notify([aviso('stopped', { workspaceId: 'ws1' }), aviso('stopped', { title: 'OPS-4131', workspaceId: 'ws2' })])
    const [one, two] = Fake.made
    expect(one!.opts.actions).toEqual([{ type: 'button', text: 'Reabrir' }])
    one!.fire('action', {}, 0)
    two!.fire('action', {}, 0)
    await flush()
    // A refusal comes back as a Mac notification with its sentence.
    expect(Fake.made.slice(2).map((f) => [f.opts.title, f.opts.body, f.shown])).toEqual([['OPS-4131 no se ha podido reabrir', 'La carpeta ya no existe.', true]])
    one!.fire('click')
    expect(calls.front).toEqual([{ kind: 'workspace', id: 'ws1' }])
  })

  it('shown notifications stay referenced and bounded', async () => {
    const { notifier: ntf } = notifier({ max: 3, reply: async () => 'gone' })
    const a = aviso('ask', { workspaceId: 'w' })
    await ntf.notify([a, aviso('done'), aviso('idle')])
    expect(ntf.held()).toBe(3)
    // Each way out lets go of it.
    Fake.made[1]!.fire('close')
    Fake.made[2]!.fire('click')
    expect(ntf.held()).toBe(1)
    // The «no se pudo enviar» notification is held too.
    Fake.made[0]!.fire('reply', {}, 'hola')
    await flush()
    expect(Fake.made[3]!.opts.title).toBe('WEB-3535: no se pudo enviar, ese trabajo ya no está')
    expect(ntf.held()).toBe(1)
    // Never more than the newest `max`.
    await ntf.notify([aviso('ask'), aviso('ask'), aviso('ask'), aviso('ask')])
    expect(ntf.held()).toBe(3)
  })

  it('a click opens what the notice is about', async () => {
    let t = 1000
    const { notifier: ntf, calls } = notifier({ now: () => t })
    const ask = aviso('ask', { workspaceId: 'ws1' })
    const review = mr('review')
    const gone = mr('gone')
    await ntf.notify([ask, review, gone])
    const [fa, fr, fg] = Fake.made
    fa!.fire('click')
    fr!.fire('click')
    fg!.fire('click')
    expect(calls.front).toEqual([{ kind: 'workspace', id: 'ws1' }, { kind: 'mr', url: review.url }])
    expect(calls.external).toEqual([gone.url])
    // V12: each click marks its own notice read.
    expect(calls.read).toEqual([[ask.id], [review.id], [gone.id]])
    // A click within 1 s of a reply is ignored.
    await ntf.notify([aviso('ask', { workspaceId: 'ws2' })])
    const f = Fake.made.at(-1)!
    f.fire('reply', {}, 'sí')
    t += 500
    f.fire('click')
    expect(calls.front).toHaveLength(2)
    expect(calls.replies.at(-1)?.[1]).toBe('sí')
  })
})

describe('notify grouping', () => {
  it('grouping lets one notice through every two minutes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.setSystemTime(new Date(2026, 10, 11, 12, 0))
    let ctx = { focusOn: false, windowFocused: false }
    let s = settings({ group: true })
    const { notifier: ntf, calls } = notifier({ s: undefined, settings: async () => s, context: () => ctx })
    const titles = (): string[] => Fake.made.map((f) => f.opts.title)

    // The first shows at once; the next ones inside 120 s are held.
    await ntf.notify([aviso('ask', { title: 'WEB-3535', workspaceId: 'a' })])
    await ntf.notify([aviso('ask', { title: 'SHOP-2630', workspaceId: 'b' })])
    await ntf.stopped([aviso('stopped', { title: 'OPS-4131', workspaceId: 'c' }), aviso('stopped', { title: 'PF-1', workspaceId: 'd' })])
    await ntf.notify([aviso('ask', { title: 'APP-9', workspaceId: 'e' })])
    expect(titles()).toEqual(['WEB-3535 te pregunta'])
    await vi.advanceTimersByTimeAsync(119_000)
    expect(titles()).toHaveLength(1)
    // At 120 s they come as one, W179's stops one by one inside it; the list ends with « y {k} más».
    await vi.advanceTimersByTimeAsync(1_000)
    expect(Fake.made.slice(1).map((f) => [f.opts.title, f.opts.body])).toEqual([['4 agentes te necesitan', 'SHOP-2630, OPS-4131, PF-1 y 1 más']])
    // Its click opens Avisos and marks every notice it carries read.
    Fake.made[1]!.fire('click')
    expect(calls.front).toEqual([{ kind: 'avisos' }])
    expect(calls.read[0]).toHaveLength(4)

    // A single held notice shows as itself; a mix with an MR is «avisos nuevos».
    await ntf.notify([mr('review')])
    await vi.advanceTimersByTimeAsync(120_000)
    expect(titles().at(-1)).toBe('Te piden revisión')
    await ntf.notify([mr('ci')])
    await ntf.notify([aviso('ask', { title: 'WEB-1', workspaceId: 'f' })])
    await vi.advanceTimersByTimeAsync(120_000)
    expect(Fake.made.at(-1)!.opts).toMatchObject({ title: '2 avisos nuevos', body: 'Festivos por provincia y WEB-1' })

    // At release each is routed again: one quieted meanwhile (focus in front) never reaches the Mac.
    const before = Fake.made.length
    await ntf.notify([aviso('ask', { title: 'X', workspaceId: 'g' })])
    ctx = { focusOn: true, windowFocused: true }
    await vi.advanceTimersByTimeAsync(240_000)
    expect(Fake.made).toHaveLength(before)
    ctx = { focusOn: false, windowFocused: false }

    // «Agrupar» off: each at once.
    s = settings({ group: false })
    await ntf.notify([aviso('ask', { title: 'Y' }), aviso('ask', { title: 'Z' })])
    expect(titles().slice(-2)).toEqual(['Y te pregunta', 'Z te pregunta'])
    ntf.stop()
  })
})
