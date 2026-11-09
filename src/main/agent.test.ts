import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agentArgv, hooksSettings } from './agent'
import { run } from './run'
import { agentSpy, cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { updateClaudeConfig, withTrust } from './trust'
import { openWorktree } from './workspaces'

describe('agentArgv', () => {
  it('claude starts with the bundled libretto plugin', () => {
    const argv = agentArgv()
    expect(argv[0]).toBe('claude')
    const flag = argv.indexOf('--plugin-dir')
    expect(flag).toBeGreaterThan(0)
    const dir = argv[flag + 1] ?? ''
    expect(statSync(dir).isDirectory()).toBe(true)
    expect(JSON.parse(readFileSync(join(dir, '.claude-plugin', 'plugin.json'), 'utf8')).name).toBe('libretto')
    expect(existsSync(join(dir, 'skills'))).toBe(true)
  })

  it('claude loads the hooks file that reports agent state', () => {
    const argv = agentArgv()
    const flag = argv.indexOf('--settings')
    expect(flag).toBeGreaterThan(0)
    expect(flag).toBeLessThan(argv.indexOf('--plugin-dir'))
    expect(argv[flag + 1]).toMatch(/hooks\.json$/)
    expect(Object.keys(hooksSettings().hooks).sort()).toEqual(['Notification', 'Stop', 'UserPromptSubmit'])
  })

  it('claude keeps the person\'s own skills', () => {
    const argv = agentArgv()
    for (const drop of ['--setting-sources', '--bare', '--strict-mcp-config']) expect(argv).not.toContain(drop)
  })
})

describe('model', () => {
  let sock: string
  let home: string
  beforeEach(() => {
    sock = tmuxSock()
    home = tmp()
    process.env['ATRIL_TMUX_SOCKET'] = sock
    process.env['ATRIL_HOME'] = home
    makeRegisteredRepo(home)
  })
  afterEach(() => {
    killTmux(sock)
    delete process.env['ATRIL_TMUX_SOCKET']
    delete process.env['ATRIL_HOME']
    cleanTmp()
  })

  it('chosen model reaches claude and the record', async () => {
    expect(agentArgv({ model: 'opus' }).slice(-2)).toEqual(['--model', 'opus'])
    expect(agentArgv({ model: 'default' })).not.toContain('--model')
    expect(agentArgv()).not.toContain('--model')

    const spy = agentSpy(run)
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/m', agent: 'claude', model: 'haiku' }, spy.run)
    if (!('workspace' in r)) throw new Error(r.error)

    const argv = spy.argvs[0]!
    expect(argv.slice(argv.indexOf('--model'), argv.indexOf('--model') + 2)).toEqual(['--model', 'haiku'])
    const stored = JSON.parse(readFileSync(join(home, 'workspaces.json'), 'utf8')).workspaces[0]
    expect(stored.model).toBe('haiku')
  })
})

describe('trust prompt', () => {
  const base = {
    numStartups: 7,
    projects: { '/other': { hasTrustDialogAccepted: false, allowedTools: ['x'] }, '/wt/a': { history: [1] } }
  }

  it('claude in an atril workspace skips the trust prompt', () => {
    const next = withTrust(base, '/wt/a') as typeof base
    expect(next.projects['/wt/a']).toEqual({ history: [1], hasTrustDialogAccepted: true })
    expect(next.projects['/other']).toEqual(base.projects['/other'])
    expect(next.numStartups).toBe(7)
    expect(withTrust(next, '/wt/a')).toEqual(next)
    expect((withTrust({}, '/new') as { projects: object }).projects).toEqual({ '/new': { hasTrustDialogAccepted: true } })
    expect(base.projects['/wt/a']).toEqual({ history: [1] })
  })

  it('trust write keeps a change made by another process while it runs', async () => {
    const dir = tmp()
    mkdirSync(dir, { recursive: true })
    const file = join(dir, '.claude.json')
    writeFileSync(file, JSON.stringify({ a: 1 }))
    let first = true
    const ok = await updateClaudeConfig((c) => {
      if (first) {
        first = false
        // Another Claude process rewrites the file between our read and our rename.
        writeFileSync(file, JSON.stringify({ a: 1, theirs: true, pad: 'x'.repeat(10) }))
      }
      return withTrust(c, '/wt/b')
    }, file)
    expect(ok).toBe(true)
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    expect(saved.theirs).toBe(true)
    expect(saved.projects['/wt/b'].hasTrustDialogAccepted).toBe(true)
  })
})
