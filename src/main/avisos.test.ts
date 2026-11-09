import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MrItem, MrLists } from '../preload/api'
import { createAvisos } from './avisos'
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
    await a.onListing(
      lists({
        mine: [mr(GH(1), { ci: 'pass', notes: 2 }), mr(GH(2)), mr(GL(3), { ci: 'running' })],
        review: [mr(GH(4), { notes: 0 })],
        following: [mr(GH(5))]
      })
    )
    expect(await a.list()).toEqual([])

    // Nothing changed: nothing to say.
    await a.onListing(
      lists({
        mine: [mr(GH(1), { ci: 'pass', notes: 2 }), mr(GH(2)), mr(GL(3), { ci: 'running' })],
        review: [mr(GH(4), { notes: 0 })],
        following: [mr(GH(5))]
      })
    )
    expect(await a.list()).toEqual([])

    await a.onListing(
      lists({
        // GH 1: comment and CI failing; GH 2 is gone; GL 3: CI fails (was running); GH 6 opened by you.
        mine: [mr(GH(1), { ci: 'fail', notes: 3 }), mr(GL(3), { ci: 'fail' }), mr(GH(6))],
        // GH 4: one more comment; GH 7: review requested.
        review: [mr(GH(4), { notes: 1 }), mr(GH(7))],
        // GH 8: new in what you follow; GH 5 vanishing from Sigo is no notice.
        following: [mr(GH(8))]
      })
    )
    const got = await a.list()
    expect(got.map((n) => [n.kind, n.title, n.url]).sort()).toEqual(
      [
        ['comment', 'Título 1', GH(1)],
        ['ci', 'Título 1', GH(1)],
        ['ci', 'Título 3', GL(3)],
        ['comment', 'Título 4', GH(4)],
        ['review', 'Título 7', GH(7)],
        ['following', 'Título 8', GH(8)],
        ['opened', 'Título 6', GH(6)],
        ['gone', 'Título 2', GH(2)]
      ].sort()
    )
    expect(got.every((n) => !n.read && typeof n.id === 'string' && n.at > 0)).toBe(true)
    expect(new Set(got.map((n) => n.id)).size).toBe(got.length)

    // CI-known rule: a row whose CI was unknown (not fetched) gives no «La CI falla».
    const b = createAvisos()
    await b.markRead('all')
    const before = (await b.list()).length
    await b.onListing(lists({ mine: [mr(GH(1), { ci: 'fail', notes: 3 }), mr(GL(3), { ci: 'fail' }), mr(GH(6)), mr(GH(9))], review: [mr(GH(4), { notes: 1 }), mr(GH(7))], following: [mr(GH(8))] }))
    await b.onListing(lists({ mine: [mr(GH(1), { ci: 'fail', notes: 3 }), mr(GL(3), { ci: 'fail' }), mr(GH(6), { ci: 'fail' }), mr(GH(9))], review: [mr(GH(4), { notes: 1 }), mr(GH(7))], following: [mr(GH(8))] }))
    expect((await b.list()).slice(0, -before).map((n) => [n.kind, n.title])).toEqual([['opened', 'Título 9']])

    process.env['ATRIL_HOME'] = tmp()
    await failedAndCapped()
  })
})

async function failedAndCapped(): Promise<void> {
  const a = createAvisos()
  const base = lists({ mine: [mr(GH(1)), mr(GL(2))], review: [mr(GH(3))] })
  await a.onListing(base)

  // GitHub failed: its rows look gone and new, but nothing is said for GitHub; GitLab still speaks.
  await a.onListing(lists({ mine: [mr(GH(9)), mr(GL(4))], errors: [{ forge: 'github', text: 'GitHub ha respondido 502' }] }))
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
    await a.onNeedsYou({ id: 'ws1', branch: 'feat/envio' })
    expect(await a.list()).toEqual([expect.objectContaining({ kind: 'agent', title: 'feat/envio', workspaceId: 'ws1', read: false })])
  })

  it('notices survive a restart and stay bounded', async () => {
    const a = createAvisos()
    await a.onListing(lists({ mine: [mr(GH(1))] }))
    for (let i = 0; i < 205; i++) await a.onNeedsYou({ id: `ws${i}`, branch: `b${i}` })
    // Read or not, the oldest go first.
    const oldest = (await a.list()).at(-1)!
    expect(oldest.title).toBe('b5')
    await a.markRead([oldest.id])

    const b = createAvisos()
    const kept = await b.list()
    expect(kept).toHaveLength(200)
    expect(kept[0]!.title).toBe('b204')
    expect(kept.at(-1)).toEqual({ ...oldest, read: true })
    await b.onNeedsYou({ id: 'ws205', branch: 'b205' })
    expect((await b.list()).map((n) => n.title).slice(-1)).toEqual(['b6'])

    // The baseline came back too: the next listing is compared with it.
    await b.onListing(lists({ mine: [] }))
    expect((await b.list())[0]).toEqual(expect.objectContaining({ kind: 'gone', title: 'Título 1' }))
    await b.markRead('all')
    expect((await createAvisos().list()).some((n) => !n.read)).toBe(false)
  })
})
