import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Effort } from '../preload/api'
import { effortOptions, modelOptions } from '../renderer/components/models'
import { agentArgv, EFFORTS, hooksSettings, MODELS } from './agent'
import { resourcesDir } from './paths'
import { run } from './run'
import { agentSpy, cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { updateClaudeConfig, withTrust } from './trust'
import { proposeStart, start } from './jira/start'
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
    expect(Object.keys(hooksSettings().hooks).sort()).toEqual(['Notification', 'PostToolUse', 'PreToolUse', 'Stop', 'SubagentStart', 'SubagentStop', 'UserPromptSubmit'])
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

    // W34: Fable is not offered; the effort picker beside the model offers default plus the four levels.
    const id = (es: string): string => es
    expect(MODELS).toEqual(['default', 'opus', 'sonnet', 'haiku'])
    expect(modelOptions(id).map((m) => m.value)).toEqual([...MODELS])
    expect(effortOptions(id)).toEqual([
      { value: 'default', label: 'Por defecto' },
      { value: 'low', label: 'Bajo' },
      { value: 'medium', label: 'Medio' },
      { value: 'high', label: 'Alto' },
      { value: 'xhigh', label: 'Muy alto' }
    ])
  })

  it('effort reaches the command only from the list', async () => {
    expect(EFFORTS).toEqual(['low', 'medium', 'high', 'xhigh'])
    const prompt = '/libretto:libretto-flow PF-1'
    for (const effort of EFFORTS) {
      const argv = agentArgv({ model: 'opus', effort, prompt })
      expect(argv.slice(argv.indexOf('--effort'), argv.indexOf('--effort') + 2)).toEqual(['--effort', effort])
      expect(argv.at(-1)).toBe(prompt)
    }
    for (const effort of ['default', undefined, 'max', '--dangerously-skip-permissions'] as Array<Effort | undefined>) {
      expect(agentArgv({ effort, prompt })).toEqual(agentArgv({ prompt }))
    }

    const spy = agentSpy(run)
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/e', agent: 'claude', effort: 'xhigh' }, spy.run)
    if (!('workspace' in r)) throw new Error(r.error)
    expect(spy.argvs[0]!.slice(spy.argvs[0]!.indexOf('--effort'), spy.argvs[0]!.indexOf('--effort') + 2)).toEqual(['--effort', 'xhigh'])
    const plain = await openWorktree({ repoId: 'demo', branch: 'feat/d', agent: 'claude', effort: 'default' }, spy.run)
    if (!('workspace' in plain)) throw new Error(plain.error)
    expect(spy.argvs[1]).not.toContain('--effort')
    const stored = JSON.parse(readFileSync(join(home, 'workspaces.json'), 'utf8')).workspaces
    expect(stored[0].effort).toBe('xhigh')
    expect(stored[1]).not.toHaveProperty('effort')

    // «Empezar»: the command it shows and the one it runs carry the effort before the prompt; the record keeps it.
    const shown = await proposeStart({ key: 'PF-7', components: [] }, { effort: 'high' })
    if ('error' in shown) throw new Error(shown.error)
    expect(shown.command).toMatch(/ --effort high "\/libretto:libretto-flow PF-7"$/)
    const jira = await start({ key: 'PF-8', components: [], repoId: 'demo', branch: 'PF-8', model: 'sonnet', effort: 'medium', group: 'doing' }, { run: spy.run, creds: null })
    if (!('workspace' in jira)) throw new Error(jira.error)
    const argv = spy.argvs[2]!
    expect(argv.slice(argv.indexOf('--effort'), argv.indexOf('--effort') + 2)).toEqual(['--effort', 'medium'])
    expect(argv.indexOf('--effort')).toBeLessThan(argv.length - 1)
    expect(jira.workspace.effort).toBe('medium')
    const none = await start({ key: 'PF-9', components: [], repoId: 'demo', branch: 'PF-9', model: 'default', group: 'doing' }, { run: spy.run, creds: null })
    if (!('workspace' in none)) throw new Error(none.error)
    expect(spy.argvs[3]).not.toContain('--effort')
    expect(none.workspace).not.toHaveProperty('effort')
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

    // A session that fails to start leaves no marker behind.
    const failing: typeof run = (cmd, args, opts) => (cmd === 'tmux' && args.includes('new-session') ? Promise.resolve({ code: 1, stdout: '', stderr: 'no server' }) : spy.run(cmd, args, opts))
    await openWorktree({ repoId: 'demo', branch: 'feat/fail', agent: 'claude', task: 'x', auto: true }, failing).catch(() => undefined)
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
    bash('sh -c "git push"', true),
    bash("bash -c 'git push origin x'", true),
    bash('/usr/bin/git push', true),
    bash('git -C "/a b" --no-pager push', true),
    bash('echo `git push`', true),
    bash('git --git-dir=.git push', true),
    bash('gh -R o/r pr create', true),
    bash('git status', false),
    bash('git pushy', false),
    bash('rg "gh pr" src', false),
    bash('git push', false, 'PostToolUse'),
    bash('git push', false, 'PreToolUse', 'Edit'),
    ['PreToolUse', { tool_name: 'Bash', tool_input: {} }, false],
    ['PreToolUse', { tool_name: 'Bash', tool_input: { command: 5 } }, false],
    ['PreToolUse', null as unknown as object, false],
    bash('git log; echo push', false)
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

describe('subagents hook', () => {
  let sock: string
  let home: string
  let n = 0
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

  interface Entry { id: string; type: string; description?: string; transcript?: string; startedAt: number; endedAt?: number }
  interface Pending { type: string; description: string; at: number }
  interface Seed { entries?: Entry[]; pending?: Pending[]; state?: object }
  const NOW = (): number => Math.floor(Date.now() / 1000)
  const agent = (type: string, extra: object = {}, tool = 'Agent'): [string, object] => ['PreToolUse', { tool_name: tool, tool_input: { subagent_type: type, description: `d-${type}`, prompt: 'SECRET-PROMPT', ...extra } }]

  /** Runs the real hook for each event in a fresh workspace; the optional seed is on disk before the first one. */
  async function fireIn(events: [string, object][], seed?: Seed): Promise<{ session: string; file: Seed | undefined }> {
    const dir = tmp()
    const gate = join(dir, 'go')
    const steps = events.map(([event, payload], i) => {
      writeFileSync(join(dir, `in-${i}.json`), JSON.stringify(payload))
      return `${hooksSettings().hooks[event]?.[0]?.hooks[0]?.command ?? ''} <'${join(dir, `in-${i}.json`)}'`
    })
    const r = await openWorktree({
      repoId: 'demo',
      branch: `feat/sub${n++}`,
      agent: 'claude',
      argv: ['sh', '-c', `while [ ! -f '${gate}' ]; do sleep 0.1; done; ${steps.join('; ')}; touch '${join(dir, 'done')}'; sleep 300`]
    })
    if (!('workspace' in r)) throw new Error(r.error)
    const session = r.workspace.session
    if (seed?.state) {
      mkdirSync(join(home, 'state'), { recursive: true })
      writeFileSync(join(home, 'state', `${session}.json`), JSON.stringify(seed.state))
    }
    if (seed && !seed.state) {
      mkdirSync(join(home, 'subagents'), { recursive: true })
      writeFileSync(join(home, 'subagents', `${session}.json`), JSON.stringify({ entries: seed.entries ?? [], pending: seed.pending ?? [] }))
    }
    writeFileSync(gate, '')
    const end = Date.now() + 15000
    while (!existsSync(join(dir, 'done')) && Date.now() < end) await new Promise((ok) => setTimeout(ok, 100))
    const path = join(home, 'subagents', `${session}.json`)
    return { session, file: existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined }
  }
  const start = (id: string, type: string, extra: object = {}): [string, object] => ['SubagentStart', { agent_id: id, agent_type: type, prompt: 'SECRET-PROMPT', ...extra }]
  const stop = (id: string, type: string): [string, object] => ['SubagentStop', { agent_id: id, agent_type: type, agent_transcript_path: '/SECRET-PATH.jsonl', last_assistant_message: 'SECRET-LAST', stop_hook_active: false }]
  const finished = (i: number): Entry => ({ id: `f${i}`, type: 'explorer', startedAt: i, endedAt: i + 1 })
  const running = (i: number): Entry => ({ id: `r${i}`, type: 'explorer', startedAt: 100 + i })

  it('a subagent start records its transcript', async () => {
    const t = '/x/sess.jsonl'
    const { session, file } = await fireIn(
      [
        start('a1', 'explorer', { transcript_path: t }),
        start('a2', 'Plan', { transcript_path: '/x/sess.txt' }),
        start('a3', 'Plan', { transcript_path: 7 }),
        start('a4', 'Plan')
      ],
      { entries: [], pending: [{ type: 'explorer', description: 'viejo', at: NOW() }] }
    )
    expect(file?.entries?.map((e) => [e.id, e.type, e.transcript])).toEqual([
      ['a1', 'explorer', '/x/sess/subagents/agent-a1.jsonl'],
      ['a2', 'Plan', undefined],
      ['a3', 'Plan', undefined],
      ['a4', 'Plan', undefined]
    ])
    for (const e of file!.entries!) expect(e.startedAt).toBeGreaterThanOrEqual(NOW() - 20)
    // The leftover pending queue is gone at the next write; no description comes from the hook.
    expect(file?.pending).toBeUndefined()
    expect(file?.entries?.every((e) => e.description === undefined)).toBe(true)
    expect(readFileSync(join(home, 'subagents', `${session}.json`), 'utf8')).not.toContain('SECRET')

    // A PreToolUse never writes the file; the Agent call still counts as working and as activity.
    const pre = await fireIn([agent('explorer', { description: 'T5 paginación' }), agent('x', {}, 'Task')])
    expect(pre.file).toBeUndefined()
    expect(JSON.parse(readFileSync(join(home, 'state', `${pre.session}.json`), 'utf8')).state).toBe('working')
    expect(readFileSync(join(home, 'activity', `${pre.session}.jsonl`), 'utf8')).toContain('Lanzando un subagente: T5 paginación')
  }, 30000)

  it('the hook keeps where the transcript is', async () => {
    const pointer = (session: string): string | undefined => {
      const file = join(home, 'transcripts', session)
      return existsSync(file) ? readFileSync(file, 'utf8') : undefined
    }
    // Any event carries it, a subagent one too; only the path is written, never the rest of the payload.
    const t = join(home, 'claude', 'sess.jsonl')
    const sub = await fireIn([start('a1', 'explorer', { transcript_path: t })])
    expect(pointer(sub.session)).toBe(`${t}\n`)
    // One line per transcript, added when new (a resumed session gets a second); the rest leave it as it is.
    const kept = await fireIn([
      ['UserPromptSubmit', { prompt: 'SECRET-PROMPT', transcript_path: '/x/first.jsonl' }],
      ['Stop', { transcript_path: '/x/first.jsonl', last_assistant_message: 'SECRET-LAST' }],
      ['PreToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' }, transcript_path: '/x/third.txt' }],
      ['PostToolUse', { tool_name: 'Bash', transcript_path: 7 }],
      ['Notification', { message: 'hola' }],
      ['UserPromptSubmit', { prompt: 'sigue', transcript_path: '/x/second.jsonl' }],
      ['Stop', { transcript_path: '/x/first.jsonl' }]
    ])
    expect(pointer(kept.session)).toBe('/x/first.jsonl\n/x/second.jsonl\n')
    expect(pointer(kept.session)).not.toContain('SECRET')
    expect(readdirSync(join(home, 'transcripts')).sort()).toEqual([kept.session, sub.session].sort())
    // No path at all: no file.
    const none = await fireIn([['Stop', {}], ['UserPromptSubmit', { prompt: 'x', transcript_path: 'a.txt' }]])
    expect(pointer(none.session)).toBeUndefined()
  }, 60000)

  it('an asked question keeps its options', async () => {
    const stateOf = (session: string): { state?: string; options?: string[]; multiSelect?: boolean } => JSON.parse(readFileSync(join(home, 'state', `${session}.json`), 'utf8'))
    const ask = (questions: unknown): [string, object] => ['PreToolUse', { tool_name: 'AskUserQuestion', tool_input: { questions } }]
    const long = `Usar   la\nopción ${'larga '.repeat(12)}`
    const first = {
      question: '¿Cómo seguimos?',
      options: [{ label: 'Sí' }, { label: long, description: 'SECRET-DESC' }, { label: 'No' }, { label: 'Quizá' }, { label: 'Quinta' }]
    }

    // The first question's labels, at most 4, collapsed and cut to 40; a second question is ignored.
    const asked = await fireIn([ask([first, { question: 'otra', options: [{ label: 'X' }] }])])
    const s = stateOf(asked.session)
    expect(s.state).toBe('needs-you')
    expect(s.options).toEqual(['Sí', long.replace(/\s+/g, ' ').trim().slice(0, 40), 'No', 'Quizá'])
    expect(s.options?.[1]).toHaveLength(40)
    expect(readFileSync(join(home, 'state', `${asked.session}.json`), 'utf8')).not.toContain('SECRET')

    // A multiSelect question stores none, and says so, so the row offers no quick reply at all.
    const multi = await fireIn([ask([{ ...first, multiSelect: true }])])
    expect(stateOf(multi.session)).toMatchObject({ state: 'needs-you', multiSelect: true })
    expect(stateOf(multi.session).options).toBeUndefined()

    // The options stay while the state stays needs-you: a later Notification or Stop keeps them.
    const kept = await fireIn([ask([first]), ['Notification', { message: 'hola' }], ['Stop', {}]])
    expect(stateOf(kept.session)).toMatchObject({ state: 'needs-you', options: ['Sí', expect.any(String), 'No', 'Quizá'] })

    // They go when the state leaves needs-you, and do not come back with the next stop.
    const left = await fireIn([ask([first]), ['PostToolUse', { tool_name: 'AskUserQuestion' }], ['Stop', {}]])
    expect(stateOf(left.session)).toMatchObject({ state: 'needs-you' })
    expect(stateOf(left.session).options).toBeUndefined()
    const leaving = await fireIn([ask([first]), ['UserPromptSubmit', { prompt: 'sigue' }]])
    expect(stateOf(leaving.session)).toMatchObject({ state: 'working' })
    expect(stateOf(leaving.session).options).toBeUndefined()

    // A question without options, or no questions at all, stores none.
    for (const q of [[{ question: 'sin opciones' }], 'raro']) {
      const none = await fireIn([ask(q)])
      expect(stateOf(none.session)).toMatchObject({ state: 'needs-you' })
      expect(stateOf(none.session).options).toBeUndefined()
    }
  }, 90000)

  it('the idle reminder keeps the question', async () => {
    const stateOf = (session: string): Record<string, unknown> => JSON.parse(readFileSync(join(home, 'state', `${session}.json`), 'utf8'))
    const waiting = { state: 'needs-you', at: 1234, text: 'Te pregunta: ¿Cuál?', options: ['A', 'B'], multiSelect: false }
    const idle: [string, object] = ['Notification', { notification_type: 'idle_prompt', message: 'Claude is waiting for your input' }]
    // Text, options, multiSelect and time exactly as the question left them.
    const kept = await fireIn([idle], { state: waiting })
    expect(stateOf(kept.session)).toEqual(waiting)
    // The older wording without notification_type counts too.
    const old = await fireIn([['Notification', { message: 'Claude is waiting for your input' }]], { state: waiting })
    expect(stateOf(old.session)).toEqual(waiting)
    // Not waiting: the reminder writes needs-you as before; a real notification still replaces the text.
    const fresh = await fireIn([idle], { state: { state: 'working', at: 1 } })
    expect(stateOf(fresh.session)).toMatchObject({ state: 'needs-you' })
    const real = await fireIn([['Notification', { message: 'Necesito permiso' }]], { state: waiting })
    expect(stateOf(real.session)).toMatchObject({ state: 'needs-you', text: 'Te pregunta: Necesito permiso' })
  }, 60000)

  it('subagent events never change the agent state', async () => {
    const idle = await fireIn([start('a1', 'explorer'), start('x', ''), stop('zz', 'explorer'), stop('a1', '')])
    expect(idle.file?.entries?.map((e) => [e.id, e.endedAt])).toEqual([['a1', undefined]])
    // Neither event writes the state file or an activity line.
    expect(existsSync(join(home, 'state'))).toBe(false)
    expect(existsSync(join(home, 'activity'))).toBe(false)

    const done = await fireIn([start('a1', 'explorer'), stop('a1', 'explorer')])
    const [e] = done.file!.entries!
    expect(e?.endedAt).toBeGreaterThanOrEqual(e!.startedAt)
    const raw = readFileSync(join(home, 'subagents', `${done.session}.json`), 'utf8')
    expect(raw).not.toContain('SECRET')
    expect(existsSync(join(home, 'state', `${done.session}.json`))).toBe(false)
  }, 30000)

  it('the subagent list stays bounded', async () => {
    // A new prompt drops what finished and keeps the running ones.
    const prompt = await fireIn([['UserPromptSubmit', { prompt: 'sigue' }]], { entries: [finished(1), running(1), finished(2), running(2)] })
    expect(prompt.file?.entries?.map((e) => e.id)).toEqual(['r1', 'r2'])

    // 20 entries is the ceiling: the oldest finished goes, never a running one.
    const full = await fireIn([start('new', 'explorer')], { entries: [...Array.from({ length: 18 }, (_, i) => finished(i)), running(1), running(2)] })
    expect(full.file?.entries).toHaveLength(20)
    expect(full.file?.entries?.map((e) => e.id)).not.toContain('f0')
    expect(full.file?.entries?.map((e) => e.id)).toContain('f1')
    expect(full.file?.entries?.map((e) => e.id).slice(-3)).toEqual(['r1', 'r2', 'new'])

    // More than 20 running is kept as is.
    const busy = await fireIn([start('new', 'explorer')], { entries: Array.from({ length: 22 }, (_, i) => running(i)) })
    expect(busy.file?.entries).toHaveLength(23)

    // Nothing pending is kept any more.
    expect(busy.file?.pending).toBeUndefined()
  }, 60000)
  it('lessons are pointed out only when the repo keeps them', () => {
    const with_ = agentArgv({ prompt: 'go', lessons: true })
    const at = with_.indexOf('--append-system-prompt')
    expect(with_[at + 1]).toBe('Este repo guarda en .agents/lessons.md los errores que ya se pagaron aquí. Léelo antes de empezar y no los repitas.')
    expect(at).toBeLessThan(with_.indexOf('go'))
    expect(agentArgv({ prompt: 'go' })).not.toContain('--append-system-prompt')
  })
})
