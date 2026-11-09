import type { DoctorReport, ToolReport } from '../preload/api'
import type { Runner } from './run'

export type { DoctorReport, ToolReport }

const TOOLS: ReadonlyArray<{ tool: string; versionArgs: string[]; install: string }> = [
  { tool: 'git', versionArgs: ['--version'], install: 'xcode-select --install' },
  { tool: 'tmux', versionArgs: ['-V'], install: 'brew install tmux' },
  { tool: 'claude', versionArgs: ['--version'], install: 'curl -fsSL https://claude.ai/install.sh | bash' },
  { tool: 'jira', versionArgs: ['version'], install: 'brew install ankitpokhrel/jira-cli/jira-cli' }
]

async function check({ tool, versionArgs, install }: (typeof TOOLS)[number], run: Runner): Promise<ToolReport> {
  const r = await run(tool, versionArgs)
  if (r.code === 0) {
    return { tool, ok: true, version: r.stdout.trim().split('\n')[0], install }
  }
  const detail = r.stderr.trim().split('\n')[0]
  return {
    tool,
    ok: false,
    problem: detail ? `no responde a ${versionArgs.join(' ')}: ${detail}` : `${versionArgs.join(' ')} falló con código ${r.code}`,
    install
  }
}

export function doctor(run: Runner): Promise<DoctorReport> {
  return Promise.all(TOOLS.map((t) => check(t, run)))
}
