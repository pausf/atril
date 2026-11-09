import { run as defaultRun, type Runner } from './run'

export const sessionName = (id: string): string => `atril-${id}`

/** Args to prefix every tmux call: a private socket when ATRIL_TMUX_SOCKET is set (tests, snapshots). */
export function tmuxArgs(): string[] {
  const sock = process.env['ATRIL_TMUX_SOCKET']
  return sock ? ['-L', sock] : []
}

const tmux = (run: Runner, args: string[]) => run('tmux', [...tmuxArgs(), ...args])

/** Starts the agent detached and returns its pane id. */
export async function newSession(id: string, cwd: string, argv: string[], run: Runner = defaultRun): Promise<string> {
  const s = sessionName(id)
  const r = await tmux(run, ['new-session', '-d', '-s', s, '-c', cwd, '-P', '-F', '#{pane_id}', ...argv])
  if (r.code !== 0) throw new Error(`tmux new-session falló: ${r.stderr.trim()}`)
  // remain-on-exit keeps a crashed agent's pane readable; window-size latest stops two clients fighting over size.
  for (const [opt, val] of [['remain-on-exit', 'on'], ['window-size', 'latest']] as const) {
    const o = await tmux(run, ['set-option', '-t', s, opt, val])
    if (o.code !== 0) throw new Error(`tmux set-option ${opt} falló: ${o.stderr.trim()}`)
  }
  return r.stdout.trim()
}

export async function hasSession(id: string, run: Runner = defaultRun): Promise<boolean> {
  return (await tmux(run, ['has-session', '-t', `=${sessionName(id)}`])).code === 0
}

export async function killSession(id: string, run: Runner = defaultRun): Promise<void> {
  await tmux(run, ['kill-session', '-t', `=${sessionName(id)}`])
}

/** Adds a shell pane in the workspace directory: a split never starts another agent. */
export async function splitPane(id: string, direction: 'h' | 'v', cwd: string, run: Runner = defaultRun): Promise<void> {
  const shell = process.env['SHELL'] || '/bin/zsh'
  const r = await tmux(run, ['split-window', `-${direction}`, '-t', `=${sessionName(id)}:`, '-c', cwd, shell, '-l'])
  if (r.code !== 0) throw new Error(`tmux split-window falló: ${r.stderr.trim()}`)
}
