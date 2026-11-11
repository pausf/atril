import * as pty from 'node-pty'
import { sessionName, tmuxArgs } from './tmux'

// The only process spawned outside the runner: a pty needs a tty, which the runner does not give.
const attached = new Map<string, pty.IPty>()

/** W160: a client that cannot start (posix_spawnp failed) answers its message and keeps nothing. */
export function attach(id: string, cwd: string, cols: number, rows: number, onData: (d: string) => void): { ok: true } | { error: string } {
  detach(id)
  let p: pty.IPty
  try {
    p = pty.spawn('tmux', [...tmuxArgs(), 'attach', '-t', `=${sessionName(id)}`], {
      name: 'xterm-256color',
      cwd,
      cols,
      rows,
      env: process.env as Record<string, string>
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
  p.onData(onData)
  // W149: a client whose tmux died is forgotten, so nothing is sent to its closed descriptor.
  p.onExit(() => {
    if (attached.get(id) === p) attached.delete(id)
  })
  attached.set(id, p)
  return { ok: true }
}

/** node-pty throws EBADF on a client that died between its exit and our hearing of it: an IPC handler must never throw (W149). */
const quietly = (f: () => void): void => {
  try {
    f()
  } catch {
    // The client is gone; its exit handler forgets it.
  }
}

export const input = (id: string, data: string): void => quietly(() => attached.get(id)?.write(data))
export const resize = (id: string, cols: number, rows: number): void => quietly(() => attached.get(id)?.resize(cols, rows))

/** Kills the tmux client only: the session and its agent keep running. */
export function detach(id: string): void {
  const p = attached.get(id)
  attached.delete(id)
  quietly(() => p?.kill())
}

export const detachAll = (): void => [...attached.keys()].forEach(detach)
