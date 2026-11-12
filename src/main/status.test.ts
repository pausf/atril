import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceView } from '../preload/api'
import { hooksSettings } from './agent'
import type { Runner } from './run'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'

const SLEEP = ['sh', '-c', 'sleep 300']
let sock: string
let home: string

beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
  vi.resetModules()
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const hookCommand = (event: string): string => hooksSettings().hooks[event]?.[0]?.hooks[0]?.command ?? ''
// Claude closes the hook's stdin; a tmux pane's stdin is a tty, so the test closes it too.
const runHooks = (...events: string[]): string[] => [
  'sh',
  '-c',
  events.map((e) => `${hookCommand(e)} </dev/null`).join('; ') + '; sleep 300'
]

async function open(argv: string[], branch = 'feat/x'): Promise<WorkspaceView> {
  makeRegisteredRepo(home)
  const { openWorktree } = await import('./workspaces')
  const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv })
  if (!('workspace' in r)) throw new Error(r.error)
  return r.workspace
}

async function until<T>(read: () => Promise<T> | T, done: (v: T) => boolean, ms = 3000): Promise<T> {
  const end = Date.now() + ms
  let v = await read()
  while (!done(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 100))
    v = await read()
  }
  return v
}

const setHook = (session: string, state: string): void => {
  mkdirSync(join(home, 'state'), { recursive: true })
  writeFileSync(join(home, 'state', `${session}.json`), JSON.stringify({ state, at: 1 }))
}

describe('status', () => {
  it('claude notification marks needs-you', async () => {
    const { agentState } = await import('./status')
    const ws = await open(runHooks('Notification'))

    const state = await until(() => agentState(ws), (s) => s === 'needs-you')

    expect(state).toBe('needs-you')
    const file = JSON.parse(readFileSync(join(home, 'state', `${ws.session}.json`), 'utf8')) as { state: string; at: number }
    expect(file.state).toBe('needs-you')
    expect(typeof file.at).toBe('number')
  })

  it('stop marks needs-you and prompt submit marks working', async () => {
    const { agentState } = await import('./status')
    const stopped = await open(runHooks('Stop'), 'feat/stop')
    expect(await until(() => agentState(stopped), (s) => s === 'needs-you')).toBe('needs-you')

    const resumed = await open(runHooks('Stop', 'UserPromptSubmit'), 'feat/resume')
    const file = join(home, 'state', `${resumed.session}.json`)
    const written = await until(
      () => {
        try {
          return (JSON.parse(readFileSync(file, 'utf8')) as { state: string }).state
        } catch {
          return ''
        }
      },
      (s) => s === 'working'
    )
    expect(written).toBe('working')
    expect(await agentState(resumed)).toBe('working')
  })

  it('exited agent marks stopped', async () => {
    const { agentState } = await import('./status')
    const ws = await open(['sh', '-c', 'sleep 1'])
    // A second, live pane in the same session must not keep the agent "alive".
    execFileSync('tmux', ['-L', sock, 'split-window', '-d', '-t', ws.session, 'sleep 300'])
    expect(await agentState(ws)).toBe('working')

    const state = await until(() => agentState(ws), (s) => s === 'stopped')

    expect(state).toBe('stopped')
    expect(tmuxOut(sock, 'list-panes', '-t', ws.session, '-F', '#{pane_dead}').trim().split('\n').sort()).toEqual(['0', '1'])
  })

  it('notifies once per needs-you transition', async () => {
    const { createStatus, shouldNotify } = await import('./status')
    expect(shouldNotify('working', 'needs-you')).toBe(true)
    expect(shouldNotify('needs-you', 'needs-you')).toBe(false)

    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    setHook(ws.session, 'needs-you')
    await status.refresh()
    await status.refresh()
    await status.refresh()

    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0]?.[0].branch).toBe('feat/x')
    // No text from the hook: a question (V3).
    expect(notify.mock.calls[0]?.[1]).toBe('ask')
    setHook(ws.session, 'working')
    await status.refresh()
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('re-entering needs-you notifies again', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()

    for (const state of ['needs-you', 'working', 'needs-you']) {
      setHook(ws.session, state)
      await status.refresh()
    }

    expect(notify).toHaveBeenCalledTimes(2)
  })

  it('hook writes the state of its own session when several exist', async () => {
    // A's hook fires after B exists, so B is tmux's most recent session when the hook asks.
    const a = await open(['sh', '-c', `sleep 1; ${hookCommand('Notification')} </dev/null; sleep 300`], 'feat/a')
    const b = await open(['sh', '-c', 'sleep 300'], 'feat/b')
    const fileA = join(home, 'state', `${a.session}.json`)
    const fileB = join(home, 'state', `${b.session}.json`)

    await until(() => existsSync(fileA) || existsSync(fileB), (v) => v, 5000)

    expect(existsSync(fileB)).toBe(false)
    expect(JSON.parse(readFileSync(fileA, 'utf8')).state).toBe('needs-you')
  })
  it('a damaged list does not break the poll', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const onChange = vi.fn()
    const notify = vi.fn()
    const status = createStatus({ onChange, notify })
    await status.refresh()
    expect(onChange).toHaveBeenCalledTimes(1)
    writeFileSync(join(home, 'workspaces.json'), '{not json')
    setHook(ws.session, 'needs-you')
    // The watcher and the timer call refresh with `void`: a rejection there is unhandled.
    await expect(status.refresh()).resolves.toBeUndefined()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()
  })

  it('one tmux call per tick whatever the number of works', async () => {
    const { run } = await import('./run')
    const { createStatus } = await import('./status')
    const works = [await open(SLEEP, 'feat/a'), await open(SLEEP, 'feat/b'), await open(SLEEP, 'feat/c')]
    setHook(works[1]!.session, 'needs-you')
    const calls: string[][] = []
    const spy: Runner = (cmd, args, opts) => (cmd === 'tmux' && calls.push(args), run(cmd, args, opts))
    const status = createStatus({ run: spy, onChange: () => {}, notify: () => {} })
    await status.refresh()
    expect(status.states()).toEqual({ [works[0]!.id]: 'working', [works[1]!.id]: 'needs-you', [works[2]!.id]: 'working' })
    expect(calls.map((a) => a.find((x) => !x.startsWith('-') && x !== sock))).toEqual(['list-panes'])
  }, 30_000)

  it('a burst of hook writes refreshes once', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const status = createStatus({ onChange: () => {}, notify: () => {} })
    await status.start()
    try {
      const refresh = vi.spyOn(status, 'refresh')
      const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
      for (let i = 0; i < 10; i++) setHook(ws.session, i % 2 ? 'working' : 'needs-you')
      await pause(900)
      expect(refresh).toHaveBeenCalledTimes(1)
      // Events that never stop still refresh at least once a second.
      refresh.mockClear()
      for (let i = 0; i < 14; i++) {
        setHook(ws.session, i % 2 ? 'working' : 'needs-you')
        await pause(100)
      }
      expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(1)
    } finally {
      status.stop()
    }
  }, 30_000)
})

const say = (session: string, state: string, text?: string): void => {
  mkdirSync(join(home, 'state'), { recursive: true })
  writeFileSync(join(home, 'state', `${session}.json`), JSON.stringify({ state, at: 1, ...(text !== undefined && { text }) }))
}
const kill = (ws: WorkspaceView): void => void execFileSync('tmux', ['-L', sock, 'kill-session', '-t', ws.session])
// tmux is read through a one-second snapshot: refresh until the pass has seen what changed.
const settle = (status: { refresh(): Promise<void> }, calls: () => number, n: number): Promise<number> =>
  until(async () => (await status.refresh(), calls()), (c) => c >= n)

describe('status notices', () => {
  it('a question after an end of turn notifies again', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    say(ws.session, 'needs-you', 'Claude dice: He terminado el paso.')
    await status.refresh()
    expect(notify.mock.calls.map((c) => [c[1], c[2]])).toEqual([['done', 'Claude dice: He terminado el paso.']])
    // Same wait, now a question: one more, with the new text; the same question again is nothing.
    say(ws.session, 'needs-you', 'Te pregunta: ¿Sigo?')
    await status.refresh()
    await status.refresh()
    // A question after a question, or an end of turn after a question, is not news.
    say(ws.session, 'needs-you', 'Te pregunta: ¿Y ahora?')
    await status.refresh()
    say(ws.session, 'needs-you', 'Claude dice: Vale.')
    await status.refresh()
    expect(notify.mock.calls.map((c) => [c[1], c[2]])).toEqual([
      ['done', 'Claude dice: He terminado el paso.'],
      ['ask', 'Te pregunta: ¿Sigo?']
    ])
    // Once per such change: back to «dice» then «pregunta» is a new change.
    say(ws.session, 'needs-you', 'Te pregunta: ¿Otra?')
    await status.refresh()
    expect(notify).toHaveBeenCalledTimes(3)
  })

  it('an agent that stops is a notice', async () => {
    const { createStatus } = await import('./status')
    const works = [await open(SLEEP, 'feat/a'), await open(SLEEP, 'feat/b'), await open(SLEEP, 'feat/c')]
    // Already stopped when Atril starts: no notice (the first pass only records).
    kill(works[2]!)
    const stopped = vi.fn()
    const status = createStatus({ onChange: () => {}, notify: () => {}, stopped })
    await status.refresh()
    say(works[1]!.session, 'needs-you')
    await status.refresh()
    kill(works[0]!)
    await settle(status, () => stopped.mock.calls.length, 1)
    expect(stopped.mock.calls.map((c) => c[0].map((w: WorkspaceView) => w.branch))).toEqual([['feat/a']])
    // From needs-you too; staying stopped is not a second notice.
    kill(works[1]!)
    await settle(status, () => stopped.mock.calls.length, 2)
    await status.refresh()
    expect(stopped.mock.calls.map((c) => c[0].map((w: WorkspaceView) => w.branch))).toEqual([['feat/a'], ['feat/b']])
  }, 30_000)

  it('closing a work from Atril is not a stop', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const closing = new Set<string>()
    const stopped = vi.fn()
    const status = createStatus({ onChange: () => {}, notify: () => {}, stopped, closing: (id) => closing.has(id) })
    await status.refresh()
    closing.add(ws.id)
    kill(ws)
    // It is seen stopped, and still no notice.
    await settle(status, () => (status.states()[ws.id] === 'stopped' ? 1 : 0), 1)
    expect(status.states()[ws.id]).toBe('stopped')
    expect(stopped).not.toHaveBeenCalled()
  })

  it('several stops in one pass are one Mac notice', async () => {
    const { createStatus } = await import('./status')
    const { createAvisos } = await import('./avisos')
    const works = [await open(SLEEP, 'feat/a'), await open(SLEEP, 'feat/b')]
    const avisos = createAvisos()
    const stopped = vi.fn()
    const status = createStatus({ onChange: () => {}, notify: () => {}, stopped })
    await status.refresh()
    works.forEach(kill)
    await settle(status, () => stopped.mock.calls.length, 1)
    // One call for the pass, with both: main turns it into one Mac notification.
    expect(stopped.mock.calls.map((c) => c[0].map((w: WorkspaceView) => w.branch).sort())).toEqual([['feat/a', 'feat/b']])
    // Avisos keeps one per workspace.
    for (const w of stopped.mock.calls[0]![0] as WorkspaceView[]) await avisos.onAgent(w, 'stopped')
    expect((await avisos.list()).map((n) => [n.kind, n.title]).sort()).toEqual([['stopped', 'feat/a'], ['stopped', 'feat/b']])
  }, 30_000)

  it('a long wait reminds you once', async () => {
    const { createStatus } = await import('./status')
    const [old, fresh, gone] = [await open(SLEEP, 'feat/old'), await open(SLEEP, 'feat/new'), await open(SLEEP, 'feat/gone')]
    // Already waiting when Atril starts: it counts from that start.
    say(old.session, 'needs-you')
    let now = 0
    let minutes = 15
    const idle = vi.fn()
    const status = createStatus({ onChange: () => {}, notify: () => {}, idle, idleMinutes: async () => minutes, now: () => now })
    await status.refresh()
    now = 60_000
    say(fresh.session, 'needs-you')
    say(gone.session, 'needs-you')
    await status.refresh()
    // One that leaves needs-you before its time gets none.
    now = 5 * 60_000
    say(gone.session, 'working')
    await status.refresh()
    now = 15 * 60_000 - 1
    await status.refresh()
    expect(idle).not.toHaveBeenCalled()
    now = 15 * 60_000
    await status.refresh()
    expect(idle.mock.calls.map((c) => c[0].branch)).toEqual(['feat/old'])
    // Changing the minutes applies to waits in progress: 10 min is already past for the newer one.
    minutes = 10
    await status.refresh()
    await status.refresh()
    expect(idle.mock.calls.map((c) => [c[0].branch, c[1]])).toEqual([['feat/old', 15], ['feat/new', 10]])
    // Once per entry: a new entry counts again.
    say(old.session, 'working')
    await status.refresh()
    say(old.session, 'needs-you')
    now = 30 * 60_000
    await status.refresh()
    now = 40 * 60_000
    await status.refresh()
    expect(idle).toHaveBeenCalledTimes(3)
  }, 30_000)
})
