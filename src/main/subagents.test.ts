import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubagentEntry } from '../preload/api'
import { run } from './run'
import { createSubagents } from './subagents'
import { cleanTmp, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { openWorktree, removeWorkspace } from './workspaces'

let sock: string
let home: string
beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

const write = (session: string, body: object): void => {
  mkdirSync(join(home, 'subagents'), { recursive: true })
  writeFileSync(join(home, 'subagents', `${session}.json`), JSON.stringify(body))
}
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
async function until(done: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms
  while (!done() && Date.now() < end) await wait(50)
}

describe('subagents', () => {
  const running: SubagentEntry = { id: 'a1', type: 'explorer', description: 'T5 paginación', startedAt: 10 }

  it('the subagent list reaches the window', async () => {
    writeFileSync(
      join(home, 'workspaces.json'),
      JSON.stringify({ workspaces: ['aaaaaaa1', 'aaaaaaa2'].map((id) => ({ id, session: `atril-${id}`, path: '/x' })) })
    )
    write('atril-aaaaaaa1', { entries: [running], pending: [{ type: 'explorer', description: 'pendiente', at: 1 }] })
    const emit = vi.fn()
    const sub = createSubagents({ emit })
    await sub.start()

    // The entries only: never the pending queue; nothing without a file or for an unknown workspace.
    expect(await sub.get('aaaaaaa1')).toEqual([running])
    expect(await sub.get('aaaaaaa2')).toEqual([])
    expect(await sub.get('nope')).toEqual([])
    expect(emit).toHaveBeenCalledWith('aaaaaaa1', [running])
    expect(emit.mock.calls.map((c) => c[0])).not.toContain('aaaaaaa2')

    // An endedAt flip keeps the same ids and count: it is still a change.
    emit.mockClear()
    const ended = { ...running, endedAt: 55 }
    write('atril-aaaaaaa1', { entries: [ended], pending: [] })
    await until(() => emit.mock.calls.length > 0)
    expect(emit).toHaveBeenLastCalledWith('aaaaaaa1', [ended])

    // The same content again is not news.
    emit.mockClear()
    write('atril-aaaaaaa1', { entries: [ended], pending: [{ type: 'x', description: 'y', at: 2 }] })
    await wait(600)
    expect(emit).not.toHaveBeenCalled()
    sub.stop()

    // Removing a workspace deletes its file.
    makeRegisteredRepo(home)
    const r = await openWorktree({ repoId: 'demo', branch: 'feat/sub', agent: 'claude', argv: ['sh', '-c', 'sleep 300'] })
    if (!('workspace' in r)) throw new Error(r.error)
    write(r.workspace.session, { entries: [running], pending: [] })
    expect(await removeWorkspace(r.workspace.id, run)).toEqual({ ok: true })
    expect(existsSync(join(home, 'subagents', `${r.workspace.session}.json`))).toBe(false)
  }, 30000)

  it('the description comes from the meta file', async () => {
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [{ id: 'aaaaaaa1', session: 'atril-aaaaaaa1', path: '/x' }] }))
    const dir = tmp()
    const tr = (id: string): string => join(dir, `agent-${id}.jsonl`)
    const meta = (id: string, body: string): void => writeFileSync(join(dir, `agent-${id}.meta.json`), body)
    meta('a1', JSON.stringify({ description: '  T5\n  paginación   ya ', agentType: 'explorer' }))
    meta('a2', JSON.stringify({ description: 'y'.repeat(130) }))
    meta('a4', '{no es json')
    meta('a5', JSON.stringify({ description: 5 }))
    const stored = [
      { id: 'a1', type: 'explorer', transcript: tr('a1'), startedAt: 1 },
      { id: 'a2', type: 'explorer', transcript: tr('a2'), startedAt: 2 },
      { id: 'a3', type: 'Plan', transcript: tr('a3'), description: 'guardada', startedAt: 3 },
      { id: 'a4', type: 'Plan', transcript: tr('a4'), startedAt: 4 },
      { id: 'a5', type: 'Plan', transcript: tr('a5'), startedAt: 5 },
      { id: 'a6', type: 'Plan', description: 'antigua', startedAt: 6 }
    ]
    write('atril-aaaaaaa1', { entries: stored })
    const emit = vi.fn()
    const sub = createSubagents({ emit })
    await sub.start()

    const expected: SubagentEntry[] = [
      { id: 'a1', type: 'explorer', description: 'T5 paginación ya', startedAt: 1 },
      { id: 'a2', type: 'explorer', description: 'y'.repeat(120), startedAt: 2 },
      { id: 'a3', type: 'Plan', startedAt: 3 },
      { id: 'a4', type: 'Plan', startedAt: 4 },
      { id: 'a5', type: 'Plan', startedAt: 5 },
      { id: 'a6', type: 'Plan', description: 'antigua', startedAt: 6 }
    ]
    expect(await sub.get('aaaaaaa1')).toEqual(expected)
    expect(emit).toHaveBeenLastCalledWith('aaaaaaa1', expected)
    expect(JSON.stringify(emit.mock.calls)).not.toContain(dir)

    // A meta that shows up later is read on the next change of the entries file.
    meta('a3', JSON.stringify({ description: 'del meta' }))
    emit.mockClear()
    write('atril-aaaaaaa1', { entries: stored.map((e) => (e.id === 'a1' ? { ...e, endedAt: 9 } : e)) })
    await until(() => emit.mock.calls.length > 0)
    const [, last] = emit.mock.calls.at(-1) as [string, SubagentEntry[]]
    expect(last.find((e) => e.id === 'a3')?.description).toBe('del meta')
    expect(last.find((e) => e.id === 'a1')).toEqual({ ...expected[0], endedAt: 9 })
    sub.stop()
  }, 30000)

  it('the window installs both subagent hooks', async () => {
    const { hooksSettings } = await import('./agent')
    const hooks = hooksSettings().hooks
    for (const e of ['SubagentStart', 'SubagentStop']) expect(hooks[e]?.[0]?.hooks[0]?.command).toBe(hooks['Stop']?.[0]?.hooks[0]?.command.replace(/Stop$/, e))
  })
})
