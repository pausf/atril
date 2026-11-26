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
  if (pkg && 'expo' in pkg.deps && expo) return { kind: 'expo', command: 'npx expo start', why: t('There is an Expo {file}', { file: expo }) }
  if (pkg && 'react-native' in pkg.deps && (has('ios') || has('android')))
    return { kind: 'react-native', command: 'npx react-native run-ios / npx react-native run-android', why: t('There is a package.json with react-native') }
  if (has('pubspec.yaml') && /^flutter:/m.test((await text(join(path, 'pubspec.yaml'))) ?? '')) return { kind: 'flutter', command: 'flutter run', why: t('There is a Flutter pubspec.yaml') }
  const gradle = names.find((n) => n.startsWith('settings.gradle'))
  if (gradle && (await exists(join(path, 'app', 'src', 'main', 'AndroidManifest.xml'))))
    return { kind: 'android', command: './gradlew installDebug', why: t('There is a {file} with an Android app', { file: gradle }) }
  const xcode = names.find((n) => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace')) ?? (((await text(join(path, 'Package.swift'))) ?? '').includes('.iOS(') ? 'Package.swift' : null)
  if (xcode) return { kind: 'ios', command: 'xcodebuild -scheme <scheme> -destination "platform=iOS Simulator,name=<simulator>"', why: t('There is an iOS {file}', { file: xcode }) }
  const script = ['dev', 'start', 'preview'].find((s) => pkg && s in pkg.scripts)
  if (script) {
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : 'npm'
    return { kind: 'web', command: `${pm} run ${script}`, why: t('There is a package.json with the {script} script', { script }) }
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

const REPORT_SHAPE = '{"criteria":[{"id":"W1","status":"pass","note":"one sentence","steps":[{"text":"what you did","ms":1200,"shot":"captura.png","view":"login"}]}]}'

/** W84, W119: the prompt names the platform, the device, the change, and asks for a report.json per criterion; `request` goes last (W116). */
export async function qaPrompt(target: QaTarget, device: QaDevice | null, path: string, branch: string, base: string, shots: string, id: string, request?: string): Promise<string> {
  const { change, criteria } = await readCriteria(path)
  const what = change
    ? t("what the change's spec in {proposal} promises", { proposal: join(path, '.agents', 'changes', change, 'proposal.md') })
    : t('what branch {branch} changes against its base ({base})', { branch, base })
  const vars = { platform: PLATFORM_LABEL[target.platform], command: target.command, target: what, shots }
  const intro = !device
    ? t("You are this workspace's QA on {platform}. Start the app with “{command}” on a free port, open it with Playwright's browser and go through {target}. Save a screenshot of every step in {shots} (no file name, Playwright leaves them there). Do not change code or commit; when done, sum up what works and what does not.", vars)
    : t("You are this workspace's QA on {platform}. Use only {device}, reserved for this workspace (the others belong to other QA runs); if it is not running, start it with “{boot}”. Start the app with “{command}” and go through {target} with {tools}. Save a PNG screenshot of every step in {shots} with mobile-mcp's screenshot tool. Do not change code or commit; when done, sum up what works and what does not.", {
        ...vars,
        device: device.name,
        boot: device.boot,
        tools: target.platform === 'ios' ? t("mobile-mcp and Xcode's MCP") : 'mobile-mcp'
      })
  const parts = [intro]
  if (criteria.length > 0) {
    parts.push(
      t('After each criterion, write the report to {report} and rewrite it whole every time, in this shape: {shape}. "status" is pass, fail or untested; "shot" is the name of a screenshot in {shots}, with no path; "view" names the screen the screenshot shows in lowercase letters, digits and hyphens, and the same screen always has the same name. The criteria:', {
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
  const detail = t('Missing: {tools}', { tools: missing.join(', ') })
  if (missing.includes('node')) return { problem: fail(t('Node is missing'), t('You cannot test live: the QA tools run on Node'), 'install-node', detail) }
  if (missing.length > 0 && target.platform === 'android') return { problem: fail(t('The Android SDK is missing'), t('You cannot test on Android'), 'install-android-studio', detail) }
  if (missing.length > 0) return { problem: fail(t('Your Xcode does not ship its MCP'), t('You cannot test on iOS: it needs Xcode 26.3 or later'), 'update-xcode', detail) }
  return { emulator }
}

/** `request`: W116's ask, appended to the prompt when a retest has to start QA. `key`: the target; the repo's chosen one when absent. */
export async function launchQa(id: string, run: Runner, request?: string, key?: string): Promise<QaLaunchResult> {
  const ws = (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
  if (!ws) return { error: t('That work no longer exists') }
  const listed = await qaTargets(id)
  const target = listed?.targets.find((x) => x.key === (key ?? listed.chosen))
  if (!target && key !== undefined) return { error: t('That target does not exist') }
  if (!target)
    return fail(
      t('I do not know how to open this project'),
      t('You cannot test it live until you choose how to open it'),
      'pick-manual',
      t("I looked for package.json with dev, start or preview, Expo's app.json, pubspec.yaml, settings.gradle, .xcodeproj or Package.swift, at the root and two levels down")
    )
  if (starting.has(id)) return { error: t('A QA is already running in this work') }
  starting.add(id)
  try {
    if (await qaLive(id, run)) return { error: t('A QA is already running in this work') }
    const checked = await problemOf(target, run)
    if ('problem' in checked) return checked.problem
    if (!(await lstat(join(ws.path, target.dir)).then((st) => st.isDirectory(), () => false)))
      return fail(t('The folder {dir} does not exist in this workspace', { dir: target.dir }), t('You cannot test it live until you choose how to open it'), 'pick-manual', join(ws.path, target.dir))
    let device: QaDevice | null = null
    // A browser QA holds no device: one left from an earlier mobile run is freed here.
    if (target.platform !== 'android' && target.platform !== 'ios') await release(id)
    else {
      const android = target.platform === 'android'
      const list = await listDevices(target.platform, checked.emulator, run)
      if (list.length === 0)
        return android
          ? fail(t('You have no Android emulator'), t('You cannot test on Android until you create one'), 'create-avd', t('emulator -list-avds returned none'))
          : fail(t('There is no iPhone simulator'), t('You cannot test on iOS until you have one'), 'open-xcode', t('xcrun simctl list devices available listed no iPhone'))
      device = await reserve(id, list, run)
      if (!device) {
        const by = (await readHolds())[list[0]!.id]
        const branch = (await readRecords()).find((r) => r.id === by)?.branch ?? by ?? ''
        return fail(
          android ? t('Every emulator is in use by another QA') : t('Every simulator is in use by another QA'),
          t('You cannot test this workspace until another QA finishes'),
          'open-workspace',
          t('{branch} is using {device}', { device: list[0]!.name, branch })
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
  if (!(await readRecords()).some((r) => r.id === id)) return { error: t('That work no longer exists') }
  const pane = (await text(paneFile(id)))?.trim()
  if (pane && (await hasPane(id, pane, run))) await killPane(pane, run)
  await rm(paneFile(id), { force: true })
  await release(id)
  return { ok: true }
}

const MAX_SHOTS = 12
const MAX_BYTES = 2 * 1024 * 1024

/** F33: what the window shows; null for a workspace that is not in the list. */
export async function qaStatus(id: string, run: Runner): Promise<QaStatus | null> {
  const listed = await qaTargets(id)
  if (!listed) return null
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
  return { target: listed.targets.find((x) => x.key === listed.chosen) ?? null, live: await qaLive(id, run), shots }
}
