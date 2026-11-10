import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceView } from '../../preload/api'
import type { SecretStore } from '../credentials/store'
import { setLang } from '../lang'
import type { Runner } from '../run'
import { sendText } from '../tmux'
import { createLenses } from './lenses'
import type { ScoreTarget } from './scores'

const GL = 'https://git.example.com'
const GH_URL = 'https://github.com/acme/api/pull/7'
const GL_URL = `${GL}/grp/shop/-/merge_requests/5`
const ORIGINS: Record<string, string> = { '/wt/api': 'git@github.com:acme/api.git', '/wt/api2': 'https://github.com/acme/api.git', '/wt/shop': `${GL}/grp/shop.git` }

const failing: Record<string, ScoreTarget> = {
  [GH_URL]: { forge: 'github', ref: '/repos/acme/api/pulls/7', project: 'acme/api', branch: 'feat/x', ci: 'fail' },
  [GL_URL]: { forge: 'gitlab', ref: '/projects/10/merge_requests/5', project: 'grp/shop', branch: 'feat/y', ci: 'fail' }
}

const ws = (id: string, branch: string, paneId: string): WorkspaceView => ({ id, repoId: id, branch, mode: 'worktree', path: `/wt/${id}`, baseCommit: 'abc', agent: 'claude', session: `atril-${id}`, paneId, alive: true })

beforeEach(() => setLang('es'))
afterEach(() => setLang('es'))

/** The real `sendText` over a fake runner: what tmux would be told, keyed by the workspace's pane. */
function setup(workspaces: WorkspaceView[], target: (url: string) => ScoreTarget | undefined = (u) => failing[u]) {
  const tmux: string[][] = []
  const run: Runner = async (cmd, args) => {
    if (cmd === 'git') {
      const origin = ORIGINS[args[1]!]
      return origin ? { code: 0, stdout: `${origin}\n`, stderr: '' } : { code: 1, stdout: '', stderr: '' }
    }
    tmux.push(args.slice(args.indexOf('send-keys')))
    return { code: 0, stdout: '', stderr: '' }
  }
  const send = vi.fn(async (id: string, text: string) => ((await sendText(workspaces.find((w) => w.id === id)!.paneId, text, run)) ? ('sent' as const) : ('gone' as const)))
  const l = createLenses({ store: {} as SecretStore, run, target, listed: () => true, post: async () => ({ error: 'x' }), send, workspaces: async () => workspaces })
  return { l, tmux, send }
}

describe('fix ci with claude (M30, M32)', () => {
  it('fix ci types into the one agent of the mr', async () => {
    // GitHub: gh, literal text, then Enter as its own key.
    const gh = setup([ws('api', 'feat/x', '%3'), ws('shop', 'feat/y', '%4')])
    expect(await gh.l.fixCi(GH_URL)).toEqual({ sent: 'feat/x' })
    expect(gh.tmux).toEqual([
      ['send-keys', '-t', '%3', '-l', '--', `La CI de ${GH_URL} falla. Mira qué ha fallado con gh pr checks, arréglalo y avísame antes de subir nada.`],
      ['send-keys', '-t', '%3', 'Enter']
    ])

    // GitLab: glab.
    expect(await gh.l.fixCi(GL_URL)).toEqual({ sent: 'feat/y' })
    expect(gh.tmux.slice(2)).toEqual([
      ['send-keys', '-t', '%4', '-l', '--', `La CI de ${GL_URL} falla. Mira qué ha fallado con glab ci view, arréglalo y avísame antes de subir nada.`],
      ['send-keys', '-t', '%4', 'Enter']
    ])

    // Two live workspaces on that branch in repos of the project, or none: nothing typed.
    for (const list of [[ws('api', 'feat/x', '%3'), ws('api2', 'feat/x', '%5')], []]) {
      const two = setup(list)
      expect(await two.l.fixCi(GH_URL)).toEqual({ error: 'No hay un único trabajo de esta MR abierto en Atril.' })
      expect(two.send).not.toHaveBeenCalled()
      expect(two.tmux).toEqual([])
    }

    // CI not «Falla» in main's latest listing, unknown, or an MR the listing no longer has: nothing typed.
    for (const target of [...(['pass', 'running', 'none', undefined] as const).map((ci) => (u: string) => (u === GH_URL ? { ...failing[GH_URL]!, ci } : undefined)), () => undefined]) {
      const ok = setup([ws('api', 'feat/x', '%3')], target)
      expect(await ok.l.fixCi(GH_URL)).toEqual({ error: 'La CI de esta MR ya no falla.' })
      expect(ok.send).not.toHaveBeenCalled()
    }

    // The agent went away between the check and the send: N3's text, never «sent».
    const gone = setup([ws('api', 'feat/x', '%3')])
    gone.send.mockResolvedValueOnce('gone')
    expect(await gone.l.fixCi(GH_URL)).toEqual({ error: 'No se pudo enviar: ese trabajo ya no está' })

    // A second call for the same MR while the first is in flight is refused and types nothing.
    const twice = setup([ws('api', 'feat/x', '%3')])
    let release!: () => void
    twice.send.mockImplementationOnce(() => new Promise((r) => (release = () => r('sent'))))
    const first = twice.l.fixCi(GH_URL)
    const second = await twice.l.fixCi(GH_URL)
    expect(second).toEqual({ error: 'Ya se está enviando a ese trabajo' })
    await vi.waitFor(() => expect(twice.send).toHaveBeenCalled())
    release()
    expect(await first).toEqual({ sent: 'feat/x' })
    expect(twice.send).toHaveBeenCalledTimes(1)
    // Once done, it can be asked again.
    expect(await twice.l.fixCi(GH_URL)).toEqual({ sent: 'feat/x' })

    // In English, the line goes in English.
    setLang('en')
    const en = setup([ws('api', 'feat/x', '%3')])
    await en.l.fixCi(GH_URL)
    expect(en.tmux[0]!.at(-1)).toBe(`The CI of ${GH_URL} is failing. Check what failed with gh pr checks, fix it and tell me before pushing anything.`)
  })

  it('ci agent names the branch only for a failing ci', async () => {
    const one = [ws('api', 'feat/x', '%3'), ws('shop', 'feat/y', '%4')]
    const s = setup(one)
    expect(await s.l.ciAgent(GH_URL)).toBe('feat/x')
    expect(await s.l.ciAgent(GL_URL)).toBe('feat/y')
    // Two agents, or none.
    expect(await setup([ws('api', 'feat/x', '%3'), ws('api2', 'feat/x', '%5')]).l.ciAgent(GH_URL)).toBeNull()
    expect(await setup([]).l.ciAgent(GH_URL)).toBeNull()
    // Any other CI state, or an MR the latest listing does not have.
    for (const ci of ['pass', 'running', 'none', undefined] as const) expect(await setup(one, (u) => (u === GH_URL ? { ...failing[GH_URL]!, ci } : undefined)).l.ciAgent(GH_URL)).toBeNull()
    expect(await setup(one, () => undefined).l.ciAgent(GH_URL)).toBeNull()
    // Asking types nothing.
    expect(s.tmux).toEqual([])
    expect(s.send).not.toHaveBeenCalled()
  })
})
