import { describe, expect, it } from 'vitest'
import { doctor, installTool, quoteAppleScript } from './doctor'
import type { Runner } from './run'

const INSTALL = {
  git: 'xcode-select --install',
  tmux: 'brew install tmux',
  claude: 'curl -fsSL https://claude.ai/install.sh | bash',
  jira: 'brew install ankitpokhrel/jira-cli/jira-cli'
}

describe('doctor', () => {
  it('names each missing tool with its install command', async () => {
    const fake: Runner = async (cmd) => {
      if (cmd === 'tmux') return { code: 1, stdout: '', stderr: 'spawn tmux ENOENT' }
      if (cmd === 'jira') return { code: 127, stdout: '', stderr: 'command not found' }
      return { code: 0, stdout: `${cmd} version 1.2.3\n`, stderr: '' }
    }

    const report = await doctor(fake)

    expect(report.map((r) => r.tool)).toEqual(['git', 'tmux', 'claude', 'jira'])
    const bad = report.filter((r) => !r.ok)
    expect(bad.map((r) => r.tool)).toEqual(['tmux', 'jira'])
    for (const r of bad) {
      expect(r.install).toBe(INSTALL[r.tool as keyof typeof INSTALL])
      expect(r.problem).toBeTruthy()
    }
    const good = report.filter((r) => r.ok)
    expect(good.map((r) => r.tool)).toEqual(['git', 'claude'])
    expect(good.every((r) => r.problem === undefined && r.version)).toBe(true)
  })

  it('asks each tool for its version the way that tool understands', async () => {
    const calls: string[] = []
    const fake: Runner = async (cmd, args) => {
      calls.push([cmd, ...args].join(' '))
      return { code: 0, stdout: 'v\n', stderr: '' }
    }

    await doctor(fake)

    expect(calls).toEqual(['git --version', 'tmux -V', 'claude --version', 'jira version'])
  })

  it('a hung tool is reported after 5 s', async () => {
    const limits: Array<number | undefined> = []
    // The runner's own timeout answers 124 once timeoutMs passes: a hung claude looks like that.
    const fake: Runner = async (cmd, _args, opts) => {
      limits.push(opts?.timeoutMs)
      return cmd === 'claude' ? { code: 124, stdout: '', stderr: '' } : { code: 0, stdout: `${cmd} 1\n`, stderr: '' }
    }

    const report = await doctor(fake)

    expect(limits).toEqual([5000, 5000, 5000, 5000])
    const claude = report.find((r) => r.tool === 'claude')!
    expect(claude.ok).toBe(false)
    expect(claude.problem).toBe('no responde en 5 s')
    expect(claude.install).toBe(INSTALL.claude)
    expect(report.filter((r) => r.ok).map((r) => r.tool)).toEqual(['git', 'tmux', 'jira'])
  })
})

describe('install', () => {
  it('opens the terminal with the listed command only', async () => {
    const calls: Array<[string, string[]]> = []
    const ok: Runner = async (cmd, args) => {
      calls.push([cmd, args])
      return { code: 0, stdout: '', stderr: '' }
    }

    expect(await installTool('tmux', ok)).toEqual({ ok: true })
    expect(calls).toEqual([
      ['osascript', ['-e', 'tell application "Terminal" to activate', '-e', 'tell application "Terminal" to do script "brew install tmux"']]
    ])

    calls.length = 0
    expect(await installTool('tmux; rm -rf /', ok)).toHaveProperty('error')
    expect(await installTool('', ok)).toHaveProperty('error')
    expect(calls).toEqual([])

    const denied: Runner = async () => ({ code: 1, stdout: '', stderr: 'not allowed\nsecond line' })
    expect(await installTool('git', denied)).toEqual({ error: 'not allowed' })

    expect(quoteAppleScript('echo "a\\b"')).toBe('echo \\"a\\\\b\\"')
  })
})
