import { spawn } from 'node:child_process'

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export interface RunOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  /** Output may hold credentials: callers must not log it. */
  secret?: boolean
}

export type Runner = (cmd: string, args: string[], opts?: RunOptions) => Promise<RunResult>

// The only place in main that spawns a process. Argument array, never a shell.
export const run: Runner = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (r: RunResult): void => {
      if (settled) return
      settled = true
      resolve(r)
    }

    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env, shell: false })
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    // 'error' (ENOENT, EACCES) may fire without 'close': resolve here too.
    child.on('error', (err) => finish({ code: 127, stdout, stderr: stderr || err.message }))
    child.on('close', (code) => finish({ code: code ?? 1, stdout, stderr }))
  })
