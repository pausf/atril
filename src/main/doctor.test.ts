import { describe, expect, it } from 'vitest'
import { doctor } from './doctor'
import type { Runner } from './run'

const INSTALL = {
  git: 'xcode-select --install',
  tmux: 'brew install tmux',
  claude: 'curl -fsSL https://claude.ai/install.sh | bash',
  codex: 'npm i -g @openai/codex',
  jira: 'brew install ankitpokhrel/jira-cli/jira-cli'
}

describe('doctor', () => {
  it('names each missing tool with its install command', async () => {
    const fake: Runner = async (cmd) => {
      if (cmd === 'codex') return { code: 1, stdout: '', stderr: 'spawn codex ENOENT' }
      if (cmd === 'jira') return { code: 127, stdout: '', stderr: 'command not found' }
      return { code: 0, stdout: `${cmd} version 1.2.3\n`, stderr: '' }
    }

    const report = await doctor(fake)

    expect(report.map((r) => r.tool)).toEqual(['git', 'tmux', 'claude', 'codex', 'jira'])
    const bad = report.filter((r) => !r.ok)
    expect(bad.map((r) => r.tool)).toEqual(['codex', 'jira'])
    for (const r of bad) {
      expect(r.install).toBe(INSTALL[r.tool as keyof typeof INSTALL])
      expect(r.problem).toBeTruthy()
    }
    const good = report.filter((r) => r.ok)
    expect(good.map((r) => r.tool)).toEqual(['git', 'tmux', 'claude'])
    expect(good.every((r) => r.problem === undefined && r.version)).toBe(true)
  })

  it('asks each tool for its version the way that tool understands', async () => {
    const calls: string[] = []
    const fake: Runner = async (cmd, args) => {
      calls.push([cmd, ...args].join(' '))
      return { code: 0, stdout: 'v\n', stderr: '' }
    }

    await doctor(fake)

    expect(calls).toEqual(['git --version', 'tmux -V', 'claude --version', 'codex --version', 'jira version'])
  })
})
