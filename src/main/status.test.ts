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

  it('stop marks done and prompt submit marks working', async () => {
    const { agentState } = await import('./status')
    // No checklist and no question: done (W220).
    const stopped = await open(runHooks('Stop'), 'feat/stop')
    expect(await until(() => agentState(stopped), (s) => s === 'done')).toBe('done')

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
    // Avisos keeps one per workspace; the Mac gets a single notification for both, as main wires it.
    const added = []
    for (const w of stopped.mock.calls[0]![0] as WorkspaceView[]) added.push(...(await avisos.onAgent(w, 'stopped')))
    expect((await avisos.list()).map((n) => [n.kind, n.title]).sort()).toEqual([['stopped', 'feat/a'], ['stopped', 'feat/b']])
    const { createNotifier } = await import('./notify')
    const { readNotifySettings } = await import('./avisos')
    const made: Array<{ title: string; body: string }> = []
    const notifier = createNotifier({
      make: (o) => (made.push({ title: o.title, body: o.body }), { on: () => {}, show: () => {} }),
      settings: readNotifySettings,
      context: () => ({ focusOn: false, windowFocused: false }),
      markRead: () => {},
      front: () => {},
      openExternal: () => {},
      reply: async () => 'sent',
      options: async () => 0,
      reopen: async () => ({}),
      closable: async () => undefined
    })
    await notifier.stopped(added)
    expect(made).toEqual([{ title: '2 trabajos se han parado', body: expect.stringMatching(/^feat\/[ab] y feat\/[ab]$/) }])
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

/** Records every tmux send-keys and paste so "nothing was sent" is observed, not assumed. */
async function spied(): Promise<{ run: Runner; sent: string[][] }> {
  const { run } = await import('./run')
  const sent: string[][] = []
  return { sent, run: (cmd, args, opts) => ((args.includes('send-keys') || args.includes('paste-buffer')) && sent.push(args.slice(2)), run(cmd, args, opts)) }
}
const wait = (session: string, body: object): void => {
  mkdirSync(join(home, 'state'), { recursive: true })
  writeFileSync(join(home, 'state', `${session}.json`), JSON.stringify({ state: 'needs-you', at: 1, ...body }))
}
const q = (question: string, labels: string[], multiSelect = false) => ({ question, header: question, multiSelect, options: labels.map((label) => ({ label, description: '' })) })
const NOT_WAITING = { error: 'Ese agente ya no está esperando una respuesta.' }
const NO_OPTION = { error: 'Esa opción ya no existe.' }

describe('answers', () => {
  it('each answer shape sends its own keys', async () => {
    const { answerAgent, replyGone } = await import('./status')
    const { removeWorkspace } = await import('./workspaces')
    const a = await open(['cat'], 'feat/qa')
    const b = await open(['cat'], 'feat/qb')
    const { run, sent } = await spied()
    const capture = (ws: WorkspaceView): string => tmuxOut(sock, 'capture-pane', '-p', '-t', ws.paneId)
    wait(a.session, { at: 10, kind: 'question', text: 'Te pregunta: ¿Cómo?', questions: [q('¿Cómo?', ['Corto', 'Largo', 'Ninguno']), q('¿Pruebas?', ['Sí', 'No'])] })

    // The first question: its option's number as a key, then Enter, into that pane only.
    expect(await answerAgent(a.id, { option: 1, question: 0 }, run)).toEqual({ ok: true })
    expect(sent).toEqual([['send-keys', '-t', a.paneId, '2'], ['send-keys', '-t', a.paneId, 'Enter']])
    // Main remembers which question is next: the same index again is stale, and so is an option past the end.
    sent.length = 0
    for (const choice of [{ option: 0, question: 0 }, { option: 2, question: 1 }, { option: 0, question: 2 }]) expect(await answerAgent(a.id, choice, run)).toEqual(NO_OPTION)
    expect(sent).toEqual([])
    // The last question: its key, Enter, and one more Enter to submit the answers.
    expect(await answerAgent(a.id, { option: 0, question: 1 }, run)).toEqual({ ok: true })
    expect(sent).toEqual([['send-keys', '-t', a.paneId, '1'], ['send-keys', '-t', a.paneId, 'Enter'], ['send-keys', '-t', a.paneId, 'Enter']])
    expect(capture(b).trim()).toBe('')
    // A new entry into needs-you starts again at the first question.
    sent.length = 0
    wait(a.session, { at: 20, kind: 'question', questions: [q('¿Otra?', ['A', 'B'])] })
    expect(await answerAgent(a.id, { option: 1, question: 0 }, run)).toEqual({ ok: true })
    expect(sent).toEqual([['send-keys', '-t', a.paneId, '2'], ['send-keys', '-t', a.paneId, 'Enter'], ['send-keys', '-t', a.paneId, 'Enter']])
    // A state written before kinds existed: its options are one question.
    sent.length = 0
    wait(a.session, { at: 30, text: 'Te pregunta: ¿?', options: ['Sí', 'No'] })
    expect(await answerAgent(a.id, { option: 0, question: 0 }, run)).toEqual({ ok: true })
    expect(sent.map((x) => x.at(-1))).toEqual(['1', 'Enter', 'Enter'])
    // A multiSelect question has no option to press.
    sent.length = 0
    wait(a.session, { at: 40, kind: 'question', questions: [q('¿Cuáles?', ['A', 'B'], true)] })
    expect(await answerAgent(a.id, { option: 0, question: 0 }, run)).toEqual(NO_OPTION)
    expect(sent).toEqual([])

    // Continue: main's own sentence as a bracketed paste, then Enter; never a bare «sí».
    wait(b.session, { at: 5, kind: 'turn-end', text: 'Claude dice: listo' })
    expect(await answerAgent(b.id, { continue: true }, run)).toEqual({ ok: true })
    expect(sent[0]).toEqual(expect.arrayContaining(['paste-buffer', '-p', '-t', b.paneId]))
    expect(sent.at(-1)).toEqual(['send-keys', '-t', b.paneId, 'Enter'])
    expect(await until(() => capture(b), (c) => c.includes('Sigue con el plan; no hagas nada que no esté en él.'))).toContain('Sigue con el plan; no hagas nada que no esté en él.')

    // Re-read at press time: a state that is not needs-you types nothing, whatever the shape.
    sent.length = 0
    wait(a.session, { state: 'working', at: 50, kind: 'question', questions: [q('¿?', ['A'])] })
    for (const choice of [{ option: 0, question: 0 }, { allow: true }, { deny: true }, { continue: true }] as const) expect(await answerAgent(a.id, choice, run)).toEqual(NOT_WAITING)
    // Any other shape is refused: the window never gets text typed.
    wait(a.session, { at: 60, kind: 'question', questions: [q('¿?', ['A'])] })
    for (const choice of ['yes', 1, null, { fixed: 'yes' }, { option: 0 }, { option: '0', question: 0 }, { option: 0.5, question: 0 }, { allow: false }, { continue: 'sí' }, { text: 'hola' }, { continue: true, text: 'x' }])
      expect(await answerAgent(a.id, choice as never, run)).toEqual(NO_OPTION)
    expect(sent).toEqual([])

    // A gone workspace or pane: nothing is sent and the caller says so (W53).
    expect(await removeWorkspace(b.id)).toEqual({ ok: true })
    expect(await answerAgent(b.id, { continue: true }, run)).toEqual({ error: replyGone() })
    expect(await answerAgent('nosuchid', { option: 0, question: 0 }, run)).toEqual({ error: replyGone() })
    expect(sent).toEqual([])
  }, 30_000)

  it('allow and deny send their keys', async () => {
    const { answerAgent } = await import('./status')
    const a = await open(['cat'], 'feat/pa')
    const { run, sent } = await spied()
    wait(a.session, { kind: 'permission', text: 'Te pregunta: ¿Puede usar Bash?', permission: { tool: 'Bash', summary: 'git push' } })
    // Permitir: «1» (Sí, una vez), then Enter.
    expect(await answerAgent(a.id, { allow: true }, run)).toEqual({ ok: true })
    expect(sent).toEqual([['send-keys', '-t', a.paneId, '1'], ['send-keys', '-t', a.paneId, 'Enter']])
    // Denegar: Escape and nothing else.
    sent.length = 0
    expect(await answerAgent(a.id, { deny: true }, run)).toEqual({ ok: true })
    expect(sent).toEqual([['send-keys', '-t', a.paneId, 'Escape']])
    // A permission written before kinds existed reads by its text.
    sent.length = 0
    wait(a.session, { text: 'Te pregunta: Claude needs your permission to use Bash' })
    expect(await answerAgent(a.id, { allow: true }, run)).toEqual({ ok: true })
    expect(sent.map((x) => x.at(-1))).toEqual(['1', 'Enter'])
    // Only a permission can be allowed or denied.
    sent.length = 0
    for (const body of [{ kind: 'question', questions: [q('¿?', ['A'])] }, { kind: 'turn-end', text: 'Claude dice: hecho' }]) {
      wait(a.session, body)
      expect(await answerAgent(a.id, { allow: true }, run)).toEqual(NO_OPTION)
      expect(await answerAgent(a.id, { deny: true }, run)).toEqual(NO_OPTION)
    }
    expect(sent).toEqual([])
  }, 30_000)

  it('entering done adds one done notice', async () => {
    const { createStatus, leftWait } = await import('./status')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    wait(ws.session, { state: 'done', at: 3, text: 'Claude dice: listo' })
    await status.refresh()
    await status.refresh()
    expect(notify.mock.calls.map((c) => [c[1], c[2]])).toEqual([['done', 'Claude dice: listo']])
    // V11: entering done marks nothing read; leaving it, or needs-you, for any other state does.
    expect(leftWait('done')).toBe(false)
    expect(leftWait('needs-you')).toBe(false)
    for (const s of ['working', 'paused', 'stopped'] as const) expect(leftWait(s)).toBe(true)
  }, 30_000)

  it('the same turn end notifies once', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    let at = 1
    const step = async (body: object): Promise<void> => {
      wait(ws.session, { at: at++, ...body })
      await status.refresh()
    }
    const calls = (): unknown[] => notify.mock.calls.map((c) => [c[1], c[2]])
    await step({ state: 'done', turn: 10, text: 'Claude dice: listo' })
    await step({ state: 'working', turn: 10 })
    // The same turn, the same end: no second notice.
    await step({ state: 'done', turn: 10, text: 'Claude dice: listo' })
    expect(calls()).toEqual([['done', 'Claude dice: listo']])
    // Another kind in that turn is news; so is the same end in a new turn.
    await step({ state: 'working', turn: 10 })
    await step({ kind: 'turn-end', turn: 10, text: 'Claude dice: listo' })
    await step({ state: 'working', turn: 11 })
    await step({ state: 'done', turn: 11, text: 'Claude dice: listo' })
    expect(calls()).toHaveLength(3)
    // Without a turn, nothing matches: W27 as before.
    for (let i = 0; i < 2; i++) {
      await step({ state: 'working' })
      await step({ state: 'done', text: 'Claude dice: listo' })
    }
    expect(calls()).toHaveLength(5)
  }, 30_000)

  it('a stop behind a background shell shows what it waits for', async () => {
    const { createStatus, waitingLine } = await import('./status')
    const { readActivity } = await import('./activity')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    wait(ws.session, { state: 'working', at: 5, waiting: 'shell' })
    await status.refresh()
    expect(status.states()[ws.id]).toBe('working')
    expect(await waitingLine(ws.session)).toEqual({ at: 5, text: 'Esperando a una shell en segundo plano' })
    expect((await readActivity(ws.session))[0]).toMatchObject({ text: 'Esperando a una shell en segundo plano' })
    expect(notify).not.toHaveBeenCalled()
    // Plain working says nothing of the kind.
    wait(ws.session, { state: 'working', at: 6 })
    expect(await waitingLine(ws.session)).toBeNull()
  }, 30_000)

  it('a done agent waits for its subagents too', async () => {
    const { createStatus } = await import('./status')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    const subs = (entries: object[]): void => {
      mkdirSync(join(home, 'subagents'), { recursive: true })
      writeFileSync(join(home, 'subagents', `${ws.session}.json`), JSON.stringify({ entries }))
    }
    subs([{ id: 'a1', type: 'explorer', startedAt: 1 }])
    wait(ws.session, { state: 'done', at: 7, text: 'Claude dice: listo' })
    await status.refresh()
    expect(status.states()[ws.id]).toBe('working')
    expect(notify).not.toHaveBeenCalled()
    subs([{ id: 'a1', type: 'explorer', startedAt: 1, endedAt: 9 }])
    await status.refresh()
    expect(status.states()[ws.id]).toBe('done')
    expect(notify.mock.calls.map((c) => c[1])).toEqual(['done'])
  }, 30_000)

  it('a turn end with a subagent still running is working', async () => {
    const { createStatus } = await import('./status')
    const { readActivity } = await import('./activity')
    const ws = await open(SLEEP)
    const notify = vi.fn()
    const status = createStatus({ onChange: () => {}, notify })
    await status.refresh()
    const subs = (entries: object[]): void => {
      mkdirSync(join(home, 'subagents'), { recursive: true })
      writeFileSync(join(home, 'subagents', `${ws.session}.json`), JSON.stringify({ entries }))
    }
    subs([{ id: 'a1', type: 'explorer', startedAt: 1 }, { id: 'a0', type: 'explorer', startedAt: 0, endedAt: 1 }])
    wait(ws.session, { at: 7, kind: 'turn-end', text: 'Claude dice: espero al explorador' })
    await status.refresh()
    // Working, with what it waits for, and no notice.
    expect(status.states()[ws.id]).toBe('working')
    expect((await readActivity(ws.session))[0]).toMatchObject({ text: 'Esperando a un subagente' })
    expect(notify).not.toHaveBeenCalled()
    // A question is a question even with a subagent running.
    wait(ws.session, { at: 8, kind: 'question', text: 'Te pregunta: ¿?', questions: [q('¿?', ['A'])] })
    await status.refresh()
    expect(status.states()[ws.id]).toBe('needs-you')
    wait(ws.session, { at: 9, kind: 'turn-end', text: 'Claude dice: espero al explorador' })
    await status.refresh()
    expect(status.states()[ws.id]).toBe('working')
    notify.mockClear()
    // The last one ends: the next poll is an entry into needs-you, with its notice.
    subs([{ id: 'a1', type: 'explorer', startedAt: 1, endedAt: 9 }])
    await status.refresh()
    expect(status.states()[ws.id]).toBe('needs-you')
    expect(notify.mock.calls.map((c) => [c[1], c[2]])).toEqual([['done', 'Claude dice: espero al explorador']])
    expect((await readActivity(ws.session))[0]?.text).not.toBe('Esperando a un subagente')
  }, 30_000)

  it("claude's english wait messages never reach the person", async () => {
    const { createStatus, notificationBody } = await import('./status')
    const { readActivity } = await import('./activity')
    const { localiseActivity } = await import('../preload/activity-i18n')
    const { t } = await import('./lang')
    const ENGLISH = /Claude needs your permission|Claude is waiting for your input/
    const msgs = ['Claude needs your permission to use Bash', 'Claude needs your permission', 'Claude is waiting for your input']
    for (const [i, message] of msgs.entries()) {
      const dir = tmp()
      writeFileSync(join(dir, 'in.json'), JSON.stringify({ message, ...(i < 2 ? { notification_type: 'permission_prompt' } : {}) }))
      const ws = await open(['sh', '-c', `${hookCommand('Notification')} <'${join(dir, 'in.json')}'; sleep 300`], `feat/en${i}`)
      const notify = vi.fn()
      const status = createStatus({ onChange: () => {}, notify })
      const seen = await until(async () => (await readActivity(ws.session)).length, (n) => n > 0, 10_000)
      expect(seen).toBeGreaterThan(0)
      await status.refresh()
      const shown = [
        readFileSync(join(home, 'state', `${ws.session}.json`), 'utf8'),
        ...(await readActivity(ws.session)).map((l) => localiseActivity(l.text, t)),
        await notificationBody(ws)
      ]
      for (const text of shown) expect(text).not.toMatch(ENGLISH)
    }
    // Lines written before this change are told in Atril's words when shown.
    for (const m of msgs) expect(localiseActivity(`Te pregunta: ${m}`, t)).not.toMatch(ENGLISH)
    expect(localiseActivity('Te pregunta: Claude needs your permission to use Bash', t)).toBe('Te pregunta: ¿Puede usar Bash?')
    expect(localiseActivity('Te pregunta: Claude is waiting for your input', t)).toBe('Claude te necesita')
  }, 60_000)
})

describe('automatic', () => {
  async function openAuto(branch: string, auto = true): Promise<WorkspaceView> {
    makeRegisteredRepo(home)
    const { openWorktree } = await import('./workspaces')
    const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv: ['cat'], ...(auto && { auto: true }) })
    if (!('workspace' in r)) throw new Error(r.error)
    return r.workspace
  }
  const working = (session: string, at: number): void => wait(session, { state: 'working', at })

  it('automatic answers its own questions with the recommended option', async () => {
    const { createStatus } = await import('./status')
    const { readActivity } = await import('./activity')
    const a = await openAuto('feat/auto-q')
    const m = await openAuto('feat/manual-q', false)
    const { run, sent } = await spied()
    const notify = vi.fn()
    const status = createStatus({ run, onChange: () => {}, notify })
    await status.refresh()

    // Every question, each with its recommended option (else the first), by itself: no card, no notice.
    const questions = [q('¿Cómo?', ['Corto', 'Largo (Recommended)']), q('¿Pruebas?', ['Sí', 'No'])]
    wait(a.session, { at: 10, kind: 'question', text: 'Te pregunta: ¿Cómo?', questions })
    wait(m.session, { at: 10, kind: 'question', text: 'Te pregunta: ¿Cómo?', questions })
    await status.refresh()
    expect(sent.filter((x) => x.includes(a.paneId)).map((x) => x.at(-1))).toEqual(['2', 'Enter', '1', 'Enter', 'Enter'])
    expect(status.states()[a.id]).toBe('working')
    expect((await readActivity(a.session))[0]?.text).toBe('Decidió: Largo · Sí')
    // A manual workspace waits for the person, as before.
    expect(sent.filter((x) => x.includes(m.paneId))).toEqual([])
    expect(status.states()[m.id]).toBe('needs-you')
    expect(notify.mock.calls.map((c) => c[0].branch)).toEqual(['feat/manual-q'])
    // Answered once: the next poll sends nothing more.
    sent.length = 0
    await status.refresh()
    expect(sent).toEqual([])

    // A call with a multiSelect question stops as Manual does.
    working(a.session, 11)
    await status.refresh()
    wait(a.session, { at: 12, kind: 'question', text: 'Te pregunta: ¿Cuáles?', questions: [q('¿Cómo?', ['A']), q('¿Cuáles?', ['A', 'B'], true)] })
    await status.refresh()
    expect(sent).toEqual([])
    expect(status.states()[a.id]).toBe('needs-you')
    expect(notify.mock.calls.map((c) => [c[0].branch, c[1]])).toEqual([['feat/manual-q', 'ask'], ['feat/auto-q', 'ask']])
  }, 30_000)

  it('automatic keeps going on its own and stops where it must', async () => {
    const { createStatus } = await import('./status')
    const a = await openAuto('feat/auto-t')
    const { run, sent } = await spied()
    const notify = vi.fn()
    let now = 0
    const status = createStatus({ run, onChange: () => {}, notify, now: () => now })
    await status.refresh()
    const pastes = (): number => sent.filter((x) => x.includes('paste-buffer')).length
    let at = 1
    const turn = async (): Promise<void> => {
      wait(a.session, { at: at++, kind: 'turn-end', text: 'Claude dice: listo' })
      await status.refresh()
    }
    const work = async (ms: number): Promise<void> => {
      working(a.session, at++)
      await status.refresh()
      now += ms
      await status.refresh()
    }

    // Three ends of turn in a row: «Sigue con el plan…» by itself, no card, no notice.
    for (let i = 1; i <= 3; i++) {
      await turn()
      expect(pastes()).toBe(i)
      expect(status.states()[a.id]).toBe('working')
      await work(1000)
    }
    expect(notify).not.toHaveBeenCalled()
    // The fourth stops as Manual does.
    await turn()
    expect(pastes()).toBe(3)
    expect(status.states()[a.id]).toBe('needs-you')
    expect(notify.mock.calls.map((c) => c[1])).toEqual(['done'])
    // Working for less than 30 s without a break does not restart the count.
    await work(29_999)
    await turn()
    expect(pastes()).toBe(3)
    expect(notify).toHaveBeenCalledTimes(2)
    // 30 s working: the count restarts and the next end of turn goes on by itself.
    await work(30_000)
    await turn()
    expect(pastes()).toBe(4)
    expect(status.states()[a.id]).toBe('working')

    // A turn end behind a running subagent is working (W199): nothing is sent.
    await work(1000)
    mkdirSync(join(home, 'subagents'), { recursive: true })
    writeFileSync(join(home, 'subagents', `${a.session}.json`), JSON.stringify({ entries: [{ id: 's', type: 'explorer', startedAt: 1 }] }))
    await turn()
    expect(pastes()).toBe(4)
    expect(status.states()[a.id]).toBe('working')
    expect(sent.filter((x) => x.includes('paste-buffer')).every((x) => x.includes(a.paneId))).toBe(true)
  }, 30_000)

  it('a done agent is done, not a wait', async () => {
    const { agentState, createStatus, waitOf } = await import('./status')
    const { nextUp } = await import('./nextup')
    const ws = await open(SLEEP)
    wait(ws.session, { state: 'done', at: 3, text: 'Claude dice: listo' })
    expect(await agentState(ws)).toBe('done')
    expect(await waitOf(ws.session)).toBeNull()
    expect(nextUp([{ id: ws.id, state: 'done', at: 3 }], null, [])).toEqual([])
    // Automático sends nothing to a done agent.
    const a = await openAuto('feat/auto-done')
    const { run, sent } = await spied()
    const status = createStatus({ run, onChange: () => {}, notify: () => {} })
    wait(a.session, { state: 'done', at: 4, text: 'Claude dice: listo' })
    await status.refresh()
    await status.refresh()
    expect(sent).toEqual([])
    expect(status.states()[a.id]).toBe('done')
  }, 30_000)

  it('automatic leaves a question in prose to the person', async () => {
    const { createStatus } = await import('./status')
    const a = await openAuto('feat/auto-prose')
    const { run, sent } = await spied()
    const notify = vi.fn()
    const status = createStatus({ run, onChange: () => {}, notify })
    await status.refresh()
    wait(a.session, { at: 5, kind: 'question', text: 'Te pregunta: ¿Hago push?', questions: [{ question: '¿Hago push?', header: '', options: [], multiSelect: false }] })
    await status.refresh()
    await status.refresh()
    expect(sent).toEqual([])
    expect(status.states()[a.id]).toBe('needs-you')
    expect(notify.mock.calls.map((c) => [c[1], c[2]])).toEqual([['ask', 'Te pregunta: ¿Hago push?']])
  }, 30_000)

  it('automatic never grants a permission by itself', async () => {
    const { createStatus } = await import('./status')
    const a = await openAuto('feat/auto-p')
    const { run, sent } = await spied()
    const notify = vi.fn()
    const status = createStatus({ run, onChange: () => {}, notify })
    await status.refresh()
    // W59's push question and any other permission: the card and the notice, as Manual.
    wait(a.session, { at: 5, kind: 'permission', text: 'Te pregunta: ¿Puede usar Bash?', permission: { tool: 'Bash', summary: 'git push origin feat/auto-p' } })
    await status.refresh()
    await status.refresh()
    expect(sent).toEqual([])
    expect(status.states()[a.id]).toBe('needs-you')
    expect(notify.mock.calls.map((c) => [c[1], c[2]])).toEqual([['ask', 'Te pregunta: ¿Puede usar Bash?']])
  }, 30_000)
})
