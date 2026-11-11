import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { agentArgv } from './agent'
import { readCriteria } from './qa-criteria'
import { t } from './lang'
import { atrilHome } from './paths'
import type { QaFix, QaKind, QaLaunchResult, QaPlatform, QaResult, QaShot, QaStatus, QaTarget } from '../preload/api'
import type { Runner } from './run'
import { hasPane, killPane, splitCommand } from './tmux'
import { qaTargets } from './qa-targets'
import { readRecords } from './workspaces'

export type { QaKind }
export interface QaInfo {
  kind: QaKind
  command: string
  /** W120: one line naming the file that decided it. */
  why: string
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

  const expo = names.find((n) => n === 'app.json' || n.startsWith('app.config.'))
  if (pkg && 'expo' in pkg.deps && expo) return { kind: 'expo', command: 'npx expo start', why: t('Hay un {file} de Expo', { file: expo }) }
  if (pkg && 'react-native' in pkg.deps && (has('ios') || has('android')))
    return { kind: 'react-native', command: 'npx react-native run-ios / npx react-native run-android', why: t('Hay un package.json con react-native') }
  if (has('pubspec.yaml') && /^flutter:/m.test((await text(join(path, 'pubspec.yaml'))) ?? '')) return { kind: 'flutter', command: 'flutter run', why: t('Hay un pubspec.yaml de Flutter') }
  const gradle = names.find((n) => n.startsWith('settings.gradle'))
  if (gradle && (await exists(join(path, 'app', 'src', 'main', 'AndroidManifest.xml'))))
    return { kind: 'android', command: './gradlew installDebug', why: t('Hay un {file} con una app Android', { file: gradle }) }
  const xcode = names.find((n) => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace')) ?? (((await text(join(path, 'Package.swift'))) ?? '').includes('.iOS(') ? 'Package.swift' : null)
  if (xcode) return { kind: 'ios', command: 'xcodebuild -scheme <scheme> -destination "platform=iOS Simulator,name=<simulator>"', why: t('Hay un {file} de iOS', { file: xcode }) }
  const script = ['dev', 'start', 'preview'].find((s) => pkg && s in pkg.scripts)
  if (script) {
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : 'npm'
    return { kind: 'web', command: `${pm} run ${script}`, why: t('Hay un package.json con el script {script}', { script }) }
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

/** The first way to call `tool` that answers, or null. */
async function which(tool: string, run: Runner): Promise<string | null> {
  for (const cmd of [tool, ...sdkPaths(tool)]) if ((await run(cmd, VERSION_ARGS[tool]!)).code === 0) return cmd
  return null
}

const NEEDS: Record<QaPlatform, string[]> = { chrome: ['node'], safari: ['node'], android: ['node', 'adb', 'emulator'], ios: ['node', 'xcrun'] }

/** W125: every tool the platform needs that does not answer; Xcode's MCP counts only when `xcrun --find mcpbridge` finds it. */
async function tools(platform: QaPlatform, run: Runner): Promise<{ missing: string[]; emulator: string | null }> {
  const found = await Promise.all(NEEDS[platform].map(async (tool) => [tool, await which(tool, run)] as const))
  const missing = found.filter(([, cmd]) => cmd === null).map(([tool]) => tool)
  if (platform === 'ios' && !missing.includes('xcrun') && (await run('xcrun', ['--find', 'mcpbridge'])).code !== 0) missing.push('mcpbridge')
  return { missing, emulator: found.find(([tool]) => tool === 'emulator')?.[1] ?? null }
}

export interface QaDevice {
  id: string
  name: string
  boot: string
}

/** W124: the person's devices in their own order: AVDs, or available iPhone simulators. */
async function listDevices(platform: QaPlatform, emulator: string | null, run: Runner): Promise<QaDevice[]> {
  if (platform === 'android') {
    const r = await run(emulator ?? 'emulator', ['-list-avds'])
    if (r.code !== 0) return []
    return r.stdout
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => /^[\w.-]+$/.test(n))
      .map((n) => ({ id: n, name: n, boot: `emulator -avd ${n}` }))
  }
  const r = await run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'])
  try {
    const runtimes = (JSON.parse(r.stdout) as { devices?: Record<string, unknown> }).devices ?? {}
    return Object.entries(runtimes)
      .filter(([runtime]) => runtime.includes('iOS'))
      .flatMap(([, list]) => (Array.isArray(list) ? (list as Array<{ name?: unknown; udid?: unknown }>) : []))
      .filter((d): d is { name: string; udid: string } => typeof d.name === 'string' && d.name.startsWith('iPhone') && typeof d.udid === 'string' && /^[\w-]+$/.test(d.udid))
      .map((d) => ({ id: d.udid, name: d.name, boot: `xcrun simctl boot ${d.udid}` }))
  } catch {
    return []
  }
}

const qaDir = (): string => join(atrilHome(), 'qa')
export const shotsDir = (id: string): string => join(qaDir(), id)
const paneFile = (id: string): string => join(qaDir(), `${id}.pane`)
export const reportFile = (id: string): string => join(shotsDir(id), 'report.json')
const holdsFile = (): string => join(qaDir(), 'devices.json')

type Holds = Record<string, string>

async function readHolds(): Promise<Holds> {
  try {
    const v = JSON.parse(await readFile(holdsFile(), 'utf8')) as unknown
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Holds) : {}
  } catch {
    return {}
  }
}

// W124: every read and write of devices.json goes through this chain, so two launches never both take one device.
let holding: Promise<unknown> = Promise.resolve()

function withHolds<T>(fn: (held: Holds) => Promise<{ value: T; write: boolean }>): Promise<T> {
  const next = holding.then(async () => {
    const held = await readHolds()
    const { value, write } = await fn(held)
    if (write) {
      await mkdir(qaDir(), { recursive: true })
      const temp = `${holdsFile()}.${process.pid}.${randomUUID()}.tmp`
      await writeFile(temp, JSON.stringify(held, null, 2) + '\n')
      await rename(temp, holdsFile())
    }
    return value
  })
  holding = next.catch(() => undefined)
  return next
}

/** W124: a hold counts while its workspace is starting or its QA pane lives. */
function reserve(id: string, devices: QaDevice[], run: Runner): Promise<QaDevice | null> {
  return withHolds(async (held) => {
    for (const d of devices) {
      const by = held[d.id]
      if (by && by !== id && /^[\w-]+$/.test(by) && (starting.has(by) || (await qaLive(by, run)))) continue
      for (const [k, v] of Object.entries(held)) if (v === id) delete held[k]
      held[d.id] = id
      return { value: d, write: true }
    }
    return { value: null, write: false }
  })
}

const release = (id: string): Promise<void> =>
  withHolds(async (held) => {
    const mine = Object.keys(held).filter((k) => held[k] === id)
    for (const k of mine) delete held[k]
    return { value: undefined, write: mine.length > 0 }
  })

function mcpConfig(platform: QaPlatform, shots: string): object {
  const mobile = { command: 'npx', args: ['-y', MOBILE] }
  switch (platform) {
    case 'chrome':
    case 'safari':
      return { mcpServers: { playwright: { command: 'npx', args: ['-y', PLAYWRIGHT, '--browser', platform === 'chrome' ? 'chrome' : 'webkit', '--isolated', '--output-dir', shots] } } }
    case 'android':
      return { mcpServers: { 'mobile-mcp': mobile } }
    case 'ios':
      return { mcpServers: { xcode: { command: 'xcrun', args: ['mcpbridge'] }, 'mobile-mcp': mobile } }
  }
}

export const PLATFORM_LABEL: Record<QaPlatform, string> = { chrome: 'Chrome', safari: 'Safari', android: 'Android', ios: 'iOS' }

const REPORT_SHAPE = '{"criteria":[{"id":"W1","status":"pass","note":"one sentence","steps":[{"text":"what you did","ms":1200,"shot":"captura.png"}]}]}'

/** W84, W119: the prompt names the platform, the device, the change, and asks for a report.json per criterion; `request` goes last (W116). */
export async function qaPrompt(target: QaTarget, device: QaDevice | null, path: string, branch: string, base: string, shots: string, id: string, request?: string): Promise<string> {
  const { change, criteria } = await readCriteria(path)
  const what = change
    ? t('lo que promete la spec del cambio en {proposal}', { proposal: join(path, '.agents', 'changes', change, 'proposal.md') })
    : t('lo que cambia la rama {branch} respecto a su base ({base})', { branch, base })
  const vars = { platform: PLATFORM_LABEL[target.platform], command: target.command, target: what, shots }
  const intro = !device
    ? t('Eres el QA de este trabajo en {platform}. Arranca la app con «{command}» en un puerto libre, ábrela con el navegador de Playwright y recorre {target}. Guarda una captura de cada paso en {shots} (sin nombre de archivo, Playwright las deja ahí). No cambies código ni hagas commits; al terminar, resume qué funciona y qué no.', vars)
    : t('Eres el QA de este trabajo en {platform}. Usa solo {device}, reservado para este trabajo (los demás son de otros QA); si no está en marcha, arráncalo con «{boot}». Arranca la app con «{command}» y recorre {target} con {tools}. Guarda una captura PNG de cada paso en {shots} con la herramienta de captura de mobile-mcp. No cambies código ni hagas commits; al terminar, resume qué funciona y qué no.', {
        ...vars,
        device: device.name,
        boot: device.boot,
        tools: target.platform === 'ios' ? t('mobile-mcp y el MCP de Xcode') : 'mobile-mcp'
      })
  const parts = [intro]
  if (criteria.length > 0) {
    parts.push(
      t('Al terminar cada criterio, escribe el informe en {report} y reescríbelo entero cada vez, con esta forma: {shape}. «status» es pass, fail o untested; «shot» es el nombre de una captura de {shots}, sin ruta. Los criterios:', {
        report: reportFile(id),
        shape: REPORT_SHAPE,
        shots
      }),
      ...criteria.map((c) => `- ${c.id}: ${c.text}`)
    )
  }
  if (request) parts.push(request)
  return parts.join('\n\n')
}

/** W84: the QA pane lives while tmux still lists it in the workspace's session. */
export async function qaPane(id: string, run: Runner): Promise<string | null> {
  const pane = (await text(paneFile(id)))?.trim()
  return pane && (await hasPane(id, pane, run)) ? pane : null
}

export async function qaLive(id: string, run: Runner): Promise<boolean> {
  return (await qaPane(id, run)) !== null
}

// Two presses at once both find no pane yet: the first one holds the workspace until its pane is kept.
const starting = new Set<string>()

const fail = (what: string, cant: string, fix: QaFix, detail: string): QaLaunchResult => ({ error: what, problem: { what, cant, fix, detail } })

/** W125: the first problem in this order stops the launch, before anything starts. */
async function problemOf(target: QaTarget, run: Runner): Promise<{ problem: QaLaunchResult } | { emulator: string | null }> {
  const { missing, emulator } = await tools(target.platform, run)
  const detail = t('Falta: {tools}', { tools: missing.join(', ') })
  if (missing.includes('node')) return { problem: fail(t('Falta Node'), t('No puedes probar en vivo: las herramientas de QA corren con Node'), 'install-node', detail) }
  if (missing.length > 0 && target.platform === 'android') return { problem: fail(t('Falta el SDK de Android'), t('No puedes probar en Android'), 'install-android-studio', detail) }
  if (missing.length > 0) return { problem: fail(t('Tu Xcode no trae su MCP'), t('No puedes probar en iOS: hace falta Xcode 26.3 o posterior'), 'update-xcode', detail) }
  return { emulator }
}

/** `request`: W116's ask, appended to the prompt when a retest has to start QA. `key`: the target; the repo's chosen one when absent. */
export async function launchQa(id: string, run: Runner, request?: string, key?: string): Promise<QaLaunchResult> {
  const ws = (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
  if (!ws) return { error: t('Ese trabajo ya no existe') }
  const listed = await qaTargets(id)
  const target = listed?.targets.find((x) => x.key === (key ?? listed.chosen))
  if (!target && key !== undefined) return { error: t('Ese objetivo no existe') }
  if (!target)
    return fail(
      t('No sé cómo abrir este proyecto'),
      t('No puedes probarlo en vivo hasta que elijas cómo abrirlo'),
      'pick-manual',
      t('Busqué package.json con dev, start o preview, app.json de Expo, pubspec.yaml, settings.gradle, .xcodeproj o Package.swift, en la raíz y dos niveles')
    )
  if (starting.has(id)) return { error: t('Ya hay un QA en marcha en este trabajo') }
  starting.add(id)
  try {
    if (await qaLive(id, run)) return { error: t('Ya hay un QA en marcha en este trabajo') }
    const checked = await problemOf(target, run)
    if ('problem' in checked) return checked.problem
    let device: QaDevice | null = null
    if (target.platform === 'android' || target.platform === 'ios') {
      const android = target.platform === 'android'
      const list = await listDevices(target.platform, checked.emulator, run)
      if (list.length === 0)
        return android
          ? fail(t('No tienes ningún emulador de Android'), t('No puedes probar en Android hasta que crees uno'), 'create-avd', t('emulator -list-avds no devolvió ninguno'))
          : fail(t('No hay ningún simulador de iPhone'), t('No puedes probar en iOS hasta que tengas uno'), 'open-xcode', t('xcrun simctl list devices available no trajo ningún iPhone'))
      device = await reserve(id, list, run)
      if (!device) {
        const by = (await readHolds())[list[0]!.id]
        const branch = (await readRecords()).find((r) => r.id === by)?.branch ?? by ?? ''
        return fail(
          android ? t('Todos los emuladores están ocupados por otro QA') : t('Todos los simuladores están ocupados por otro QA'),
          t('No puedes probar este trabajo hasta que otro QA termine'),
          'open-workspace',
          t('{device} lo usa {branch}', { device: list[0]!.name, branch })
        )
      }
    }
    const shots = shotsDir(id)
    await mkdir(shots, { recursive: true })
    const config = join(qaDir(), `${id}.mcp.json`)
    await writeFile(config, JSON.stringify(mcpConfig(target.platform, shots), null, 2) + '\n')
    const prompt = await qaPrompt(target, device, ws.path, ws.branch, ws.baseCommit, shots, id, request)
    const pane = await splitCommand(id, join(ws.path, target.dir), agentArgv({ hooks: false, mcpConfig: config, prompt }), run)
    await writeFile(paneFile(id), pane + '\n')
    return { ok: true }
  } catch (err) {
    return { error: (err as Error).message }
  } finally {
    starting.delete(id)
  }
}

/** W125: «Ver el otro QA» opens the workspace whose live QA holds the first of the person's devices. */
export async function deviceHolder(id: string, run: Runner): Promise<string | null> {
  const listed = await qaTargets(id)
  const target = listed?.targets.find((x) => x.key === listed.chosen)
  if (!target || (target.platform !== 'android' && target.platform !== 'ios')) return null
  const list = await listDevices(target.platform, target.platform === 'android' ? await which('emulator', run) : null, run)
  const held = await readHolds()
  for (const d of list) {
    const by = held[d.id]
    if (by && by !== id && /^[\w-]+$/.test(by) && (await qaLive(by, run))) return by
  }
  return null
}

/** Kills only the QA pane and frees its device; its MCP file and screenshots stay. */
export async function stopQa(id: string, run: Runner): Promise<QaResult> {
  // The id names files under qa/: only a recorded workspace's id gets that far.
  if (!(await readRecords()).some((r) => r.id === id)) return { error: t('Ese trabajo ya no existe') }
  const pane = (await text(paneFile(id)))?.trim()
  if (pane && (await hasPane(id, pane, run))) await killPane(pane, run)
  await rm(paneFile(id), { force: true })
  await release(id)
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
