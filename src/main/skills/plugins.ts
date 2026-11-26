import type { PluginActionResult, PluginCatalog, PluginCatalogResult, PluginFailure, PluginRequest } from '../../preload/api'
import { inTerminal } from '../doctor'
import { t } from '../lang'
import type { RunResult, Runner } from '../run'
import { listSkills, repoDirOf, type RepoList } from './read'

const CLI_MS = 120_000
const ACTIONS: readonly string[] = ['install', 'uninstall', 'update']
// First character alphanumeric: nothing shaped like a flag (`-y@x`) reaches the CLI.
const PLUGIN = /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$/
const invalid = (): PluginFailure => ({ error: t('Invalid request.'), code: 'invalid' })
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** The JSON object on the last stdout line, or undefined when there is none. */
function lastJson(stdout: string): Record<string, unknown> | undefined {
  try {
    const v: unknown = JSON.parse(stdout.trimEnd().split('\n').pop() ?? '')
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

/** K30: the failure a result stands for, or the parsed JSON when the CLI succeeded. */
function outcome(r: RunResult, needOk = true): PluginFailure | { json: Record<string, unknown> } {
  if (r.code === 127) return { error: t('I cannot find Claude Code on this Mac.'), code: 'missing' }
  if (r.code === 124) return { error: t('Claude Code did not answer in time.'), code: 'timeout' }
  const json = lastJson(r.stdout)
  const message = str(json?.['message'])
  if (r.code !== 0 || !json || json['outcome'] === 'failed' || (needOk && json['outcome'] !== 'ok')) return { error: message ?? r.stderr.trim().slice(-300), code: 'failed' }
  return { json }
}

function toCatalog(json: Record<string, unknown>): PluginCatalog {
  const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.map(obj) : [])
  const installed: PluginCatalog['installed'] = []
  for (const e of rows(json['installed'])) {
    const pluginId = str(e['pluginId'])
    const scope = str(e['scope'])
    if (!pluginId || !scope) continue
    const projectPath = str(e['projectPath'])
    installed.push({ pluginId, scope, ...(projectPath ? { projectPath } : {}) })
  }
  const available: PluginCatalog['available'] = []
  for (const e of rows(json['available'])) {
    const pluginId = str(e['pluginId'])
    if (!pluginId) continue
    const at = pluginId.indexOf('@')
    const name = str(e['name']) ?? (at > 0 ? pluginId.slice(0, at) : pluginId)
    const marketplace = str(e['marketplace']) ?? (at > 0 ? pluginId.slice(at + 1) : '')
    const description = str(e['description'])
    const version = str(e['version'])
    available.push({ pluginId, name, marketplace, ...(description ? { description } : {}), ...(version ? { version } : {}) })
  }
  return { installed, available }
}

/** K27–K31: Claude Code's own `plugin` commands, one at a time, never writing its files. */
export function createPlugins({ run, repos, libretto }: { run: Runner; repos: () => Promise<RepoList>; libretto: string }) {
  let busy = false

  /** The repo's folder for an id; `bad` when an id is given that the list does not know. */
  async function cwdOf(repoId: unknown): Promise<{ cwd?: string; bad?: true }> {
    const id = str(repoId)
    if (!id) return {}
    const cwd = await repoDirOf(id, repos, [])
    return cwd ? { cwd } : { bad: true }
  }

  /** `hold` false: a read waits for no one but does not stop others, so two catalog reads can overlap. */
  async function exclusive<T>(work: () => Promise<T>, hold = true): Promise<T | PluginFailure> {
    if (busy) return { error: t('A plugin operation is already running.'), code: 'busy' }
    if (hold) busy = true
    try {
      return await work()
    } catch {
      return { error: t('Claude Code failed.'), code: 'failed' }
    } finally {
      if (hold) busy = false
    }
  }

  async function readCatalog(cwd: string | undefined): Promise<PluginCatalogResult> {
    const o = outcome(await run('claude', ['plugin', 'list', '--available', '--json'], { cwd, timeoutMs: CLI_MS }), false)
    return 'json' in o ? { catalog: toCatalog(o.json) } : o
  }

  /** K28 validation, shared with K31: the args after `claude plugin`, without `--json`. */
  async function checked(req: PluginRequest): Promise<PluginFailure | { args: string[]; cwd?: string }> {
    const r = obj(req)
    const action = str(r['action'])
    const plugin = str(r['plugin'])
    const scope = r['scope']
    if (!action || !ACTIONS.includes(action) || !plugin || !PLUGIN.test(plugin) || (scope !== 'user' && scope !== 'local')) return invalid()
    const { cwd, bad } = await cwdOf(r['repoId'])
    if (bad || (scope === 'local' && !cwd)) return invalid()
    return { args: [action, plugin, '--scope', scope], cwd }
  }

  return {
    catalog: (repoId?: string): Promise<PluginCatalogResult> =>
      exclusive(async () => {
        const { cwd, bad } = await cwdOf(repoId)
        return bad ? invalid() : readCatalog(cwd)
      }, false),

    action: (req: PluginRequest): Promise<PluginActionResult> =>
      exclusive(async () => {
        const c = await checked(req)
        if ('error' in c) return c
        const o = outcome(await run('claude', ['plugin', ...c.args, '--json'], { cwd: c.cwd, timeoutMs: CLI_MS }))
        if (!('json' in o)) return o
        return { list: await listSkills(str(obj(req)['repoId']), repos, libretto) }
      }),

    marketplace: (req: { source: string; repoId?: string }): Promise<PluginCatalogResult> =>
      exclusive(async () => {
        const source = str(obj(req)['source'])
        if (!source || source.length > 500 || /\s/.test(source) || source.startsWith('-')) return invalid()
        const { cwd, bad } = await cwdOf(obj(req)['repoId'])
        if (bad) return invalid()
        const o = outcome(await run('claude', ['plugin', 'marketplace', 'add', source, '--scope', 'user', '--json'], { cwd, timeoutMs: CLI_MS }))
        return 'json' in o ? readCatalog(cwd) : o
      }),

    async terminal(req: PluginRequest): Promise<{ ok: true } | { error: string }> {
      const c = await checked(req)
      if ('error' in c) return { error: c.error }
      // Only the repo path needs quoting: plugin and scope passed their regex.
      const cd = c.cwd ? `cd '${c.cwd.replace(/'/g, `'\\''`)}' && ` : ''
      return inTerminal(`${cd}claude plugin ${c.args.join(' ')}`, run)
    }
  }
}
