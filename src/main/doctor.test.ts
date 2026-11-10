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
