import * as pty from 'node-pty'
import { sessionName, tmuxArgs } from './tmux'

// The only process spawned outside the runner: a pty needs a tty, which the runner does not give.
const attached = new Map<string, pty.IPty>()

export function attach(id: string, cwd: string, cols: number, rows: number, onData: (d: string) => void): void {
  detach(id)
  const p = pty.spawn('tmux', [...tmuxArgs(), 'attach', '-t', `=${sessionName(id)}`], {
    name: 'xterm-256color',
    cwd,
    cols,
    rows,
    env: process.env as Record<string, string>
  })
  p.onData(onData)
  attached.set(id, p)
}

export const input = (id: string, data: string): void => attached.get(id)?.write(data)
export const resize = (id: string, cols: number, rows: number): void => attached.get(id)?.resize(cols, rows)

/** Kills the tmux client only: the session and its agent keep running. */
export function detach(id: string): void {
  attached.get(id)?.kill()
  attached.delete(id)
}

export const detachAll = (): void => [...attached.keys()].forEach(detach)
