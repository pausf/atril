import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MrItem } from '../../preload/api'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { cleanTmp, tmp } from '../test-helpers'
import { ciGithub, ciGitlab, listMrs } from './mrs'

const TOKEN = 'ghp_super-secret-forge-token'
const GL = 'https://git.example.com'
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}
const HOUR = 3_600_000
const at = (hoursAgo: number): string => new Date(Date.now() - hoursAgo * HOUR).toISOString()

beforeEach(() => {
  process.env['ATRIL_HOME'] = tmp()
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

async function connected(forges: Array<'github' | 'gitlab'> = ['github', 'gitlab']) {
  const store = createSecretStore(enc)
  if (forges.includes('github')) await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau', site: 'https://github.com' })
  if (forges.includes('gitlab')) await store.saveSecret('gitlab', { token: TOKEN, site: GL }, { account: 'pau', site: GL })
  return store
}

// GitHub shapes: a search hit, a pull (list and detail share it).
const ghHit = (repo: string, n: number, author: string, hoursAgo = 1) => ({
  html_url: `https://github.com/${repo}/pull/${n}`,
  title: `PR ${repo}#${n}`,
  user: { login: author },
  repository_url: `https://api.github.com/repos/${repo}`,
  number: n,
  updated_at: at(hoursAgo),
  comments: n + 2,
  pull_request: {}
})
const ghPull = (repo: string, n: number, author: string, hoursAgo = 1) => ({
  html_url: `https://github.com/${repo}/pull/${n}`,
  title: `PR ${repo}#${n}`,
  user: { login: author },
  number: n,
  updated_at: at(hoursAgo),
  head: { sha: `sha${n}`, ref: `feat/${n}` },
  base: { repo: { full_name: repo } },
  additions: 12,
  deletions: 3,
  changed_files: 4
})
const glMr = (project: string, id: number, iid: number, author: string, hoursAgo = 1, status: string | null = 'success') => ({
  web_url: `${GL}/${project}/-/merge_requests/${iid}`,
  title: `MR ${project}!${iid}`,
  author: { username: author },
  project_id: id,
  iid,
  source_branch: `feat/${iid}`,
  updated_at: at(hoursAgo),
  references: { full: `${project}!${iid}` },
  changes_count: '7',
  user_notes_count: iid,
  head_pipeline: status ? { status } : null
})

type Route = (u: URL) => unknown
const ok = (body: unknown, headers: Record<string, string> = {}): Response => new Response(JSON.stringify(body), { status: 200, headers })

/** A fake fetch over both forges: `github` and `gitlab` answer by URL; undefined means 404. */
function fake(github: Route, gitlab: Route) {
  const calls: Array<{ url: URL; init: RequestInit }> = []
  const f = vi.fn(async (input: URL | string, init: RequestInit = {}) => {
    const url = new URL(String(input))
    calls.push({ url, init })
    const body = url.origin === 'https://api.github.com' ? github(url) : gitlab(url)
    if (body instanceof Response) return body
    if (body instanceof Error) throw body
    return body === undefined ? new Response('{}', { status: 404 }) : ok(body)
  })
  return { f: f as unknown as typeof fetch, calls }
}

const checkRuns = (conclusion = 'success') => ({ total_count: 1, check_runs: [{ status: 'completed', conclusion }] })

function githubRoutes(o: { mine?: unknown[]; review?: unknown[]; subs?: unknown[]; pulls?: Record<string, unknown[]> } = {}): Route {
  return (u) => {
    const p = u.pathname
    if (p === '/search/issues') {
      const q = u.searchParams.get('q') ?? ''
      const items = q.includes('author:@me') ? (o.mine ?? []) : q.includes('review-requested:@me') ? (o.review ?? []) : []
      return { total_count: items.length, items }
    }
    if (p === '/user/subscriptions') return o.subs ?? []
    let m = /^\/repos\/([^/]+\/[^/]+)\/pulls$/.exec(p)
    if (m) return o.pulls?.[m[1]!] ?? []
    m = /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/.exec(p)
    if (m) return ghPull(m[1]!, Number(m[2]), 'whoever')
    if (/\/commits\/[^/]+\/check-runs$/.test(p)) return checkRuns()
    return undefined
  }
}

function gitlabRoutes(o: { mine?: unknown[]; review?: unknown[]; starred?: unknown[]; mrs?: Record<number, unknown[]> } = {}): Route {
  return (u) => {
    const p = u.pathname
    if (p === '/api/v4/merge_requests') return u.searchParams.get('scope') === 'created_by_me' ? (o.mine ?? []) : (o.review ?? [])
    if (p === '/api/v4/projects') return o.starred ?? []
    let m = /^\/api\/v4\/projects\/(\d+)\/merge_requests$/.exec(p)
    if (m) return o.mrs?.[Number(m[1])] ?? []
    m = /^\/api\/v4\/projects\/(\d+)\/merge_requests\/(\d+)$/.exec(p)
    if (m) return { ...glMr('grp/x', Number(m[1]), Number(m[2]), 'whoever'), changes_count: '7', head_pipeline: { status: 'failed' } }
    return undefined
  }
}

describe('mr lists', () => {
  it('lists mine, to review and followed from both forges', async () => {
    const store = await connected()
    const { f, calls } = fake(
      githubRoutes({
        mine: [ghHit('pau/web', 1, 'pau')],
        review: [ghHit('acme/api', 2, 'ana')],
        subs: [
          { full_name: 'acme/old', pushed_at: at(500) },
          { full_name: 'acme/api', pushed_at: at(2) }
        ],
        pulls: { 'acme/api': [ghPull('acme/api', 3, 'pau'), ghPull('acme/api', 4, 'luis', 3)] }
      }),
      gitlabRoutes({
        mine: [glMr('grp/shop', 10, 5, 'pau')],
        review: [glMr('grp/cms', 11, 6, 'eva')],
        starred: [{ id: 12, path_with_namespace: 'grp/front' }],
        mrs: { 12: [glMr('grp/front', 12, 7, 'pau'), glMr('grp/front', 12, 8, 'leo')] }
      })
    )
    const r = await listMrs(store, f)
    expect(r.connected).toEqual(['github', 'gitlab'])
    expect(r.errors).toEqual([])
    expect(r.mine.map((m) => m.url)).toEqual(['https://github.com/pau/web/pull/1', `${GL}/grp/shop/-/merge_requests/5`])
    expect(r.review.map((m) => m.url)).toEqual(['https://github.com/acme/api/pull/2', `${GL}/grp/cms/-/merge_requests/6`])
    // Your own MRs in followed projects are already in Mías.
    expect(r.following.map((m) => m.url)).toEqual(['https://github.com/acme/api/pull/4', `${GL}/grp/front/-/merge_requests/8`])

    expect(r.following[0]).toMatchObject({ forge: 'github', title: 'PR acme/api#4', project: 'acme/api', author: 'luis', ci: 'pass', added: 12, removed: 3, files: 4, branch: 'feat/4' })
    expect(r.following[1]).toMatchObject({ forge: 'gitlab', title: 'MR grp/front!8', project: 'grp/front', author: 'leo', ci: 'fail', files: 7, branch: 'feat/8' })
    expect(r.following[1]!.added).toBeUndefined()
    expect(r.mine[0]!.project).toBe('pau/web')
    // Avisos' «Comentario nuevo»: the count the listing already carries, no extra request.
    expect(r.mine.map((m) => m.notes)).toEqual([3, 5])
    expect(Date.parse(r.following[0]!.updatedAt)).toBeGreaterThan(0)

    // The queries the contract names.
    const q = calls.filter((c) => c.url.pathname === '/search/issues').map((c) => c.url.searchParams.get('q'))
    expect(q).toEqual(expect.arrayContaining(['is:pr is:open author:@me', 'is:pr is:open review-requested:@me']))
    const glReview = calls.find((c) => c.url.pathname === '/api/v4/merge_requests' && c.url.searchParams.get('scope') === 'all')!
    expect(glReview.url.searchParams.get('reviewer_username')).toBe('pau')
    expect(glReview.url.searchParams.get('state')).toBe('opened')
    expect(calls.find((c) => c.url.pathname === '/api/v4/projects')!.url.searchParams.get('starred')).toBe('true')
    expect(calls.some((c) => c.url.pathname.endsWith('/check-runs'))).toBe(true)

    // S25, W50: the token rides only in headers, and never through a redirect.
    for (const c of calls) {
      expect(String(c.url)).not.toContain(TOKEN)
      expect(c.init.redirect).toBe('error')
    }
    expect(JSON.stringify(r)).not.toContain(TOKEN)
  })

  it('an mr shows once', async () => {
    const store = await connected()
    const { f } = fake(
      githubRoutes({
        mine: [ghHit('acme/api', 1, 'pau')],
        // Asked to review your own MR: it stays in Mías.
        review: [ghHit('acme/api', 1, 'pau'), ghHit('acme/api', 2, 'ana')],
        subs: [{ full_name: 'acme/api', pushed_at: at(1) }],
        pulls: { 'acme/api': [ghPull('acme/api', 2, 'ana'), ghPull('acme/api', 3, 'luis')] }
      }),
      gitlabRoutes({
        review: [glMr('grp/front', 12, 8, 'leo')],
        starred: [{ id: 12 }],
        mrs: { 12: [glMr('grp/front', 12, 8, 'leo'), glMr('grp/front', 12, 9, 'leo')] }
      })
    )
    const r = await listMrs(store, f)
    expect(r.mine.map((m) => m.url)).toEqual(['https://github.com/acme/api/pull/1'])
    expect(r.review.map((m) => m.url)).toEqual(['https://github.com/acme/api/pull/2', `${GL}/grp/front/-/merge_requests/8`])
    expect(r.following.map((m) => m.url)).toEqual(['https://github.com/acme/api/pull/3', `${GL}/grp/front/-/merge_requests/9`])
  })

  it('ci states map to four words', () => {
    const run = (status: string, conclusion: string | null = null) => ({ status, conclusion })
    const gh: Array<[Array<{ status: string; conclusion: string | null }>, string]> = [
      [[], 'none'],
      [[run('completed', 'success')], 'pass'],
      [[run('completed', 'success'), run('completed', 'neutral'), run('completed', 'skipped')], 'pass'],
      [[run('queued')], 'running'],
      [[run('in_progress'), run('completed', 'success')], 'running'],
      ...['failure', 'timed_out', 'cancelled', 'action_required'].map((c): [Array<{ status: string; conclusion: string | null }>, string] => [[run('completed', 'success'), run('completed', c)], 'fail']),
      // A failure decides even while others still run.
      [[run('in_progress'), run('completed', 'failure')], 'fail']
    ]
    for (const [runs, want] of gh) expect(ciGithub(runs), JSON.stringify(runs)).toBe(want)

    const gl: Array<[string | null | undefined, string]> = [
      [null, 'none'],
      [undefined, 'none'],
      ...['failed', 'canceled'].map((s): [string, string] => [s, 'fail']),
      ...['running', 'pending', 'created', 'preparing', 'waiting_for_resource', 'scheduled'].map((s): [string, string] => [s, 'running']),
      ...['success', 'skipped', 'manual'].map((s): [string, string] => [s, 'pass'])
    ]
    for (const [status, want] of gl) expect(ciGitlab(status), String(status)).toBe(want)
  })

  it('one forge failing keeps the other', async () => {
    const store = await connected()
    const gitlab = gitlabRoutes({ mine: [glMr('grp/shop', 10, 5, 'pau')], review: [glMr('grp/cms', 11, 6, 'eva')] })
    const githubOk = githubRoutes({ mine: [ghHit('pau/web', 1, 'pau')] })

    // 401 on one request: the rest of GitHub stays, GitLab untouched.
    const unauthorized: Route = (u) => (u.searchParams.get('q')?.includes('review-requested') ? new Response('{}', { status: 401 }) : githubOk(u))
    let r = await listMrs(store, fake(unauthorized, gitlab).f)
    expect(r.errors).toEqual([{ forge: 'github', text: 'GitHub ha rechazado el token: reemplázalo en Ajustes' }])
    expect(r.mine.map((m) => m.url)).toEqual(['https://github.com/pau/web/pull/1', `${GL}/grp/shop/-/merge_requests/5`])
    expect(r.review.map((m) => m.url)).toEqual([`${GL}/grp/cms/-/merge_requests/6`])

    // Another status names it.
    const limited: Route = (u) => (u.pathname === '/user/subscriptions' ? new Response('{}', { status: 403 }) : githubOk(u))
    r = await listMrs(store, fake(limited, gitlab).f)
    expect(r.errors).toEqual([{ forge: 'github', text: 'GitHub ha respondido 403' }])
    expect(r.mine).toHaveLength(2)

    // A network failure shows its code, never its message.
    const down: Route = () => Object.assign(new TypeError('fetch failed https://git.example.com?private_token=x'), { cause: { code: 'ENOTFOUND' } })
    r = await listMrs(store, fake(githubOk, down).f)
    expect(r.errors).toEqual([{ forge: 'gitlab', text: 'No se ha podido conectar con GitLab (ENOTFOUND).' }])
    expect(r.mine.map((m) => m.url)).toEqual(['https://github.com/pau/web/pull/1'])

    // A failed detail keeps the row, with size and CI unknown.
    const noDetail: Route = (u) => (/\/pulls\/\d+$/.test(u.pathname) ? new Response('{}', { status: 502 }) : githubOk(u))
    r = await listMrs(store, fake(noDetail, gitlab).f)
    expect(r.errors).toEqual([{ forge: 'github', text: 'GitHub ha respondido 502' }])
    expect(r.mine[0]).toMatchObject({ url: 'https://github.com/pau/web/pull/1', title: 'PR pau/web#1' })
    expect(r.mine[0]!.ci).toBeUndefined()
  })

  it('caps keep a refresh bounded', async () => {
    const store = await connected()
    const mine = Array.from({ length: 50 }, (_, i) => ghHit('pau/web', i + 1, 'pau'))
    const subs = Array.from({ length: 15 }, (_, i) => ({ full_name: `acme/r${i}`, pushed_at: at(i) }))
    // Shuffled: the 10 most recently pushed are followed whatever the order the forge answers.
    subs.reverse()
    const pulls = Object.fromEntries(subs.map((s, i) => [s.full_name, Array.from({ length: 8 }, (_, k) => ghPull(s.full_name, 100 + k, 'ana', i + k))]))
    const inFlight: Record<string, number> = {}
    const peak: Record<string, number> = {}
    const github = githubRoutes({ mine, review: [], subs, pulls })
    const slow: Route = (u) => {
      if (u.pathname === '/search/issues' && u.searchParams.get('q')?.includes('author:@me')) return { total_count: 80, items: mine }
      return github(u)
    }
    const starred = Array.from({ length: 10 }, (_, i) => ({ id: 100 + i }))
    const gitlab = gitlabRoutes({ starred, mrs: Object.fromEntries(starred.map((p) => [p.id, Array.from({ length: 6 }, (_, k) => glMr(`grp/p${p.id}`, p.id, k + 1, 'leo'))])) })
    const { f: base, calls } = fake(slow, gitlab)
    const f = (async (input: URL, init?: RequestInit) => {
      const url = new URL(String(input))
      const detail = /\/pulls\/\d+$|\/merge_requests\/\d+$/.test(url.pathname) ? url.origin : null
      if (detail) {
        inFlight[detail] = (inFlight[detail] ?? 0) + 1
        peak[detail] = Math.max(peak[detail] ?? 0, inFlight[detail]!)
      }
      try {
        await new Promise((r) => setTimeout(r, 1))
        return await base(input, init)
      } finally {
        if (detail) inFlight[detail]!--
      }
    }) as unknown as typeof fetch

    const r = await listMrs(store, f)
    const gh = (l: MrItem[]) => l.filter((m) => m.forge === 'github')

    // 10 followed projects per forge, the most recently active.
    const followed = calls.filter((c) => /^\/repos\/[^/]+\/[^/]+\/pulls$/.test(c.url.pathname)).map((c) => c.url.pathname)
    expect(followed.sort()).toEqual(Array.from({ length: 10 }, (_, i) => `/repos/acme/r${i}/pulls`).sort())
    expect(calls.find((c) => c.url.pathname === '/api/v4/projects')!.url.searchParams.get('per_page')).toBe('10')
    expect(calls.find((c) => c.url.pathname === '/api/v4/projects')!.url.searchParams.get('order_by')).toBe('last_activity_at')

    // Each list cut at 50, with «more» per forge.
    expect(gh(r.mine)).toHaveLength(50)
    expect(r.more.mine).toEqual(['github'])
    expect(gh(r.following)).toHaveLength(50)
    expect(r.more.following).toEqual(['github', 'gitlab'])
    expect(r.following.filter((m) => m.forge === 'gitlab')).toHaveLength(50)
    expect(r.more.review).toEqual([])

    // At most 60 details per forge, six at a time; the rest show «—».
    const ghDetails = calls.filter((c) => /\/pulls\/\d+$/.test(c.url.pathname))
    const glDetails = calls.filter((c) => /\/merge_requests\/\d+$/.test(c.url.pathname))
    expect(ghDetails).toHaveLength(60)
    expect(glDetails).toHaveLength(50)
    expect(Object.values(peak)).toEqual([6, 6])
    expect(gh(r.mine).every((m) => m.ci === 'pass')).toBe(true)
    expect(gh(r.following).filter((m) => m.ci === undefined && m.files === undefined)).toHaveLength(40)
  })
})
