import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
