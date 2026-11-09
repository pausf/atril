import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agentArgv, hooksSettings } from './agent'
import { resourcesDir } from './paths'
import { run } from './run'
import { agentSpy, cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { updateClaudeConfig, withTrust } from './trust'
import { start } from './jira/start'
import { openWorktree, removeWorkspace } from './workspaces'

describe('agentArgv', () => {
  it('the flow prompt is the last argument, after every flag', () => {
    const prompt = '/libretto:libretto-flow --dangerously-skip-permissions'
    const argv = agentArgv({ model: 'opus', prompt })
    expect(argv.at(-1)).toBe(prompt)
    expect(argv.filter((a) => a === prompt)).toHaveLength(1)
    expect(argv.indexOf('--model')).toBeLessThan(argv.length - 1)
  })

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
    expect(Object.keys(hooksSettings().hooks).sort()).toEqual(['Notification', 'PostToolUse', 'PreToolUse', 'Stop', 'UserPromptSubmit'])
    const command = hooksSettings().hooks['Stop']?.[0]?.hooks[0]?.command ?? ''
    expect(command).toBe(`ELECTRON_RUN_AS_NODE=1 "${process.execPath}" "${join(resourcesDir(), 'claude-hook.mjs')}" Stop`)
  })

  it("claude keeps the person's own skills", () => {
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

describe('automatic mode', () => {
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

  const stored = (): { auto?: boolean }[] => JSON.parse(readFileSync(join(home, 'workspaces.json'), 'utf8')).workspaces

  it('automatic mode starts attacca and is recorded', async () => {
    const spy = agentSpy(run)
    const task = await openWorktree({ repoId: 'demo', branch: 'feat/a', agent: 'claude', task: '  fix it  ', auto: true }, spy.run)
    if (!('workspace' in task)) throw new Error(task.error)
    expect(spy.argvs[0]!.at(-1)).toBe('/libretto:libretto-attacca fix it')
    expect(task.workspace.auto).toBe(true)
    expect(stored()[0]!.auto).toBe(true)

    const jira = await start({ key: 'PF-9', components: [], repoId: 'demo', branch: 'PF-9', model: 'default', auto: true }, { run: spy.run, creds: null })
    if (!('workspace' in jira)) throw new Error(jira.error)
    expect(spy.argvs[1]!.at(-1)).toBe('/libretto:libretto-attacca PF-9')
    expect(jira.workspace.auto).toBe(true)

    // Only `true` counts: anything else crossing IPC keeps the manual flow and no field.
    for (const [i, auto] of (['true', 1, {}, null, false] as unknown[]).entries()) {
      const r = await openWorktree({ repoId: 'demo', branch: `feat/m${i}`, agent: 'claude', task: 'x', auto: auto as boolean }, spy.run)
      if (!('workspace' in r)) throw new Error(r.error)
      expect(spy.argvs[2 + i]!.at(-1)).toBe('/libretto:libretto-flow x')
      expect(r.workspace).not.toHaveProperty('auto')
    }
    expect(stored().filter((r) => 'auto' in r)).toHaveLength(2)
  }, 60000)

  it('the automatic marker lives as long as the workspace', async () => {
    const markers = (): string[] => (existsSync(join(home, 'auto')) ? readdirSync(join(home, 'auto')) : [])
    let atStart: string[] | undefined
    const spy = agentSpy(run)
    const probing: typeof run = (cmd, args, opts) => {
      if (cmd === 'tmux' && args.includes('new-session')) atStart = markers()
      return spy.run(cmd, args, opts)
    }
    const manual = await openWorktree({ repoId: 'demo', branch: 'feat/man', agent: 'claude', task: 'x' }, spy.run)
    if (!('workspace' in manual)) throw new Error(manual.error)
    expect(markers()).toEqual([])

    const r = await openWorktree({ repoId: 'demo', branch: 'feat/auto', agent: 'claude', task: 'x', auto: true }, probing)
    if (!('workspace' in r)) throw new Error(r.error)
    expect(atStart).toEqual([r.workspace.session])
    expect(markers()).toEqual([r.workspace.session])

    expect(await removeWorkspace(manual.workspace.id, run)).toEqual({ ok: true })
    expect(markers()).toEqual([r.workspace.session])
    expect(await removeWorkspace(r.workspace.id, run)).toEqual({ ok: true })
    expect(markers()).toEqual([])
  })

  const ASK = '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Modo automático: confirma antes de subir"}}'
  type Case = [event: string, payload: object, asks: boolean]
  const bash = (command: string, asks: boolean, event = 'PreToolUse', tool = 'Bash'): Case => [event, { tool_name: tool, tool_input: { command } }, asks]
  const CASES: Case[] = [
    bash('git push origin feat/x', true),
    bash('git push', true),
    bash('npm test && git push -u origin HEAD', true),
    bash('cd repo; git -C /somewhere push', true),
    bash('git -c user.name=x push', true),
    bash('(gh pr create --fill)', true),
    bash('echo go | glab mr create', true),
    bash('git status', false),
    bash('git pushy', false),
    bash('rg "gh pr" src', false),
    bash('git push', false, 'PostToolUse'),
    bash('git push', false, 'PreToolUse', 'Edit'),
    ['PreToolUse', { tool_name: 'Bash', tool_input: {} }, false]
  ]

  async function runHooks(auto: boolean): Promise<string[]> {
    const dir = tmp()
    const steps = CASES.map(([event, payload], i) => {
      writeFileSync(join(dir, `in-${i}.json`), JSON.stringify(payload))
      const command = hooksSettings().hooks[event]?.[0]?.hooks[0]?.command ?? ''
      return `${command} <'${join(dir, `in-${i}.json`)}' >'${join(dir, `out-${i}`)}'`
    })
    const r = await openWorktree({
      repoId: 'demo',
      branch: 'feat/hook',
      agent: 'claude',
      ...(auto && { auto: true }),
      argv: ['sh', '-c', `${steps.join('; ')}; touch '${join(dir, 'done')}'; sleep 300`]
    })
    if (!('workspace' in r)) throw new Error(r.error)
    const end = Date.now() + 15000
    while (!existsSync(join(dir, 'done')) && Date.now() < end) await new Promise((ok) => setTimeout(ok, 100))
    return CASES.map((_, i) => readFileSync(join(dir, `out-${i}`), 'utf8'))
  }

  it('the hook asks before an automatic push', async () => {
    const outs = await runHooks(true)
    expect(outs).toEqual(CASES.map(([, , asks]) => (asks ? ASK : '')))
    // The existing state file is still written.
    expect(readdirSync(join(home, 'state')).length).toBe(1)
  }, 30000)

  it('the hook stays silent without the marker', async () => {
    expect(await runHooks(false)).toEqual(CASES.map(() => ''))
  }, 30000)
})
