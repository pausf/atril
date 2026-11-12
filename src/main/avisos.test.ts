import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem, MrLists } from '../preload/api'
import { createAvisos, patchNotifySettings } from './avisos'
import { cleanTmp, tmp } from './test-helpers'

const GH = (n: number): string => `https://github.com/acme/web/pull/${n}`
const GL = (n: number): string => `https://gitlab.com/grp/shop/-/merge_requests/${n}`
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({
  forge: url.includes('gitlab') ? 'gitlab' : 'github',
  url,
  title: `Título ${url.split('/').pop()}`,
  project: 'acme/web',
  author: 'ana',
  updatedAt: '2026-11-09T10:00:00Z',
  ...o
})
const lists = (o: Partial<MrLists> = {}): MrLists => ({
  connected: ['github', 'gitlab'],
  mine: [],
  review: [],
  following: [],
  more: { mine: [], review: [], following: [] },
  errors: [],
  ...o
})

let home: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const kinds = async (a: ReturnType<typeof createAvisos>) => (await a.list()).map((n) => [n.kind, n.title])

describe('avisos', () => {
  it('listings turn into notices', async () => {
    const a = createAvisos()
    const first = lists({ mine: [mr(GH(1), { notes: 2 }), mr(GH(2))], review: [mr(GH(4), { notes: 0 })], following: [mr(GH(5))] })
    await a.onListing(first)
    // Nothing changed: nothing to say.
    await a.onListing(first)
    expect(await a.list()).toEqual([])

    await a.onListing(
      lists({
        // GH 1: one more comment; GH 6 opened by you.
        mine: [mr(GH(1), { notes: 3 }), mr(GH(2)), mr(GH(6))],
        // GH 4: one more comment; GH 7: review requested.
        review: [mr(GH(4), { notes: 1 }), mr(GH(7))],
        // GH 8: new in what you follow; GH 5 vanishing from Sigo is no notice.
        following: [mr(GH(8))]
      })
    )
    const got = await a.list()
    const of = (kind: string): string[][] => got.filter((n) => n.kind === kind).map((n) => [n.title, n.url!]).sort()
    expect(of('review')).toEqual([['Título 7', GH(7)]])
    expect(of('comment')).toEqual([['Título 1', GH(1)], ['Título 4', GH(4)]])
    expect(of('following')).toEqual([['Título 8', GH(8)]])
    expect(of('opened')).toEqual([['Título 6', GH(6)]])
    expect(got).toHaveLength(5)
    expect(got.every((n) => !n.read && typeof n.id === 'string' && n.at > 0)).toBe(true)
    expect(new Set(got.map((n) => n.id)).size).toBe(got.length)

    process.env['ATRIL_HOME'] = tmp()
    await failedAndCapped()
  })

  it('ci fail and pass count the last settled state across running', async () => {
    const a = createAvisos()
    const ci = async (state: Array<MrItem['ci']>): Promise<void> => {
      for (const c of state) await a.onListing(lists({ mine: [mr(GH(1), c ? { ci: c } : {})], review: [mr(GH(2), { ci: c ?? 'none' })] }))
    }
    const kinds = async (): Promise<string[]> => (await a.list()).map((n) => n.kind).reverse()

    // Unknown, running or none before the first settled state: nothing.
    await ci([undefined, 'running', 'none', 'fail'])
    expect(await kinds()).toEqual([])
    // fail → running → pass: one «vuelve a pasar»; pass → running → fail: one «falla».
    await ci(['running', 'pass', 'running', 'running', 'fail'])
    expect(await kinds()).toEqual(['cipass', 'ci'])
    // Staying failed, or only running in between, says nothing more.
    await ci(['fail', 'running', 'fail', 'none'])
    expect(await kinds()).toEqual(['cipass', 'ci'])
    await ci(['pass'])
    expect(await kinds()).toEqual(['cipass', 'ci', 'cipass'])
    // Only Mías speaks: GH 2 in Me toca revisar went through the same states silently.
    expect((await a.list()).every((n) => n.url === GH(1))).toBe(true)
  })

  it('an MR leaving Mías is merged, closed or gone', async () => {
    const asked: string[][] = []
    const outcome = vi.fn(async (gone: Array<{ url: string; forge: string }>) => {
      asked.push(gone.map((g) => g.url))
      return { [GH(1)]: 'merged' as const, [GL(2)]: 'closed' as const }
    })
    const a = createAvisos(undefined, { outcome })
    await a.onListing(lists({ mine: [mr(GH(1), { branch: 'feat/uno' }), mr(GL(2)), mr(GH(3))], review: [mr(GH(4))] }))
    expect(outcome).not.toHaveBeenCalled()
    await a.onListing(lists({ review: [mr(GH(4))] }))
    expect(asked).toEqual([[GH(1), GL(2), GH(3)]])
    expect((await a.list()).map((n) => [n.kind, n.title, n.url, n.branch]).sort()).toEqual(
      [
        ['merged', 'Título 1', GH(1), 'feat/uno'],
        ['closed', 'Título 2', GL(2), undefined],
        ['gone', 'Título 3', GH(3), undefined]
      ].sort()
    )
    // Leaving Me toca revisar is not a departure from Mías: nobody is asked.
    await a.onListing(lists({}))
    expect(asked).toHaveLength(1)

    // A failing outcome is «Ya no está abierta», never a lost listing.
    process.env['ATRIL_HOME'] = tmp()
    const broken = createAvisos(undefined, { outcome: async () => Promise.reject(new Error('boom')) })
    await broken.onListing(lists({ mine: [mr(GH(9))] }))
    await broken.onListing(lists({}))
    expect((await broken.list()).map((n) => n.kind)).toEqual(['gone'])
  })
})

async function failedAndCapped(): Promise<void> {
  const a = createAvisos()
  const base = lists({ mine: [mr(GH(1)), mr(GL(2))], review: [mr(GH(3))] })
  await a.onListing(base)

  // GitHub failed: its rows look gone and new, but nothing is said for GitHub; GitLab still speaks.
  await a.onListing(lists({ mine: [mr(GH(9)), mr(GL(4))], errors: [{ forge: 'github', error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 502', fix: 'retry' }] }))
  expect(await kinds(a)).toEqual(expect.arrayContaining([['opened', 'Título 4'], ['gone', 'Título 2']]))
  expect(await kinds(a)).toHaveLength(2)
  // …and its rows stay as they were in the baseline.
  const stored = JSON.parse(readFileSync(join(process.env['ATRIL_HOME']!, 'avisos.json'), 'utf8')).baseline
  expect(Object.keys(stored).sort()).toEqual([GH(1), GH(3), GL(4)])

  // The next good GitHub listing compares against the previous one, which had failed: silence too.
  await a.markRead('all')
  await a.onListing(lists({ mine: [mr(GH(10)), mr(GL(4))] }))
  expect((await a.list()).filter((n) => !n.read)).toEqual([])

  // A capped Mías on GitHub: neither «Has abierto una MR» nor «Ya no está abierta» for that list.
  await a.onListing(lists({ mine: [mr(GH(11)), mr(GL(4))], more: { mine: ['github'], review: [], following: [] } }))
  expect((await a.list()).filter((n) => !n.read)).toEqual([])
  // Capped Me toca revisar on GitLab: no «Te piden revisión» there; GitHub's review still speaks.
  await a.onListing(lists({ mine: [mr(GH(11)), mr(GL(4))], review: [mr(GL(12)), mr(GH(13))], more: { mine: [], review: ['gitlab'], following: [] } }))
  expect((await a.list()).filter((n) => !n.read).map((n) => [n.kind, n.title])).toEqual([['review', 'Título 13']])
}

describe('avisos baseline and store', () => {
  it('the first listing only sets the baseline', async () => {
    // A listing shows each MR once (M2): leaving Mías for Me toca revisar is not a new review request.
    process.env['ATRIL_HOME'] = tmp()
    const moved = createAvisos()
    await moved.onListing(lists({ mine: [mr(GL(40))] }))
    await moved.onListing(lists({ review: [mr(GL(40))] }))
    expect(await moved.list()).toEqual([])

    // A forge that disconnects and comes back starts from a fresh baseline, silently.
    process.env['ATRIL_HOME'] = tmp()
    const back = createAvisos()
    await back.onListing(lists({ mine: [mr(GH(50))], review: [mr(GL(51))] }))
    await back.onListing(lists({ connected: ['gitlab'], review: [mr(GL(51))] }))
    await back.onListing(lists({ mine: [mr(GH(52))], review: [mr(GL(51))] }))
    expect(await back.list()).toEqual([])
    process.env['ATRIL_HOME'] = home

    const a = createAvisos()
    await a.onListing(lists({ mine: [mr(GH(1), { ci: 'fail', notes: 9 })], review: [mr(GH(2))], following: [mr(GH(3))] }))
    expect(await a.list()).toEqual([])
    expect(Object.keys(JSON.parse(readFileSync(join(home, 'avisos.json'), 'utf8')).baseline).sort()).toEqual([GH(1), GH(2), GH(3)])
  })

  it('an agent that needs you is a notice', async () => {
    const a = createAvisos()
    const added = await a.onAgent({ id: 'ws1', branch: 'feat/envio', repoId: 'shop-web', jiraKey: 'WEB-3535' }, 'ask', 'Te pregunta: ¿Uso la tabla del BOE?')
    await a.onAgent({ id: 'ws2', branch: 'feat/sin-tarea', repoId: 'shop-web' }, 'done', 'Claude dice: Listo.')
    expect(await a.list()).toEqual([
      expect.objectContaining({ kind: 'done', title: 'feat/sin-tarea', workspaceId: 'ws2', repo: 'shop-web', detail: 'Claude dice: Listo.', read: false }),
      expect.objectContaining({ kind: 'ask', title: 'WEB-3535', workspaceId: 'ws1', repo: 'shop-web', detail: 'Te pregunta: ¿Uso la tabla del BOE?', read: false })
    ])
    // What was stored comes back, so main can tie the Mac notification to it.
    expect(added).toEqual([(await a.list())[1]])
  })

  it('notices survive a restart and stay bounded', async () => {
    const a = createAvisos()
    await a.onListing(lists({ mine: [mr(GH(1))] }))
    const work = (i: number) => ({ id: `ws${i}`, branch: `b${i}`, repoId: 'r' })
    for (let i = 0; i < 305; i++) await a.onAgent(work(i), 'stopped')
    // All unread: past 300 the oldest go.
    const items = await a.list()
    expect(items).toHaveLength(300)
    expect([items[0]!.title, items.at(-1)!.title]).toEqual(['b304', 'b5'])
    // A read one goes before any unread one, even a newer one.
    const read = items[100]!
    await a.markRead([read.id])

    const b = createAvisos()
    const kept = await b.list()
    expect(kept).toHaveLength(300)
    expect(kept.find((n) => n.id === read.id)?.read).toBe(true)
    await b.onAgent(work(305), 'stopped')
    const after = await b.list()
    expect(after).toHaveLength(300)
    expect(after.some((n) => n.id === read.id)).toBe(false)
    expect([after[0]!.title, after.at(-1)!.title]).toEqual(['b305', 'b5'])

    // The baseline came back too: the next listing is compared with it.
    await b.onListing(lists({ mine: [] }))
    expect((await b.list())[0]).toEqual(expect.objectContaining({ kind: 'gone', title: 'Título 1' }))
    await b.markRead('all')
    expect((await createAvisos().list()).some((n) => !n.read)).toBe(false)
  })
})

describe('notification settings', () => {
  const file = (): string => join(process.env['ATRIL_HOME']!, 'notifications.json')
  const write = (v: unknown): void => writeFileSync(file(), typeof v === 'string' ? v : JSON.stringify(v))
  const DEFAULTS = {
    types: { ask: 'mac', done: 'mac', stopped: 'mac', idle: 'list', radar: 'list', qa: 'mac', review: 'list', comment: 'list', ci: 'mac', cipass: 'list', merged: 'list', following: 'list', opened: 'list', quota: 'mac' },
    idleMinutes: 15,
    focus: true,
    group: true,
    quiet: { on: false, from: '19:00', to: '09:00', days: ['sat', 'sun'] }
  }

  it('notification settings default and clean', async () => {
    const { readNotifySettings } = await import('./avisos')
    // No file, then a file that is not JSON: every field at its default.
    expect(await readNotifySettings()).toEqual(DEFAULTS)
    write('{nope')
    expect(await readNotifySettings()).toEqual(DEFAULTS)

    // Valid fields kept; an unknown key, an invalid value or a malformed field reads as that field's default.
    write({
      types: { ask: 'list', done: 'mute', review: 'mac', ci: 'loud', bogus: 'mac' },
      idleMinutes: 30,
      focus: false,
      group: 'yes',
      quiet: { on: true, from: '22:30', to: '7:00', days: ['mon', 'sun'] },
      extra: 1
    })
    expect(await readNotifySettings()).toEqual({
      ...DEFAULTS,
      types: { ...DEFAULTS.types, ask: 'list', done: 'mute', review: 'mac' },
      idleMinutes: 30,
      focus: false,
      quiet: { on: true, from: '22:30', to: '09:00', days: ['mon', 'sun'] }
    })

    // idleMinutes outside 5–120 or off the 5-minute step; days with an unknown day.
    for (const idleMinutes of [0, 3, 125, 17, 12.5, '15']) {
      write({ idleMinutes, quiet: { days: ['mon', 'funday'] } })
      expect(await readNotifySettings()).toEqual(DEFAULTS)
    }
    for (const idleMinutes of [5, 120]) {
      write({ idleMinutes })
      expect((await readNotifySettings()).idleMinutes).toBe(idleMinutes)
    }
  })

  it('settings patches merge and both survive', async () => {
    const { patchNotifySettings, readNotifySettings } = await import('./avisos')
    // Sent back to back: the second must not overwrite the first.
    const [a, b] = await Promise.all([patchNotifySettings({ types: { ask: 'list' } }), patchNotifySettings({ types: { ci: 'mute' }, quiet: { on: true } })])
    expect(a).toEqual({ ...DEFAULTS, types: { ...DEFAULTS.types, ask: 'list' } })
    const both = { ...DEFAULTS, types: { ...DEFAULTS.types, ask: 'list', ci: 'mute' }, quiet: { ...DEFAULTS.quiet, on: true } }
    expect(b).toEqual(both)
    expect(await readNotifySettings()).toEqual(both)

    // quiet merges field by field; other fields replace; invalid fields are dropped and the stored value stays.
    const c = await patchNotifySettings({ quiet: { from: '21:00', to: 'tarde' }, idleMinutes: 45, focus: false, group: 3, types: { done: 'x' }, other: true } as never)
    expect(c).toEqual({ ...both, idleMinutes: 45, focus: false, quiet: { ...both.quiet, from: '21:00' } })
    expect(JSON.parse(readFileSync(file(), 'utf8'))).toEqual(c)
    expect(existsSync(`${file()}.tmp`)).toBe(false)
    // Not an object at all: nothing changes.
    expect(await patchNotifySettings(null as never)).toEqual(c)
  })
})

describe('notice routing', () => {
  // Local time: 10 Nov 2026 is a Tuesday, 14 Nov a Saturday.
  const at = (day: number, h: number, m = 0): number => new Date(2026, 10, day, h, m).getTime()
  const quiet = { on: true, from: '19:00', to: '09:00', days: ['sat' as const] }

  it('quiet hours wrap midnight and cover whole days', async () => {
    const { inQuiet } = await import('./avisos')
    expect(inQuiet(at(10, 20), quiet)).toBe(true)
    expect(inQuiet(at(11, 8, 59), quiet)).toBe(true)
    expect(inQuiet(at(11, 9), quiet)).toBe(false)
    expect(inQuiet(at(11, 18, 59), quiet)).toBe(false)
    expect(inQuiet(at(11, 19), quiet)).toBe(true)
    expect(inQuiet(at(14, 12), quiet)).toBe(true)
    // A window inside one day; an empty one when from = to; nothing while off.
    expect(inQuiet(at(11, 13), { ...quiet, from: '12:00', to: '14:00' })).toBe(true)
    expect(inQuiet(at(11, 14), { ...quiet, from: '12:00', to: '14:00' })).toBe(false)
    expect(inQuiet(at(11, 11, 59), { ...quiet, from: '12:00', to: '14:00' })).toBe(false)
    expect(inQuiet(at(11, 12), { ...quiet, from: '12:00', to: '12:00' })).toBe(false)
    expect(inQuiet(at(14, 12), { ...quiet, on: false })).toBe(false)
    expect(inQuiet(at(10, 20), { ...quiet, on: false })).toBe(false)
  })

  it('route honours the type, focus and quiet hours', async () => {
    const { route, readNotifySettings } = await import('./avisos')
    const base = await readNotifySettings()
    const awake = { now: at(11, 12), focusOn: false, windowFocused: false }
    const s = { ...base, types: { ...base.types, ask: 'mac' as const, review: 'list' as const, ci: 'mute' as const } }
    expect(route('ask', s, awake)).toBe('mac')
    expect(route('review', s, awake)).toBe('list')
    expect(route('ci', s, awake)).toBe('mute')
    // Quiet hours turn «Mac» into «Solo Avisos»; «Nada» stays nothing and «Solo Avisos» stays itself.
    const night = { ...awake, now: at(10, 23) }
    const q = { ...s, quiet }
    expect(route('ask', q, night)).toBe('list')
    expect(route('ci', q, night)).toBe('mute')
    expect(route('review', q, night)).toBe('list')
    expect(route('ask', q, awake)).toBe('mac')
    expect(route('ask', { ...q, quiet: { ...quiet, on: false } }, night)).toBe('mac')
  })
})

describe('agent notices', () => {
  const ws = (id: string, o: { branch?: string; jiraKey?: string } = {}) => ({ id, branch: o.branch ?? `feat/${id}`, repoId: 'shop-web', ...(o.jiraKey && { jiraKey: o.jiraKey }) })

  it('a question and an end of turn are different kinds', async () => {
    const { kindOf } = await import('./avisos')
    expect(kindOf('Claude dice: Plan listo.')).toBe('done')
    expect(kindOf('Claude ha terminado')).toBe('done')
    expect(kindOf('Te pregunta: ¿Sigo?')).toBe('ask')
    expect(kindOf('Claude te necesita')).toBe('ask')
    expect(kindOf(undefined)).toBe('ask')
    expect(kindOf('Leyendo a.ts')).toBe('ask')
    // Only the exact words: a sentence that merely mentions them is a question.
    expect(kindOf('Claude ha terminado de leer')).toBe('ask')
    expect(kindOf('claude dice: x')).toBe('ask')
  })

  it('a muted type is neither stored nor shown', async () => {
    await patchNotifySettings({ types: { ask: 'mute', review: 'mute', merged: 'mute' } })
    const outcome = vi.fn(async () => ({}))
    const a = createAvisos(undefined, { outcome })
    expect(await a.onAgent(ws('w1'), 'ask', 'Te pregunta: ¿?')).toEqual([])
    expect(await a.onAgent(ws('w1'), 'done', 'Claude dice: ok')).toHaveLength(1)
    await a.onListing(lists({ mine: [mr(GH(1))] }))
    // A muted review request and a departure from Mías: nothing stored, nobody asked.
    expect(await a.onListing(lists({ review: [mr(GH(2))] }))).toEqual([])
    expect(outcome).not.toHaveBeenCalled()
    expect((await a.list()).map((n) => n.kind)).toEqual(['done'])
    // The references still moved: unmuting does not bring back what was said while muted.
    await patchNotifySettings({ types: { review: 'list', merged: 'list' } })
    expect(await a.onListing(lists({ review: [mr(GH(2))] }))).toEqual([])
  })

  it('answered questions stop counting as unread', async () => {
    // A notice stored before the split into ask and done.
    writeFileSync(join(home, 'avisos.json'), JSON.stringify({ baseline: {}, forges: {}, items: [{ id: 'old', kind: 'agent', at: 1, read: false, title: 'feat/w1', workspaceId: 'w1' }] }))
    const a = createAvisos()
    await a.onAgent(ws('w1'), 'ask', 'Te pregunta: ¿?')
    await a.onAgent(ws('w1'), 'done', 'Claude dice: ok')
    await a.onAgent(ws('w1'), 'idle', undefined, { m: 15 })
    await a.onAgent(ws('w1'), 'stopped')
    await a.onAgent(ws('w2'), 'ask', 'Te pregunta: ¿otra?')
    await a.expire('w1')
    const unread = (await a.list()).filter((n) => !n.read).map((n) => [n.workspaceId, n.kind]).sort()
    expect(unread).toEqual([['w1', 'stopped'], ['w2', 'ask']])
  })

  it('opening a work reads its agent notices', async () => {
    const a = createAvisos()
    await a.onAgent(ws('w1'), 'ask', 'Te pregunta: ¿?')
    await a.onAgent(ws('w1'), 'qa', undefined, { p: 1, f: 0 })
    await a.onAgent(ws('w2'), 'done', 'Claude dice: ok')
    // What the window calls when the person selects w1 (V21): its questions are seen, its QA is not.
    await a.seen('w1')
    expect((await a.list()).filter((n) => !n.read).map((n) => [n.workspaceId, n.kind]).sort()).toEqual([['w1', 'qa'], ['w2', 'done']])
  })

  it('clicking the Mac notice marks its notice read', async () => {
    const a = createAvisos()
    const [one] = await a.onAgent(ws('w1'), 'ask', 'Te pregunta: ¿?')
    const two = [...(await a.onAgent(ws('w2'), 'stopped')), ...(await a.onAgent(ws('w3'), 'stopped'))]
    await a.onAgent(ws('w4'), 'ask')
    await a.markRead([one!.id])
    // A grouped notification carries every id it stands for.
    await a.markRead(two.map((n) => n.id))
    expect((await a.list()).filter((n) => !n.read).map((n) => n.workspaceId)).toEqual(['w4'])
  })
})

describe('a feed that stays small', () => {
  const ws = (id: string) => ({ id, branch: `feat/${id}`, repoId: 'shop-web' })

  it('one unread agent notice per workspace', async () => {
    // A legacy needs-you notice, unread, from before the split.
    writeFileSync(join(home, 'avisos.json'), JSON.stringify({ baseline: {}, forges: {}, items: [{ id: 'old', kind: 'agent', at: 1, read: false, title: 'feat/w1', workspaceId: 'w1' }] }))
    const a = createAvisos()
    const [first] = await a.onAgent(ws('w1'), 'ask', 'Te pregunta: ¿A?')
    await a.onAgent(ws('w2'), 'ask', 'Te pregunta: ¿B?')
    const [second] = await a.onAgent(ws('w1'), 'done', 'Claude dice: listo.')
    await a.onAgent(ws('w1'), 'stopped')
    const items = await a.list()
    // w1's question became its end of turn: one notice, unread, newer, above w2's.
    const w1 = items.filter((n) => n.workspaceId === 'w1' && n.kind !== 'stopped')
    expect(w1).toEqual([expect.objectContaining({ kind: 'done', detail: 'Claude dice: listo.', read: false })])
    expect(second!.at).toBeGreaterThanOrEqual(first!.at)
    expect(items.map((n) => [n.workspaceId, n.kind])).toEqual([['w1', 'stopped'], ['w1', 'done'], ['w2', 'ask']])
    // An idle reminder replaces it too; a stop or a QA never replaces nor is replaced.
    await a.onAgent(ws('w1'), 'idle', undefined, { m: 15 })
    expect((await a.list()).map((n) => [n.workspaceId, n.kind])).toEqual([['w1', 'idle'], ['w1', 'stopped'], ['w2', 'ask']])
    // Once read, a new question is a new notice.
    await a.markRead('all')
    await a.onAgent(ws('w1'), 'ask', 'Te pregunta: ¿C?')
    expect((await a.list()).filter((n) => n.workspaceId === 'w1').map((n) => [n.kind, n.read])).toEqual([['ask', false], ['idle', true], ['stopped', true]])
  })

  it('old read notices are dropped', async () => {
    const DAY = 86_400_000
    const now = Date.now()
    const item = (i: number, at: number, read: boolean) => ({ id: `n${i}`, kind: 'review', at, read, title: `t${i}`, url: `https://github.com/a/b/pull/${i}` })
    // 8 days old: read goes, unread stays; 6 days old read stays.
    const items = [item(1, now - 6 * DAY, true), item(2, now - 8 * DAY, false), item(3, now - 8 * DAY, true)]
    writeFileSync(join(home, 'avisos.json'), JSON.stringify({ baseline: {}, forges: {}, items }))
    const a = createAvisos()
    await a.markRead([])
    expect((await a.list()).map((n) => n.id)).toEqual(['n1', 'n2'])

    // Past 300, the oldest read go first; unread stay while read ones remain.
    const many = Array.from({ length: 320 }, (_, i) => item(i, now - i * 1000, i % 2 === 0))
    writeFileSync(join(home, 'avisos.json'), JSON.stringify({ baseline: {}, forges: {}, items: many }))
    const b = createAvisos()
    await b.markRead([])
    const kept = await b.list()
    expect(kept).toHaveLength(300)
    expect(kept.filter((n) => !n.read)).toHaveLength(160)
    // The 20 dropped are the 20 oldest read.
    const dropped = many.filter((n) => !kept.some((k) => k.id === n.id))
    expect(dropped.every((n) => n.read)).toBe(true)
    expect(Math.min(...dropped.map((n) => n.at))).toBe(Math.min(...many.filter((n) => n.read).map((n) => n.at)))
    expect(Math.max(...dropped.map((n) => n.at))).toBeLessThan(Math.min(...kept.filter((n) => n.read).map((n) => n.at)))
  })
})
