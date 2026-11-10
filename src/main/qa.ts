import { lstat, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { agentArgv } from './agent'
import { changeFolders } from './flow/stage'
import { t } from './lang'
import { atrilHome } from './paths'
import type { QaKind, QaResult, QaShot, QaStatus } from '../preload/api'
import type { Runner } from './run'
import { hasPane, killPane, splitCommand } from './tmux'
import { readRecords } from './workspaces'

export type { QaKind }
export interface QaInfo {
  kind: QaKind
  command: string
}

const PLAYWRIGHT = '@playwright/mcp@0.0.84'
const MOBILE = '@mobilenext/mobile-mcp@1.0.16'

const exists = (p: string): Promise<boolean> => stat(p).then(() => true, () => false)
const text = (p: string): Promise<string | null> => readFile(p, 'utf8').catch(() => null)

async function packageJson(path: string): Promise<{ deps: Record<string, unknown>; scripts: Record<string, unknown> } | null> {
  const raw = await text(join(path, 'package.json'))
  if (raw === null) return null
  try {
    const p = JSON.parse(raw) as { dependencies?: object; devDependencies?: object; scripts?: object }
    return { deps: { ...p.dependencies, ...p.devDependencies }, scripts: { ...p.scripts } }
  } catch {
    return null
  }
}

/** W83: first match in this order wins. */
export async function detectQa(path: string): Promise<QaInfo | null> {
  const names = await readdir(path).catch(() => [] as string[])
  const pkg = await packageJson(path)
  const has = (n: string): boolean => names.includes(n)

  if (pkg && 'expo' in pkg.deps && names.some((n) => n === 'app.json' || n.startsWith('app.config.'))) return { kind: 'expo', command: 'npx expo start' }
  if (pkg && 'react-native' in pkg.deps && (has('ios') || has('android')))
    return { kind: 'react-native', command: 'npx react-native run-ios / npx react-native run-android' }
  if (has('pubspec.yaml') && /^flutter:/m.test((await text(join(path, 'pubspec.yaml'))) ?? '')) return { kind: 'flutter', command: 'flutter run' }
  if (names.some((n) => n.startsWith('settings.gradle')) && (await exists(join(path, 'app', 'src', 'main', 'AndroidManifest.xml'))))
    return { kind: 'android', command: './gradlew installDebug' }
  if (names.some((n) => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace')) || ((await text(join(path, 'Package.swift'))) ?? '').includes('.iOS('))
    return { kind: 'ios', command: 'xcodebuild -scheme <scheme> -destination "platform=iOS Simulator,name=<simulator>"' }
  const script = ['dev', 'start', 'preview'].find((s) => pkg && s in pkg.scripts)
  if (script) {
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : 'npm'
    return { kind: 'web', command: `${pm} run ${script}` }
  }
  return null
}

const VERSION_ARGS: Record<string, string[]> = { node: ['--version'], adb: ['version'], emulator: ['-version'], xcrun: ['--version'] }

/** adb and emulator often live only in the Android SDK folder, not on PATH. */
function sdkPaths(tool: string): string[] {
  const sub = tool === 'adb' ? join('platform-tools', 'adb') : tool === 'emulator' ? join('emulator', 'emulator') : null
  if (!sub) return []
  const roots = [process.env['ANDROID_HOME'], process.env['ANDROID_SDK_ROOT'], join(homedir(), 'Library', 'Android', 'sdk')]
  return roots.flatMap((r) => (r && existsSync(join(r, sub)) ? [join(r, sub)] : []))
}

/** W84: every tool the kind needs that does not answer; the cross-platform kinds need one of adb or xcrun. */
async function missingTools(kind: QaKind, run: Runner): Promise<string[]> {
  const ok = async (tool: string): Promise<boolean> => {
    for (const cmd of [tool, ...sdkPaths(tool)]) if ((await run(cmd, VERSION_ARGS[tool]!)).code === 0) return true
    return false
  }
  const need = kind === 'android' ? ['node', 'adb', 'emulator'] : kind === 'ios' ? ['node', 'xcrun'] : ['node']
  const missing = (await Promise.all(need.map(async (tool) => ((await ok(tool)) ? null : tool)))).filter((x): x is string => x !== null)
  if (kind === 'expo' || kind === 'react-native' || kind === 'flutter') {
    const [adb, xcrun] = await Promise.all([ok('adb'), ok('xcrun')])
    if (!adb && !xcrun) missing.push('adb', 'xcrun')
  }
  return missing
}

const qaDir = (): string => join(atrilHome(), 'qa')
export const shotsDir = (id: string): string => join(qaDir(), id)
const paneFile = (id: string): string => join(qaDir(), `${id}.pane`)

function mcpConfig(kind: QaKind, shots: string): object {
  return kind === 'web'
    ? { mcpServers: { playwright: { command: 'npx', args: ['-y', PLAYWRIGHT, '--isolated', '--output-dir', shots] } } }
    : { mcpServers: { 'mobile-mcp': { command: 'npx', args: ['-y', MOBILE] } } }
}

async function qaPrompt(info: QaInfo, path: string, branch: string, base: string, shots: string): Promise<string> {
  const [change] = await changeFolders(join(path, '.agents', 'changes'))
  const target = change
    ? t('lo que promete la spec del cambio en {proposal}', { proposal: join(path, '.agents', 'changes', change, 'proposal.md') })
    : t('lo que cambia la rama {branch} respecto a su base ({base})', { branch, base })
  const vars = { kind: info.kind, command: info.command, target, shots }
  return info.kind === 'web'
    ? t('Eres el QA de este trabajo, una app {kind}. Arranca la app con «{command}» en un puerto libre, ábrela con el navegador de Playwright y recorre {target}. Guarda una captura de cada paso en {shots} (sin nombre de archivo, Playwright las deja ahí). No cambies código ni hagas commits; al terminar, resume qué funciona y qué no.', vars)
    : t('Eres el QA de este trabajo, una app {kind}. Si no hay ningún emulador o simulador en marcha, arranca uno. Arranca la app con «{command}» y recorre {target} con mobile-mcp. Guarda una captura PNG de cada paso en {shots} (con la herramienta de captura de mobile-mcp, `adb exec-out screencap -p > archivo.png` o `xcrun simctl io booted screenshot archivo.png`). No cambies código ni hagas commits; al terminar, resume qué funciona y qué no.', vars)
}

/** W84: the QA pane lives while tmux still lists it in the workspace's session. */
export async function qaLive(id: string, run: Runner): Promise<boolean> {
  const pane = (await text(paneFile(id)))?.trim()
  return Boolean(pane) && (await hasPane(id, pane!, run))
}

// Two presses at once both find no pane yet: the first one holds the workspace until its pane is kept.
const starting = new Set<string>()

export async function launchQa(id: string, run: Runner): Promise<QaResult> {
  const ws = (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
  if (!ws) return { error: t('Ese trabajo ya no existe') }
  const info = await detectQa(ws.path)
  if (!info) return { error: t('Atril no sabe probar en vivo este proyecto') }
  if (starting.has(id)) return { error: t('Ya hay un QA en marcha en este trabajo') }
  starting.add(id)
  try {
    if (await qaLive(id, run)) return { error: t('Ya hay un QA en marcha en este trabajo') }
    const missing = await missingTools(info.kind, run)
    if (missing.length > 0) return { error: t('Para probar en vivo falta: {tools}', { tools: missing.join(', ') }) }
    const shots = shotsDir(id)
    await mkdir(shots, { recursive: true })
    const config = join(qaDir(), `${id}.mcp.json`)
    await writeFile(config, JSON.stringify(mcpConfig(info.kind, shots), null, 2) + '\n')
    const prompt = await qaPrompt(info, ws.path, ws.branch, ws.baseCommit, shots)
    const pane = await splitCommand(id, ws.path, agentArgv({ hooks: false, mcpConfig: config, prompt }), run)
    await writeFile(paneFile(id), pane + '\n')
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  } finally {
    starting.delete(id)
  }
}

/** Kills only the QA pane; its MCP file and screenshots stay. */
export async function stopQa(id: string, run: Runner): Promise<QaResult> {
  // The id names files under qa/: only a recorded workspace's id gets that far.
  if (!(await readRecords()).some((r) => r.id === id)) return { error: t('Ese trabajo ya no existe') }
  const pane = (await text(paneFile(id)))?.trim()
  if (pane && (await hasPane(id, pane, run))) await killPane(pane, run)
  await rm(paneFile(id), { force: true })
  return { ok: true }
}

const MAX_SHOTS = 12
const MAX_BYTES = 2 * 1024 * 1024

/** F33: what the window shows; null for a project Atril cannot test. */
export async function qaStatus(id: string, run: Runner): Promise<QaStatus | null> {
  const ws = (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
  const info = ws && (await detectQa(ws.path))
  if (!info) return null
  const dir = shotsDir(id)
  const pngs = (await readdir(dir).catch(() => [] as string[])).filter((n) => n.toLowerCase().endsWith('.png'))
  const sized = await Promise.all(pngs.map(async (name) => ({ name, st: await lstat(join(dir, name)).catch(() => null) })))
  const newest = sized
    // lstat: a link in the folder is never followed out of it.
    .filter((f) => f.st?.isFile() && f.st.size <= MAX_BYTES)
    .sort((a, b) => b.st!.mtimeMs - a.st!.mtimeMs || a.name.localeCompare(b.name))
    .slice(0, MAX_SHOTS)
  const shots: QaShot[] = await Promise.all(
    newest.map(async (f) => ({ name: f.name, at: f.st!.mtimeMs, src: `data:image/png;base64,${(await readFile(join(dir, f.name))).toString('base64')}` }))
  )
  return { kind: info.kind, live: await qaLive(id, run), shots }
}
