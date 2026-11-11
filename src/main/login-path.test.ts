import { describe, expect, it } from 'vitest'
import { loginPath } from './login-path'
import type { Runner } from './run'

const env = { SHELL: '/bin/zsh', HOME: '/Users/ana', PATH: '/usr/bin:/bin:/usr/sbin:/sbin' }
const usual = ['/Users/ana/.local/bin', '/opt/homebrew/bin', '/usr/local/bin']

describe('login path', () => {
  it("the shell's path comes first and nothing repeats", async () => {
    const calls: Array<[string, string[], number | undefined]> = []
    const run: Runner = async (cmd, args, opts) => {
      calls.push([cmd, args, opts?.timeoutMs])
      // A chatty .zshrc prints before the markers.
      return { code: 0, stdout: 'Welcome!\n__ATRIL_PATH__/Users/ana/.asdf/shims:/opt/homebrew/bin:/usr/bin__ATRIL_PATH__', stderr: '' }
    }
    const path = await loginPath(run, env)
    expect(path.split(':')).toEqual(['/Users/ana/.asdf/shims', '/opt/homebrew/bin', '/usr/bin', '/Users/ana/.local/bin', '/usr/local/bin', '/bin', '/usr/sbin', '/sbin'])
    expect(calls).toEqual([['/bin/zsh', ['-ilc', 'printf "__ATRIL_PATH__%s__ATRIL_PATH__" "$PATH"'], 3000]])
  })

  it('a silent or slow shell still adds the usual folders', async () => {
    for (const answer of [{ code: 124, stdout: '', stderr: '' }, { code: 0, stdout: '/garbage', stderr: '' }, { code: 1, stdout: '', stderr: 'boom' }]) {
      const path = await loginPath(async () => answer, env)
      expect(path.split(':')).toEqual([...usual, '/usr/bin', '/bin', '/usr/sbin', '/sbin'])
    }
  })
})
