import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WorkspaceView } from '../preload/api'
import { hooksSettings } from './agent'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxOut, tmuxSock } from './test-helpers'
import type { Runner } from './run'

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

async function open(branch: string, argv = ['cat']): Promise<WorkspaceView> {
  const { openWorktree } = await import('./workspaces')
  // `cat` echoes what the pane receives, so the capture shows exactly what arrived.
  const r = await openWorktree({ repoId: 'demo', branch, agent: 'claude', argv })
  if (!('workspace' in r)) throw new Error(r.error)
  return r.workspace
}

const capture = (ws: WorkspaceView): string => tmuxOut(sock, 'capture-pane', '-p', '-t', ws.paneId)

const hook = (ws: WorkspaceView, state: string, at: number): void => {
  mkdirSync(join(home, 'state'), { recursive: true })
  writeFileSync(join(home, 'state', `${ws.session}.json`), JSON.stringify({ state, at }))
}

const hookCommand = (event: string): string => hooksSettings().hooks[event]?.[0]?.hooks[0]?.command ?? ''
/** A pane that runs each group of real hook events after one Enter; the hook's stdin is closed as Claude does. */
const hookSteps = (...groups: string[][]): string[] => [
  'sh',
  '-c',
  groups
    .map(
      (g, i) =>
        'read x; ' +
        g
          .map((e) =>
            e === 'Notification:idle'
              ? `echo '{"message":"Claude is waiting for your input","notification_type":"idle_prompt"}' | ${hookCommand('Notification')}`
              : `${hookCommand(e)} </dev/null`
          )
          .join('; ') +
        `; touch "$ATRIL_HOME/step-${i}"`
    )
    .join('; ') + '; sleep 300'
]
const stepDone = (i: number): Promise<string> => until(() => String(existsSync(join(home, `step-${i}`))), (v) => v === 'true', 10000)
const stateOf = (ws: WorkspaceView): string => {
  try {
    return readFileSync(join(home, 'state', `${ws.session}.json`), 'utf8')
  } catch {
    return ''
  }
}

async function until(read: () => string, done: (s: string) => boolean, ms = 3000): Promise<string> {
  const end = Date.now() + ms
  let v = read()
  while (!done(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 50))
    v = read()
  }
  return v
}

/** Runner that records every tmux send-keys so "nothing was sent" is observed, not assumed. */
async function spied(): Promise<{ run: Runner; sent: string[][] }> {
  const { run } = await import('./run')
  const sent: string[][] = []
  return { sent, run: (cmd, args, opts) => (args.includes('send-keys') && sent.push(args), run(cmd, args, opts)) }
}

describe('pause', () => {
  it('pausing interrupts only that agent', async () => {
    makeRegisteredRepo(home)
    const { pauseAgent, agentState, replyGone } = await import('./status')
    const { removeWorkspace } = await import('./workspaces')
    const a = await open('feat/pa')
    const b = await open('feat/pb')
    hook(a, 'working', 1)
    hook(b, 'working', 1)
    const { run, sent } = await spied()

    // Escape as a key (not literal text, no Enter), into that pane only, and the mark is kept.
    expect(await pauseAgent(a.id, run)).toEqual({ ok: true })
    expect(sent).toEqual([['-L', sock, 'send-keys', '-t', a.paneId, 'Escape']])
    expect(existsSync(join(home, 'paused', a.session))).toBe(true)
    expect(await agentState(a, run)).toBe('paused')
    expect(await agentState(b, run)).toBe('working')
    expect(capture(b).trim()).toBe('')
    expect(tmuxOut(sock, 'display', '-p', '-t', a.paneId, '#{pane_dead}').trim()).toBe('0')

    // Read as stopped: F15 does not lock the editor (W81's order and the window are in src/renderer/pause.test.ts).
    const { saveDoc } = await import('./flow/document')
    expect(await saveDoc(home, 'paused', 'nope', 'proposal.md', 'x', 0)).not.toEqual(await saveDoc(home, 'working', 'nope', 'proposal.md', 'x', 0))

    // Only a working agent is offered a pause: paused already or waiting for the person types nothing.
    sent.length = 0
    expect(await pauseAgent(a.id, run)).toHaveProperty('error')
    hook(b, 'needs-you', 1)
    expect(await pauseAgent(b.id, run)).toHaveProperty('error')
    expect(existsSync(join(home, 'paused', b.session))).toBe(false)
    expect(await agentState(b, run)).toBe('needs-you')

    // The mark lives on after Escape: a late PreToolUse or PostToolUse from the real hook keeps it.
    const c = await open('feat/pc', hookSteps(['PreToolUse', 'PostToolUse']))
    hook(c, 'working', 1)
    expect(await pauseAgent(c.id, run)).toEqual({ ok: true })
    tmuxOut(sock, 'send-keys', '-t', c.paneId, 'Enter')
    expect(await stepDone(0)).toBe('true')
    expect(stateOf(c)).toContain('"working"')
    expect(existsSync(join(home, 'paused', c.session))).toBe(true)
    expect(await agentState(c, run)).toBe('paused')
    sent.length = 0

    // A gone workspace: nothing is sent and the caller says so (N3).
    expect(await removeWorkspace(b.id)).toEqual({ ok: true })
    expect(await pauseAgent(b.id, run)).toEqual({ error: replyGone() })
    expect(await pauseAgent('nosuchid', run)).toEqual({ error: replyGone() })
    expect(sent).toEqual([])
  })

  it('resuming asks the agent to go on', async () => {
    makeRegisteredRepo(home)
    const { pauseAgent, resumeAgent, agentState, replyGone } = await import('./status')
    const { removeWorkspace } = await import('./workspaces')
    const a = await open('feat/ra')
    const b = await open('feat/rb')
    hook(a, 'working', 1)
    hook(b, 'working', 1)
    const { run, sent } = await spied()

    // Not paused: nothing typed.
    expect(await resumeAgent(a.id, run)).toHaveProperty('error')
    expect(sent).toEqual([])

    // Paused: the words as literal text then Enter, into that pane only; the mark goes.
    expect(await pauseAgent(a.id, run)).toEqual({ ok: true })
    sent.length = 0
    expect(await resumeAgent(a.id, run)).toEqual({ ok: true })
    expect(sent).toEqual([
      ['-L', sock, 'send-keys', '-t', a.paneId, '-l', '--', 'Sigue donde lo dejaste.'],
      ['-L', sock, 'send-keys', '-t', a.paneId, 'Enter']
    ])
    expect(await until(() => capture(a), (s) => s.includes('Sigue donde lo dejaste.'))).toContain('Sigue donde lo dejaste.')
    expect(capture(b).trim()).toBe('')
    expect(existsSync(join(home, 'paused', a.session))).toBe(false)
    expect(await agentState(a, run)).toBe('working')

    // Not paused (never, or no longer): the message names it.
    expect(await resumeAgent(b.id, run)).toEqual({ error: 'Ese agente no está en pausa.' })

    // A UserPromptSubmit (the person typing) or a needs-you or done state from the real hook removes the mark too.
    const c = await open('feat/rc', hookSteps(['UserPromptSubmit'], ['Notification'], ['Stop'], ['Notification:idle']))
    const marked = (): void => {
      mkdirSync(join(home, 'paused'), { recursive: true })
      writeFileSync(join(home, 'paused', c.session), '1')
    }
    for (const [i, want] of ['working', 'needs-you', 'done'].entries()) {
      marked()
      expect(await agentState(c, run)).toBe('paused')
      tmuxOut(sock, 'send-keys', '-t', c.paneId, 'Enter')
      expect(await stepDone(i)).toBe('true')
      expect(existsSync(join(home, 'paused', c.session))).toBe(false)
      expect(await agentState(c, run)).toBe(want)
    }
    // Claude Code's idle reminder (about a minute at the prompt) is not a question: the pause stays.
    marked()
    tmuxOut(sock, 'send-keys', '-t', c.paneId, 'Enter')
    expect(await stepDone(3)).toBe('true')
    expect(existsSync(join(home, 'paused', c.session))).toBe(true)
    expect(await agentState(c, run)).toBe('paused')

    // A gone workspace: nothing is sent and the caller says so.
    expect(await pauseAgent(a.id, run)).toEqual({ ok: true })
    expect(await removeWorkspace(a.id)).toEqual({ ok: true })
    // Removing a paused workspace takes its mark with it.
    expect(existsSync(join(home, 'paused', a.session))).toBe(false)
    sent.length = 0
    expect(await resumeAgent(a.id, run)).toEqual({ error: replyGone() })
    expect(sent).toEqual([])
  })
})
