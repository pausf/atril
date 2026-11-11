import type { DoctorReport, ToolReport } from '../preload/api'
import type { Runner } from './run'
import { t } from './lang'

export type { DoctorReport, ToolReport }

const TOOLS: ReadonlyArray<{ tool: string; versionArgs: string[]; install: string }> = [
  { tool: 'git', versionArgs: ['--version'], install: 'xcode-select --install' },
  { tool: 'tmux', versionArgs: ['-V'], install: 'brew install tmux' },
  { tool: 'claude', versionArgs: ['--version'], install: 'curl -fsSL https://claude.ai/install.sh | bash' },
  { tool: 'jira', versionArgs: ['version'], install: 'brew install ankitpokhrel/jira-cli/jira-cli' }
]

async function check({ tool, versionArgs, install }: (typeof TOOLS)[number], run: Runner): Promise<ToolReport> {
  const r = await run(tool, versionArgs, { timeoutMs: 5000 })
  if (r.code === 0) {
    return { tool, ok: true, version: r.stdout.trim().split('\n')[0], install }
  }
  // W127: the runner kills a hung tool and answers 124.
  if (r.code === 124) return { tool, ok: false, problem: t('no responde en 5 s'), install }
  const detail = r.stderr.trim().split('\n')[0]
  return {
    tool,
    ok: false,
    problem: detail
      ? t('no responde a {args}: {detail}', { args: versionArgs.join(' '), detail })
      : t('{args} falló con código {code}', { args: versionArgs.join(' '), code: r.code }),
    install
  }
}

export function doctor(run: Runner): Promise<DoctorReport> {
  return Promise.all(TOOLS.map((t) => check(t, run)))
}

export const quoteAppleScript = (c: string): string => c.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

/** Opens Terminal running `command`; callers pass only fixed commands. */
export async function inTerminal(command: string, run: Runner): Promise<{ ok: true } | { error: string }> {
  const r = await run('osascript', ['-e', 'tell application "Terminal" to activate', '-e', `tell application "Terminal" to do script "${quoteAppleScript(command)}"`])
  if (r.code === 0) return { ok: true }
  return { error: r.stderr.trim().split('\n')[0] || t('{args} falló con código {code}', { args: 'osascript', code: r.code }) }
}

/** Only names in TOOLS reach osascript: the window never sends a command (W21). */
export async function installTool(tool: unknown, run: Runner): Promise<{ ok: true } | { error: string }> {
  const found = TOOLS.find((x) => x.tool === tool)
  if (!found) return { error: t('herramienta desconocida: {tool}', { tool: String(tool) }) }
  return inTerminal(found.install, run)
}
