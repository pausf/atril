import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { RunResult, Runner } from '../run'
import { createPlugins } from './plugins'

const made: string[] = []
const tmp = (): string => {
  const d = realpathSync(mkdtempSync(join(tmpdir(), 'atril-plugins-')))
  made.push(d)
  return d
}
const saved = process.env['ATRIL_CLAUDE_DIR']
afterEach(() => {
  if (saved === undefined) delete process.env['ATRIL_CLAUDE_DIR']
  else process.env['ATRIL_CLAUDE_DIR'] = saved
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true })
})

type Call = { cmd: string; args: string[]; cwd?: string; timeoutMs?: number }
const ok = (json: unknown): RunResult => ({ code: 0, stdout: `noise\n${JSON.stringify(json)}\n`, stderr: '' })

/** A fake runner that notes every call and answers with `reply`; never the real `claude`. */
function fake(reply: (c: Call) => RunResult | Promise<RunResult>): { run: Runner; calls: Call[] } {
  const calls: Call[] = []
  const run: Runner = async (cmd, args, opts) => {
    const c = { cmd, args, cwd: opts?.cwd, timeoutMs: opts?.timeoutMs }
    calls.push(c)
    return reply(c)
  }
  return { run, calls }
}

const CATALOG = {
  installed: [
    { pluginId: 'a@mk', scope: 'user', extra: 1 },
    { pluginId: 'b@mk', scope: 'local', projectPath: '/r' }
  ],
  available: [{ pluginId: 'c@mk', name: 'c', marketplace: 'mk', description: 'Hace c', version: '1.2.0', extra: 2 }, { pluginId: 'd@mk', name: 'd', marketplace: 'mk' }]
}

function setup(reply: (c: Call) => RunResult | Promise<RunResult>) {
  process.env['ATRIL_CLAUDE_DIR'] = tmp()
  const repo = tmp()
  const f = fake(reply)
  const plugins = createPlugins({ run: f.run, repos: async () => [{ id: 'shop-web', path: repo }], libretto: tmp() })
  return { ...f, plugins, repo }
}

describe('plugins', () => {
  it('the catalog comes from the cli json', async () => {
    const { plugins, calls, repo } = setup(() => ok(CATALOG))
    const r = await plugins.catalog('shop-web')
    expect(calls).toEqual([{ cmd: 'claude', args: ['plugin', 'list', '--available', '--json'], cwd: repo, timeoutMs: 120_000 }])
    expect(r).toEqual({
      catalog: {
        installed: [
          { pluginId: 'a@mk', scope: 'user' },
          { pluginId: 'b@mk', scope: 'local', projectPath: '/r' }
        ],
        available: [
          { pluginId: 'c@mk', name: 'c', marketplace: 'mk', description: 'Hace c', version: '1.2.0' },
          { pluginId: 'd@mk', name: 'd', marketplace: 'mk' }
        ]
      }
    })
    const none = await setup(() => ok(CATALOG)).plugins.catalog()
    expect('catalog' in none).toBe(true)
  })

  it('plugin actions run the cli with fixed arguments', async () => {
    const { plugins, calls, repo } = setup((c) => (c.args[1] === 'list' ? ok(CATALOG) : ok({ outcome: 'ok' })))
    for (const action of ['install', 'uninstall', 'update'] as const) {
      const r = await plugins.action({ action, plugin: 'a.b_c-1@mk-2', scope: 'user' })
      expect('list' in r).toBe(true)
    }
    const local = await plugins.action({ action: 'install', plugin: 'a@mk', scope: 'local', repoId: 'shop-web' })
    expect('list' in local).toBe(true)
    const acts = calls.filter((c) => c.args[1] !== 'list')
    expect(acts.map((c) => c.args)).toEqual([
      ['plugin', 'install', 'a.b_c-1@mk-2', '--scope', 'user', '--json'],
      ['plugin', 'uninstall', 'a.b_c-1@mk-2', '--scope', 'user', '--json'],
      ['plugin', 'update', 'a.b_c-1@mk-2', '--scope', 'user', '--json'],
      ['plugin', 'install', 'a@mk', '--scope', 'local', '--json']
    ])
    expect(acts[3]?.cwd).toBe(repo)
    for (const c of acts) {
      expect(c.cmd).toBe('claude')
      expect(c.timeoutMs).toBe(120_000)
      expect(c.args.some((a) => ['-y', '--yes', '--accept-command'].includes(a))).toBe(false)
    }
  })

  it('adding a marketplace runs the cli', async () => {
    const { plugins, calls } = setup((c) => (c.args.includes('add') ? ok({ outcome: 'ok' }) : ok(CATALOG)))
    const r = await plugins.marketplace({ source: 'acme/tools' })
    expect(calls[0]?.args).toEqual(['plugin', 'marketplace', 'add', 'acme/tools', '--scope', 'user', '--json'])
    expect(calls[1]?.args).toEqual(['plugin', 'list', '--available', '--json'])
    expect('catalog' in r && r.catalog.available).toHaveLength(2)
  })

  it('a failed plugin action says why and bad input runs nothing', async () => {
    const req = { action: 'install', plugin: 'a@mk', scope: 'user' } as const
    const code = async (reply: RunResult | (() => RunResult)) => {
      const { plugins } = setup(() => (typeof reply === 'function' ? reply() : reply))
      return plugins.action(req)
    }
    expect(await code({ code: 127, stdout: '', stderr: 'ENOENT' })).toEqual({ error: 'No encuentro Claude Code en este Mac.', code: 'missing' })
    expect(await code({ code: 124, stdout: '', stderr: '' })).toEqual({ error: 'Claude Code no ha contestado a tiempo.', code: 'timeout' })
    const long = 'x'.repeat(400)
    expect(await code({ code: 1, stdout: '', stderr: long })).toEqual({ error: long.slice(-300), code: 'failed' })
    expect(await code({ code: 0, stdout: 'not json\n', stderr: 'boom' })).toEqual({ error: 'boom', code: 'failed' })
    expect(await code(ok({ outcome: 'failed', message: 'Plugin no encontrado' }))).toEqual({ error: 'Plugin no encontrado', code: 'failed' })
    expect(await code({ code: 1, stdout: JSON.stringify({ outcome: 'failed', message: 'pide aceptar' }), stderr: 'x' })).toEqual({ error: 'pide aceptar', code: 'failed' })

    // Validation: nothing runs.
    const v = setup(() => ok({ outcome: 'ok' }))
    const bad = [
      { ...req, action: 'configure' },
      { ...req, plugin: 'a b@mk' },
      { ...req, plugin: '--scope@mk' + ' ' },
      { ...req, plugin: 'sin-marketplace' },
      { ...req, plugin: 'a@mk;rm' },
      { ...req, scope: 'project' },
      { ...req, scope: 'local' },
      { ...req, scope: 'local', repoId: 'otro' }
    ]
    for (const b of bad) expect(await v.plugins.action(b as never)).toMatchObject({ code: 'invalid' })
    expect(await v.plugins.marketplace({ source: '-x' })).toMatchObject({ code: 'invalid' })
    expect(await v.plugins.marketplace({ source: 'a b' })).toMatchObject({ code: 'invalid' })
    expect(await v.plugins.marketplace({ source: '' })).toMatchObject({ code: 'invalid' })
    expect(await v.plugins.marketplace({ source: 'a'.repeat(501) })).toMatchObject({ code: 'invalid' })
    expect(await v.plugins.catalog('nadie')).toMatchObject({ code: 'invalid' })
    expect(v.calls).toEqual([])

    // One at a time: a second request while one runs answers busy and runs nothing.
    let release: (r: RunResult) => void = () => undefined
    const b = setup((c) => (c.args[1] === 'install' ? new Promise<RunResult>((res) => (release = res)) : ok(CATALOG)))
    const first = b.plugins.action(req)
    expect(await b.plugins.action(req)).toMatchObject({ code: 'busy' })
    expect(await b.plugins.marketplace({ source: 'acme/tools' })).toMatchObject({ code: 'busy' })
    expect(b.calls).toHaveLength(1)
    release(ok({ outcome: 'ok' }))
    expect('list' in (await first)).toBe(true)
    expect(await b.plugins.action({ ...req, action: 'update' })).toMatchObject({ list: expect.anything() })
  })

  it('doing it in terminal runs the same command visibly', async () => {
    const { plugins, calls, repo } = setup(() => ({ code: 0, stdout: '', stderr: '' }))
    const req = { action: 'update', plugin: 'a@mk', scope: 'user' } as const
    expect(await plugins.terminal(req)).toEqual({ ok: true })
    expect(calls[0]?.cmd).toBe('osascript')
    expect(calls[0]?.args[3]).toBe('tell application "Terminal" to do script "claude plugin update a@mk --scope user"')
    expect(await plugins.terminal({ ...req, scope: 'local', repoId: 'shop-web' })).toEqual({ ok: true })
    expect(calls[1]?.args[3]).toBe(`tell application "Terminal" to do script "cd '${repo}' && claude plugin update a@mk --scope local"`)
    const n = calls.length
    expect(await plugins.terminal({ ...req, plugin: 'x y@mk' })).toMatchObject({ error: expect.any(String) })
    expect(await plugins.terminal({ ...req, scope: 'local' })).toMatchObject({ error: expect.any(String) })
    expect(calls).toHaveLength(n)
    const fail = setup(() => ({ code: 1, stdout: '', stderr: 'no Terminal\nmore' }))
    expect(await fail.plugins.terminal(req)).toEqual({ error: 'no Terminal' })
  })
})
