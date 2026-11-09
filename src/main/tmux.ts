import { t } from './lang'
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
  // The pane starts idle so the options exist before the agent does: an agent that exits at once
  // (claude missing, a crash) would otherwise take the session with it before remain-on-exit is set.
  const r = await tmux(run, ['new-session', '-d', '-s', s, '-c', cwd, '-P', '-F', '#{pane_id}', 'sleep', '86400'])
  if (r.code !== 0) throw new Error(t('tmux new-session falló: {detail}', { detail: r.stderr.trim() }))
  const pane = r.stdout.trim()
  // remain-on-exit keeps a crashed agent's pane readable; window-size latest stops two clients fighting over size.
  for (const [opt, val] of [['remain-on-exit', 'on'], ['window-size', 'latest']] as const) {
    const o = await tmux(run, ['set-option', '-t', s, opt, val])
    if (o.code !== 0) throw new Error(t('tmux set-option {opt} falló: {detail}', { opt, detail: o.stderr.trim() }))
  }
  const go = await tmux(run, ['respawn-pane', '-k', '-t', pane, '-c', cwd, ...argv])
  if (go.code !== 0) throw new Error(t('tmux respawn-pane falló: {detail}', { detail: go.stderr.trim() }))
  return pane
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
  if (r.code !== 0) throw new Error(t('tmux split-window falló: {detail}', { detail: r.stderr.trim() }))
}

/** Types `text` into one pane as literal characters, then Enter. `-l` keeps `C-c` or `Enter` from being read as key names. */
export async function sendText(paneId: string, text: string, run: Runner = defaultRun): Promise<boolean> {
  // `--` so text that starts with a dash is not parsed as a flag.
  const typed = await tmux(run, ['send-keys', '-t', paneId, '-l', '--', text])
  return typed.code === 0 && (await tmux(run, ['send-keys', '-t', paneId, 'Enter'])).code === 0
}
