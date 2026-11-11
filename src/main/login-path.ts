import { join } from 'node:path'
import type { Runner } from './run'

const MARK = '__ATRIL_PATH__'

/** W128: a Dock-launched app gets /usr/bin:/bin only; the person's shell knows where claude, tmux and jira live. */
export async function loginPath(run: Runner, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const shell = env['SHELL'] || '/bin/zsh'
  // Markers: a .zshrc that prints a greeting must not end up in PATH.
  const r = await run(shell, ['-ilc', `printf "${MARK}%s${MARK}" "$PATH"`], { timeoutMs: 3000 })
  const found = r.code === 0 ? (new RegExp(`${MARK}(.*?)${MARK}`, 's').exec(r.stdout)?.[1] ?? '') : ''
  const home = env['HOME'] ?? ''
  const all = [...found.split(':'), ...(home ? [join(home, '.local/bin')] : []), '/opt/homebrew/bin', '/usr/local/bin', ...(env['PATH'] ?? '').split(':')]
  return [...new Set(all.filter(Boolean))].join(':')
}
