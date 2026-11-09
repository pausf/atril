import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Runner } from './run'

const made: string[] = []
export const tmp = (): string => {
  const d = realpathSync(mkdtempSync(join(tmpdir(), 'atril-t-')))
  made.push(d)
  return d
}
export const cleanTmp = (): void => {
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true })
}
export const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }
  })

/** Real repo with one commit, registered in $ATRIL_HOME/repos.json. */
export function makeRegisteredRepo(home: string, id = 'demo'): string {
  const root = tmp()
  git(root, 'init', '-q')
  writeFileSync(join(root, 'a.txt'), 'x')
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'init')
  writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id, path: root }] }))
  return root
}

export const tmuxSock = (): string => `atril-test-${Math.random().toString(36).slice(2, 10)}`
export const killTmux = (sock: string): void => {
  try {
    execFileSync('tmux', ['-L', sock, 'kill-server'], { stdio: 'ignore' })
  } catch {
    /* no server */
  }
}
export const tmuxOut = (sock: string, ...args: string[]): string =>
  execFileSync('tmux', ['-L', sock, ...args], { encoding: 'utf8' })

const SLEEP = ['sh', '-c', 'sleep 300']
/** Runner that records the agent argv tmux was given, and starts a harmless sleep instead of claude. */
export function agentSpy(run: Runner): { run: Runner; argvs: string[][] } {
  const argvs: string[][] = []
  const spy: Runner = (cmd, args, opts) => {
    // The agent starts in respawn-pane (after the session's options): capture it there, run SLEEP instead.
    if (cmd === 'tmux' && args.includes('respawn-pane')) {
      const at = args.indexOf('-c') + 2
      argvs.push(args.slice(at))
      return run(cmd, [...args.slice(0, at), ...SLEEP], opts)
    }
    return run(cmd, args, opts)
  }
  return { run: spy, argvs }
}
