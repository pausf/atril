import { randomUUID } from 'node:crypto'
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

/** Splits the workspace's pane to the right with `argv` running in the new pane; returns its pane id. */
export async function splitCommand(id: string, cwd: string, argv: string[], run: Runner = defaultRun): Promise<string> {
  const r = await tmux(run, ['split-window', '-h', '-t', `=${sessionName(id)}:`, '-c', cwd, '-P', '-F', '#{pane_id}', ...argv])
  if (r.code !== 0) throw new Error(t('tmux split-window falló: {detail}', { detail: r.stderr.trim() }))
  return r.stdout.trim()
}

/** Pane ids are reused after a server restart: only a pane listed in this workspace's session counts. */
export async function hasPane(id: string, paneId: string, run: Runner = defaultRun): Promise<boolean> {
  const r = await tmux(run, ['list-panes', '-s', '-t', `=${sessionName(id)}`, '-F', '#{pane_id}'])
  return r.code === 0 && r.stdout.split('\n').includes(paneId)
}

export async function killPane(paneId: string, run: Runner = defaultRun): Promise<void> {
  await tmux(run, ['kill-pane', '-t', paneId])
}

/** Types `text` into one pane as literal characters, then Enter. `-l` keeps `C-c` or `Enter` from being read as key names. */
export async function sendText(paneId: string, text: string, run: Runner = defaultRun): Promise<boolean> {
  // `--` so text that starts with a dash is not parsed as a flag.
  const typed = await tmux(run, ['send-keys', '-t', paneId, '-l', '--', text])
  return typed.code === 0 && (await tmux(run, ['send-keys', '-t', paneId, 'Enter'])).code === 0
}

/** Presses one key in one pane, then Enter: how Claude Code's selector takes an option's number (W75). */
export async function sendKey(paneId: string, key: string, run: Runner = defaultRun): Promise<boolean> {
  return (await tmux(run, ['send-keys', '-t', paneId, key])).code === 0 && (await tmux(run, ['send-keys', '-t', paneId, 'Enter'])).code === 0
}

/** Presses one key in one pane and nothing else: Escape interrupts Claude Code's turn without closing it (W86). */
export async function pressKey(paneId: string, key: string, run: Runner = defaultRun): Promise<boolean> {
  return (await tmux(run, ['send-keys', '-t', paneId, key])).code === 0
}

/** Pastes `text` into one pane as a bracketed paste (line breaks do not send), then Enter. Escapes are dropped so the text cannot close the paste early. */
export async function pasteText(paneId: string, text: string, run: Runner = defaultRun): Promise<boolean> {
  const buffer = `atril-${randomUUID().slice(0, 8)}`
  // Only \n and \t survive: no ESC to close the paste early, no ^C/^D/\r to act before Enter.
  // eslint-disable-next-line no-control-regex
  const loaded = await run('tmux', [...tmuxArgs(), 'load-buffer', '-b', buffer, '-'], { input: text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '') })
  if (loaded.code !== 0) return false
  // -d drops the buffer after the paste, -p brackets it when the pane asked for bracketed paste.
  return (await tmux(run, ['paste-buffer', '-d', '-p', '-b', buffer, '-t', paneId])).code === 0 && (await tmux(run, ['send-keys', '-t', paneId, 'Enter'])).code === 0
}
