import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { WorkspaceRecord } from '../../preload/api'
import { setLang } from '../lang'
import { run, type Runner } from '../run'
import { agentSpy, cleanTmp, git, killTmux, tmp, tmuxSock } from '../test-helpers'
import { readRecords, writeRecords } from '../workspaces'
import { createOpenMr, type MrEntry } from './openmr'

const MINE = 'https://github.com/acme/shop-web/pull/41'
const REVIEW = 'https://github.com/acme/shop-web/pull/88'
const FOLLOWING = 'https://github.com/acme/shop-web/pull/12'
const OTHER = 'https://github.com/acme/cms-admin/pull/3'
const GITLAB = 'https://gitlab.com/acme/shop-web/-/merge_requests/5'

let home: string
let sock: string
beforeEach(() => {
  home = tmp()
  sock = tmuxSock()
  process.env['ATRIL_HOME'] = home
  process.env['ATRIL_TMUX_SOCKET'] = sock
  setLang('es')
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_HOME']
  delete process.env['ATRIL_TMUX_SOCKET']
  cleanTmp()
})

/** A real repo with one commit and the given remotes. */
function repoWith(remotes: Record<string, string>): string {
  const root = tmp()
  git(root, 'init', '-q')
  writeFileSync(join(root, 'a.txt'), 'x')
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'init')
  for (const [name, url] of Object.entries(remotes)) git(root, 'remote', 'add', name, url)
  return root
}
const register = (repos: Array<{ id: string; path: string; override?: string }>): void => writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos }))
const record = (id: string, repoId: string, branch: string, mode: WorkspaceRecord['mode']): WorkspaceRecord => ({ id, repoId, branch, mode, path: '/x', baseCommit: 'abc', agent: 'claude', session: `atril-${id}`, paneId: '%1' })

describe('open an mr in atril', () => {
  it('an mr knows how it opens in atril', async () => {
    const shop = repoWith({ origin: 'git@github.com:pausf/shop-web.git', upstream: 'https://github.com/acme/shop-web.git' })
    const cms = repoWith({ origin: 'https://github.com/acme/cms-admin' })
    register([{ id: 'shop', path: shop }, { id: 'cms', path: cms }, { id: 'gone', path: join(home, 'missing') }])
    const listing: Record<string, MrEntry> = {
      [MINE]: { list: 'mine', forge: 'github', project: 'acme/shop-web', branch: 'feat/calendar' },
      [REVIEW]: { list: 'review', forge: 'github', project: 'acme/shop-web', branch: 'feat/filters' },
      [FOLLOWING]: { list: 'following', forge: 'github', project: 'acme/shop-web', branch: 'feat/flag' },
      [OTHER]: { list: 'review', forge: 'github', project: 'acme/cms-admin', branch: 'feat/filters' },
      [GITLAB]: { list: 'review', forge: 'gitlab', project: 'acme/shop-web', branch: 'feat/x' },
      'https://github.com/acme/api/pull/1': { list: 'review', forge: 'github', project: 'acme/api', branch: 'b' }
    }
    const mr = createOpenMr({ latest: (url) => listing[url], run })

    // Mías is continued; Me toca revisar and Sigo are reviewed. A remote other than origin names the project too.
    expect(await mr.workFor(MINE)).toEqual({ kind: 'continue' })
    expect(await mr.workFor(REVIEW)).toEqual({ kind: 'review' })
    expect(await mr.workFor(FOLLOWING)).toEqual({ kind: 'review' })

    // A record of the same kind on that branch in the matching repo, live or not; the other kind does not count.
    await writeRecords([record('rev1', 'shop', 'feat/filters', 'review'), record('cont1', 'shop', 'feat/calendar', 'worktree'), record('cms1', 'cms', 'feat/flag', 'review'), record('cont2', 'shop', 'feat/flag', 'worktree')])
    expect(await mr.workFor(REVIEW)).toEqual({ kind: 'existing', workspaceId: 'rev1' })
    expect(await mr.workFor(MINE)).toEqual({ kind: 'existing', workspaceId: 'cont1' })
    expect(await mr.workFor(FOLLOWING)).toEqual({ kind: 'review' })
    expect(await mr.workFor(OTHER)).toEqual({ kind: 'review' })

    // No registered repo names the project (the host counts: GitLab's acme/shop-web is not GitHub's).
    expect(await mr.workFor(GITLAB)).toEqual({ kind: 'none', reason: 'Añade el repo de acme/shop-web en Ajustes' })
    expect(await mr.workFor('https://github.com/acme/api/pull/1')).toEqual({ kind: 'none', reason: 'Añade el repo de acme/api en Ajustes' })

    // Several do: nothing is guessed.
    register([{ id: 'shop', path: shop }, { id: 'shop2', path: repoWith({ origin: 'https://github.com/acme/shop-web.git' }) }])
    expect(await mr.workFor(REVIEW)).toEqual({ kind: 'none', reason: 'Varios repos registrados son de acme/shop-web' })

    // Only main's latest listing counts.
    expect(await mr.workFor('https://github.com/acme/shop-web/pull/999')).toEqual({ kind: 'none', reason: 'Esta MR ya no está en la lista: actualiza' })
  })

  it("an mr opens through libretto's own path", async () => {
    // A fork: the project's branch lives on `upstream`, whose path names acme/shop-web on github.com.
    const remote = join(tmp(), 'github.com', 'acme', 'shop-web.git')
    mkdirSync(remote, { recursive: true })
    git(remote, 'init', '--bare', '-q')
    const shop = repoWith({ origin: 'git@github.com:pausf/shop-web.git', upstream: remote })
    git(shop, 'push', '-q', 'upstream', 'HEAD:refs/heads/feat/calendar')
    const tip = git(shop, 'rev-parse', 'HEAD').trim()
    register([{ id: 'shop', path: shop }])
    const listing: Record<string, MrEntry> = {
      [MINE]: { list: 'mine', forge: 'github', project: 'acme/shop-web', branch: 'feat/calendar' },
      [REVIEW]: { list: 'review', forge: 'github', project: 'acme/shop-web', branch: 'feat/filters' },
      'https://github.com/acme/shop-web/pull/2': { list: 'mine', forge: 'github', project: 'acme/shop-web', branch: 'feat/never-pushed' }
    }
    const spy = agentSpy(run)
    const mr = createOpenMr({ latest: (url) => listing[url], run: spy.run })

    // Review: a session in the repo's own folder with review-project's command and the URL as one element.
    const review = await mr.open(REVIEW)
    if (!('workspace' in review)) throw new Error(review.error)
    expect(review.workspace).toMatchObject({ mode: 'review', path: shop, branch: 'feat/filters', repoId: 'shop' })
    expect(spy.argvs[0]!.at(-1)).toBe(`/libretto:libretto-review ${REVIEW}`)

    // Continue: a workspace on the MR's branch fetched from the matching remote, and the flow with no argument.
    const cont = await mr.open(MINE)
    if (!('workspace' in cont)) throw new Error(cont.error)
    expect(cont.workspace).toMatchObject({ mode: 'worktree', branch: 'feat/calendar', baseCommit: tip })
    expect(git(cont.workspace.path, 'rev-parse', '--abbrev-ref', 'feat/calendar@{upstream}').trim()).toBe('upstream/feat/calendar')
    expect(spy.argvs[1]!.at(-1)).toBe('/libretto:libretto-flow')

    // A branch the remote does not have.
    const missing = await mr.open('https://github.com/acme/shop-web/pull/2')
    expect('error' in missing && missing.error.startsWith('No se pudo traer la rama: ')).toBe(true)

    // In place, continuing is refused: the person's copy is never switched.
    register([{ id: 'shop', path: shop, override: 'in-place' }])
    await writeRecords([])
    expect(await mr.open(MINE)).toEqual({ error: 'Este repo trabaja en tu copia: cambia de rama a mano' })

    // A URL that is not https, holds a NUL or starts with «-» starts nothing, even when listed.
    const calls: string[][] = []
    const counting: Runner = (cmd, args, opts) => {
      calls.push([cmd, ...args])
      return run(cmd, args, opts)
    }
    for (const bad of ['http://github.com/acme/shop-web/pull/41', 'https://github.com/acme/shop-web/pull/41\0', '-https://github.com/acme/shop-web/pull/41']) {
      const guarded = createOpenMr({ latest: () => listing[REVIEW], run: counting })
      expect('error' in (await guarded.open(bad))).toBe(true)
    }
    expect(calls).toEqual([])
    expect(spy.argvs).toHaveLength(2)
    expect(await readRecords()).toEqual([])
  })
})
