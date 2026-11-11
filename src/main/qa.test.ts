import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resourcesDir } from './paths'
import { detectQa, launchQa, qaLive, qaStatus, stopQa } from './qa'
import { runFix } from './qa-fix'
import type { Runner } from './run'
import { cleanTmp, tmp } from './test-helpers'

/** A temp folder holding exactly these files; a value of null makes a directory. */
function project(files: Record<string, string | null>): string {
  const root = tmp()
  for (const [name, body] of Object.entries(files)) {
    const p = join(root, name)
    if (body === null) mkdirSync(p, { recursive: true })
    else {
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, body)
    }
  }
  return root
}
const pkg = (o: { deps?: string[]; scripts?: string[] }): string =>
  JSON.stringify({ dependencies: Object.fromEntries((o.deps ?? []).map((d) => [d, '1.0.0'])), scripts: Object.fromEntries((o.scripts ?? []).map((s) => [s, 'x'])) })

afterEach(cleanTmp)

describe('detectQa', () => {
  it('projects are classified by their files', async () => {
    const cases: Array<[Record<string, string | null>, string | null, string?]> = [
      // expo wins over react-native and web, by app.json or app.config.*
      [{ 'app.json': '{}', 'package.json': pkg({ deps: ['expo', 'react-native'], scripts: ['start'] }), 'ios/': null }, 'expo', 'npx expo start'],
      [{ 'app.config.ts': 'export default {}', 'package.json': pkg({ deps: ['expo'] }) }, 'expo'],
      // an expo dependency without its config file is not expo
      [{ 'package.json': pkg({ deps: ['expo'] }) }, null],
      [{ 'package.json': pkg({ deps: ['react-native'], scripts: ['start'] }), 'android/': null }, 'react-native', 'npx react-native run-ios / npx react-native run-android'],
      [{ 'package.json': pkg({ deps: ['react-native'] }), 'ios/': null }, 'react-native'],
      // react-native without a native folder falls through to web
      [{ 'package.json': pkg({ deps: ['react-native'], scripts: ['dev'] }) }, 'web', 'npm run dev'],
      [{ 'pubspec.yaml': 'name: app\nflutter:\n  uses-material-design: true\n' }, 'flutter', 'flutter run'],
      [{ 'pubspec.yaml': 'name: pure_dart\n' }, null],
      [{ 'settings.gradle.kts': '', 'app/src/main/AndroidManifest.xml': '<manifest/>' }, 'android', './gradlew installDebug'],
      [{ 'settings.gradle': '' }, null],
      [{ 'Shop.xcodeproj/': null }, 'ios', 'xcodebuild -scheme <scheme> -destination "platform=iOS Simulator,name=<simulator>"'],
      [{ 'Shop.xcworkspace/': null }, 'ios'],
      [{ 'Package.swift': 'platforms: [.iOS(.v17)]' }, 'ios'],
      [{ 'Package.swift': 'platforms: [.macOS(.v14)]' }, null],
      // web: dev, else start, else preview; the repo's own package manager
      [{ 'package.json': pkg({ scripts: ['preview', 'start', 'dev'] }), 'pnpm-lock.yaml': '' }, 'web', 'pnpm run dev'],
      [{ 'package.json': pkg({ scripts: ['preview', 'start'] }), 'yarn.lock': '' }, 'web', 'yarn run start'],
      [{ 'package.json': pkg({ scripts: ['preview', 'build'] }) }, 'web', 'npm run preview'],
      [{ 'package.json': pkg({ scripts: ['build', 'test'] }) }, null],
      [{ 'package.json': '{ not json' }, null],
      [{}, null]
    ]
    for (const [files, kind, command] of cases) {
      const got = await detectQa(project(files))
      expect({ files: Object.keys(files), kind: got?.kind ?? null }).toEqual({ files: Object.keys(files), kind })
      if (command) expect(got?.command).toBe(command)
    }
  })
})

describe('launchQa', () => {
  let home: string
  beforeEach(() => {
    home = tmp()
    process.env['ATRIL_HOME'] = home
  })
  afterEach(() => {
    delete process.env['ATRIL_HOME']
  })

  const rec = (id: string, path: string, repoId = 'demo') => ({ id, repoId, branch: `feat/${id}`, mode: 'worktree', path, baseCommit: 'abc123', agent: 'claude', session: `atril-${id}`, paneId: '%1' })
  const seed = (...records: ReturnType<typeof rec>[]): void => writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: records }))
  const SIMS = JSON.stringify({
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [
        { name: 'iPad Pro 13-inch (M4)', udid: 'IPAD-1', isAvailable: true },
        { name: 'iPhone 17', udid: 'UDID-17', isAvailable: true },
        { name: 'iPhone 17 Pro', udid: 'UDID-17P', isAvailable: true }
      ],
      'com.apple.CoreSimulator.SimRuntime.watchOS-26-0': [{ name: 'Apple Watch', udid: 'W-1', isAvailable: true }]
    }
  })

  /** A fake tmux with the workspace pane %1, the person's devices, and every tool answering unless `missing` names it. */
  function fake() {
    const f = {
      splits: [] as string[][],
      kills: [] as string[],
      panes: ['%1'],
      missing: new Set<string>(),
      avds: 'Pixel_8\n',
      sims: SIMS,
      calls: [] as string[][],
      run: undefined as unknown as Runner
    }
    f.run = async (cmd, args) => {
      f.calls.push([cmd, ...args])
      if (f.missing.has(cmd) || (cmd === 'xcrun' && args[1] === 'mcpbridge' && f.missing.has('mcpbridge'))) return { code: 127, stdout: '', stderr: `spawn ${cmd} ENOENT` }
      if (cmd === 'tmux' && args.includes('split-window')) {
        f.splits.push(args)
        await new Promise((r) => setTimeout(r, 5))
        const pane = `%${40 + f.splits.length}`
        f.panes.push(pane)
        return { code: 0, stdout: `${pane}\n`, stderr: '' }
      }
      if (cmd === 'tmux' && args.includes('list-panes')) return { code: 0, stdout: f.panes.join('\n') + '\n', stderr: '' }
      if (cmd === 'tmux' && args.includes('kill-pane')) {
        f.kills.push(args.at(-1)!)
        f.panes = f.panes.filter((p) => p !== args.at(-1))
        return { code: 0, stdout: '', stderr: '' }
      }
      if (cmd === 'emulator' && args[0] === '-list-avds') return { code: 0, stdout: f.avds, stderr: '' }
      if (cmd === 'xcrun' && args[0] === 'simctl') return { code: 0, stdout: f.sims, stderr: '' }
      return { code: 0, stdout: 'v1\n', stderr: '' }
    }
    return f
  }
  const promptOf = (split: string[]): string => split.at(-1)!
  const mcpOf = (id: string): unknown => JSON.parse(readFileSync(join(home, 'qa', `${id}.mcp.json`), 'utf8'))
  const devices = (): unknown => JSON.parse(readFileSync(join(home, 'qa', 'devices.json'), 'utf8'))
  const playwright = (browser: string, shots: string) => ({ mcpServers: { playwright: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.84', '--browser', browser, '--isolated', '--output-dir', shots] } } })
  const mobile = { command: 'npx', args: ['-y', '@mobilenext/mobile-mcp@1.0.16'] }
  const android = (): string => project({ 'settings.gradle': '', 'app/src/main/AndroidManifest.xml': '<manifest/>' })
  const ios = (): string => project({ 'Shop.xcodeproj/': null })

  it('live qa starts one scoped agent with its tools', async () => {
    const web = project({ 'package.json': pkg({ scripts: ['dev'] }), 'pnpm-lock.yaml': '', '.agents/changes/add-cart/proposal.md': '# add-cart' })
    const mono = project({ 'apps/web/package.json': pkg({ scripts: ['dev'] }), 'apps/mobile/settings.gradle': '', 'apps/mobile/app/src/main/AndroidManifest.xml': '<manifest/>' })
    seed(rec('webqa001', web), rec('andqa001', android()), rec('iosqa001', ios()), rec('monqa001', mono, 'mono'))
    const f = fake()
    const qa = join(home, 'qa')
    const mcpFile = join(qa, 'webqa001.mcp.json')
    const shots = join(qa, 'webqa001')

    // Case: chrome, the first target: Playwright on Chrome; the split with claude and the prompt; two presses at once start one.
    const both = await Promise.all([launchQa('webqa001', f.run), launchQa('webqa001', f.run)])
    expect(both.filter((r) => 'ok' in r)).toHaveLength(1)
    expect(both.filter((r) => 'error' in r)).toHaveLength(1)
    expect(mcpOf('webqa001')).toEqual(playwright('chrome', shots))
    expect(existsSync(shots)).toBe(true)
    expect(f.splits).toHaveLength(1)
    const split = f.splits[0]!
    const at = split.indexOf('#{pane_id}') + 1
    expect(split.slice(0, at)).toEqual(['split-window', '-h', '-t', '=atril-webqa001:', '-c', web, '-P', '-F', '#{pane_id}'])
    const argv = split.slice(at)
    const prompt = promptOf(split)
    expect(argv).toEqual(['claude', '--plugin-dir', join(resourcesDir(), 'libretto'), '--mcp-config', mcpFile, '--strict-mcp-config', prompt])
    for (const part of ['Chrome', 'pnpm run dev', join(web, '.agents', 'changes', 'add-cart', 'proposal.md'), shots]) expect(prompt).toContain(part)
    expect(readFileSync(join(qa, 'webqa001.pane'), 'utf8').trim()).toBe('%41')
    expect(await qaLive('webqa001', f.run)).toBe(true)

    // Case: a second press while the pane lives is refused.
    expect(await launchQa('webqa001', f.run)).toHaveProperty('error')
    expect(f.splits).toHaveLength(1)

    // Case: a pane closed by hand is noticed on the next query; safari, by its key: Playwright on WebKit.
    f.panes = f.panes.filter((p) => p !== '%41')
    expect(await qaLive('webqa001', f.run)).toBe(false)
    expect(await launchQa('webqa001', f.run, undefined, 'safari:')).toEqual({ ok: true })
    expect(mcpOf('webqa001')).toEqual(playwright('webkit', shots))
    expect(promptOf(f.splits[1]!)).toContain('Safari')

    // Case: «Detener QA» kills only that pane; the MCP file and the screenshots stay.
    writeFileSync(join(shots, 'a.png'), 'png')
    expect(await stopQa('webqa001', f.run)).toEqual({ ok: true })
    expect(f.kills).toEqual(['%42'])
    expect(await qaLive('webqa001', f.run)).toBe(false)
    expect(existsSync(mcpFile)).toBe(true)
    expect(existsSync(join(shots, 'a.png'))).toBe(true)
    expect(f.panes).toContain('%1')

    // Case: android, mobile-mcp, and the reserved device named in the prompt.
    expect(await launchQa('andqa001', f.run)).toEqual({ ok: true })
    expect(mcpOf('andqa001')).toEqual({ mcpServers: { 'mobile-mcp': mobile } })
    for (const part of ['Android', './gradlew installDebug', 'Pixel_8', 'emulator -avd Pixel_8', join(qa, 'andqa001')]) expect(promptOf(f.splits.at(-1)!)).toContain(part)

    // Case: ios, Xcode's own MCP and mobile-mcp, and the reserved simulator.
    expect(await launchQa('iosqa001', f.run)).toEqual({ ok: true })
    expect(mcpOf('iosqa001')).toEqual({ mcpServers: { xcode: { command: 'xcrun', args: ['mcpbridge'] }, 'mobile-mcp': mobile } })
    for (const part of ['iOS', 'xcodebuild', 'iPhone 17', 'xcrun simctl boot UDID-17']) expect(promptOf(f.splits.at(-1)!)).toContain(part)

    // Case: «Detener QA» frees the device.
    expect(devices()).toEqual({ Pixel_8: 'andqa001', 'UDID-17': 'iosqa001' })
    expect(await stopQa('andqa001', f.run)).toEqual({ ok: true })
    expect(devices()).toEqual({ 'UDID-17': 'iosqa001' })

    // Case: the agent starts in the target's folder.
    expect(await launchQa('monqa001', f.run, undefined, 'chrome:apps/web')).toEqual({ ok: true })
    expect(f.splits.at(-1)!.slice(4, 6)).toEqual(['-c', join(mono, 'apps/web')])
    expect(await launchQa('monqa001', f.run, undefined, 'ios:nowhere')).toHaveProperty('error')

    // Case: with no open change the prompt names the branch and its base.
    const noChange = project({ 'package.json': pkg({ scripts: ['start'] }) })
    seed(rec('nchqa001', noChange))
    expect(await launchQa('nchqa001', f.run)).toEqual({ ok: true })
    for (const part of ['feat/nchqa001', 'abc123', 'npm run start']) expect(promptOf(f.splits.at(-1)!)).toContain(part)
  })

  it('each live qa gets its own device', async () => {
    seed(rec('dev00001', android()), rec('dev00002', android()), rec('dev00003', android()), rec('dev00004', android()), rec('ios00001', ios()), rec('ios00002', ios()))
    const f = fake()
    f.avds = 'Pixel_8\nPixel_9\n'
    const deviceIn = (): string => promptOf(f.splits.at(-1)!)

    // The first free device of the person's list, written down for the workspace.
    expect(await launchQa('dev00001', f.run)).toEqual({ ok: true })
    expect(deviceIn()).toContain('emulator -avd Pixel_8')
    expect(await launchQa('dev00002', f.run)).toEqual({ ok: true })
    expect(deviceIn()).toContain('emulator -avd Pixel_9')
    expect(deviceIn()).not.toContain('Pixel_8')
    expect(devices()).toEqual({ Pixel_8: 'dev00001', Pixel_9: 'dev00002' })

    // A hold whose pane no longer lives counts as free.
    f.panes = f.panes.filter((p) => p !== '%42')
    expect(await launchQa('dev00003', f.run)).toEqual({ ok: true })
    expect(deviceIn()).toContain('emulator -avd Pixel_9')
    expect(devices()).toEqual({ Pixel_8: 'dev00001', Pixel_9: 'dev00003' })

    // Every device held by a live QA: nothing starts.
    const splits = f.splits.length
    expect(await launchQa('dev00004', f.run)).toHaveProperty('error')
    expect(f.splits).toHaveLength(splits)

    // iPhone simulators only, by udid.
    expect(await launchQa('ios00001', f.run)).toEqual({ ok: true })
    expect(deviceIn()).toContain('xcrun simctl boot UDID-17')
    expect(await launchQa('ios00002', f.run)).toEqual({ ok: true })
    expect(deviceIn()).toContain('xcrun simctl boot UDID-17P')

    // Two workspaces launching at once with one free device: one gets it, the other is told every device is held.
    await stopQa('dev00001', f.run)
    await stopQa('dev00003', f.run)
    f.avds = 'Pixel_8\n'
    const race = await Promise.all([launchQa('dev00002', f.run), launchQa('dev00004', f.run)])
    expect(race.filter((r) => 'ok' in r)).toHaveLength(1)
    const lost = race.find((r) => 'error' in r)!
    expect('error' in lost && lost.error).toBe('Todos los emuladores están ocupados por otro QA')
    const winner = race[0] && 'ok' in race[0] ? 'dev00002' : 'dev00004'
    expect(devices()).toEqual({ Pixel_8: winner, 'UDID-17': 'ios00001', 'UDID-17P': 'ios00002' })

    // A browser QA frees whatever device its workspace still held from an earlier mobile run.
    const web = rec('web00001', project({ 'package.json': pkg({ scripts: ['dev'] }) }))
    seed(rec('dev00002', android()), rec('dev00004', android()), rec('ios00001', ios()), rec('ios00002', ios()), web)
    writeFileSync(join(home, 'qa', 'devices.json'), JSON.stringify({ ...(devices() as Record<string, string>), Pixel_8: 'web00001' }))
    expect(await launchQa('web00001', f.run)).toEqual({ ok: true })
    expect(devices()).not.toHaveProperty('Pixel_8')
  })
  it('every launch problem comes with its fix', async () => {
    // No SDK anywhere: this machine's own ~/Library/Android/sdk must not count.
    const realHome = process.env['HOME']
    process.env['HOME'] = mkdtempSync(join(tmpdir(), 'atril-nohome-'))
    const sdkEnv = [process.env['ANDROID_HOME'], process.env['ANDROID_SDK_ROOT']]
    delete process.env['ANDROID_HOME']
    delete process.env['ANDROID_SDK_ROOT']
    try {
      seed(rec('prb00001', project({ 'README.md': 'x' })), rec('prb00002', android()), rec('prb00003', ios()), rec('prb00004', android()), rec('prb00005', project({ 'package.json': pkg({ scripts: ['dev'] }) })))
      const f = fake()
      const problem = async (id: string): Promise<unknown> => {
        const r = await launchQa(id, f.run)
        expect(r).toHaveProperty('error')
        return 'problem' in r ? r.problem : null
      }
      const PICK = 'Busqué package.json con dev, start o preview, app.json de Expo, pubspec.yaml, settings.gradle, .xcodeproj o Package.swift, en la raíz y dos niveles'

      // No target: «Elegir a mano», which the window handles alone.
      expect(await problem('prb00001')).toEqual({ what: 'No sé cómo abrir este proyecto', cant: 'No puedes probarlo en vivo hasta que elijas cómo abrirlo', fix: 'pick-manual', detail: PICK })

      // No node comes first, and every missing tool is named in the detail.
      f.missing = new Set(['node', 'adb', 'emulator'])
      expect(await problem('prb00002')).toEqual({ what: 'Falta Node', cant: 'No puedes probar en vivo: las herramientas de QA corren con Node', fix: 'install-node', detail: 'Falta: node, adb, emulator' })
      f.missing = new Set(['node'])
      expect(await problem('prb00005')).toMatchObject({ fix: 'install-node', detail: 'Falta: node' })

      // Android: no adb or emulator, then no AVD.
      f.missing = new Set(['emulator'])
      expect(await problem('prb00002')).toEqual({ what: 'Falta el SDK de Android', cant: 'No puedes probar en Android', fix: 'install-android-studio', detail: 'Falta: emulator' })
      f.missing = new Set()
      f.avds = ''
      expect(await problem('prb00002')).toEqual({ what: 'No tienes ningún emulador de Android', cant: 'No puedes probar en Android hasta que crees uno', fix: 'create-avd', detail: 'emulator -list-avds no devolvió ninguno' })

      // iOS: no xcrun or no mcpbridge, then no iPhone simulator.
      f.missing = new Set(['xcrun'])
      expect(await problem('prb00003')).toEqual({ what: 'Tu Xcode no trae su MCP', cant: 'No puedes probar en iOS: hace falta Xcode 26.3 o posterior', fix: 'update-xcode', detail: 'Falta: xcrun' })
      f.missing = new Set(['mcpbridge'])
      expect(await problem('prb00003')).toMatchObject({ fix: 'update-xcode', detail: 'Falta: mcpbridge' })
      f.missing = new Set()
      f.sims = JSON.stringify({ devices: { 'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [{ name: 'iPad Air', udid: 'IPAD-2' }] } })
      expect(await problem('prb00003')).toEqual({ what: 'No hay ningún simulador de iPhone', cant: 'No puedes probar en iOS hasta que tengas uno', fix: 'open-xcode', detail: 'xcrun simctl list devices available no trajo ningún iPhone' })

      // Every device held: «Ver el otro QA».
      f.avds = 'Pixel_8\n'
      expect(await launchQa('prb00004', f.run)).toEqual({ ok: true })
      expect(await problem('prb00002')).toEqual({ what: 'Todos los emuladores están ocupados por otro QA', cant: 'No puedes probar este trabajo hasta que otro QA termine', fix: 'open-workspace', detail: 'Pixel_8 lo usa feat/prb00004' })

      // A chosen target whose folder is not in this worktree: «Elegir a mano», never tmux's own error.
      writeFileSync(join(home, 'qa-targets.json'), JSON.stringify({ gone: { chosen: 'chrome:apps/gone', manual: [{ key: 'chrome:apps/gone', platform: 'chrome', dir: 'apps/gone', command: 'pnpm dev', why: 'Lo elegiste a mano', source: 'manual' }] } }))
      seed(rec('prb00001', project({ 'README.md': 'x' })), rec('prb00002', android()), rec('prb00003', ios()), rec('prb00004', android()), rec('prb00005', project({ 'package.json': pkg({ scripts: ['dev'] }) })), rec('prb00006', project({ 'README.md': 'x' }), 'gone'))
      expect(await problem('prb00006')).toMatchObject({ fix: 'pick-manual' })

      // Nothing started for any problem: the one split is prb00004's.
      expect(f.splits).toHaveLength(1)
      expect(existsSync(join(home, 'qa', 'prb00002.mcp.json'))).toBe(false)

      // The fixes: main knows each name and does the fixed thing; the window only sends the name.
      const opened: string[] = []
      const deps = { run: f.run, open: async (url: string) => void opened.push(url) }
      const terminal = (): string[] => f.calls.filter((c) => c[0] === 'osascript').map((c) => c.at(-1)!)
      expect(await runFix('prb00002', 'install-node', deps)).toEqual({ ok: true })
      expect(terminal().at(-1)).toBe('tell application "Terminal" to do script "brew install node"')
      expect(await runFix('prb00002', 'create-avd', deps)).toEqual({ ok: true })
      expect(terminal().at(-1)).toBe(
        'tell application "Terminal" to do script "sdkmanager \\"system-images;android-35;google_apis;arm64-v8a\\" && avdmanager create avd -n Pixel_8 -k \\"system-images;android-35;google_apis;arm64-v8a\\" -d pixel_8"'
      )
      expect(await runFix('prb00002', 'install-android-studio', deps)).toEqual({ ok: true })
      expect(await runFix('prb00003', 'update-xcode', deps)).toEqual({ ok: true })
      expect(opened).toEqual(['https://developer.android.com/studio', 'macappstore://apps.apple.com/app/id497799835'])
      expect(await runFix('prb00003', 'open-xcode', deps)).toEqual({ ok: true })
      expect(f.calls.at(-1)).toEqual(['open', '-a', 'Xcode'])
      expect(await runFix('prb00002', 'open-workspace', deps)).toEqual({ ok: true, open: 'prb00004' })

      // A name main does not know is refused, «Elegir a mano» included, and so is a workspace that is not there.
      const calls = f.calls.length
      for (const name of ['pick-manual', 'rm -rf /', 'https://evil.example', '', 42, null]) expect(await runFix('prb00002', name, deps)).toHaveProperty('error')
      expect(await runFix('nobody00', 'install-node', deps)).toHaveProperty('error')
      expect(f.calls).toHaveLength(calls)
      expect(opened).toHaveLength(2)
    } finally {
      process.env['HOME'] = realHome
      if (sdkEnv[0]) process.env['ANDROID_HOME'] = sdkEnv[0]
      if (sdkEnv[1]) process.env['ANDROID_SDK_ROOT'] = sdkEnv[1]
    }
  })
  it('qa status sends the newest screenshots as data urls', async () => {
    const web = project({ 'package.json': pkg({ scripts: ['dev'] }) })
    const plain = project({})
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [rec('stqa0001', web), rec('stqa0002', plain)] }))
    const none: Runner = async () => ({ code: 1, stdout: '', stderr: '' })
    expect(await qaStatus('stqa0002', none)).toEqual({ target: null, live: false, shots: [] })
    expect(await qaStatus('nobody00', none)).toBeNull()

    const dir = join(home, 'qa', 'stqa0001')
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < 14; i++) {
      writeFileSync(join(dir, `s${i}.png`), `png${i}`)
      utimesSync(join(dir, `s${i}.png`), 1000 + i, 1000 + i)
    }
    writeFileSync(join(dir, 'big.png'), Buffer.alloc(2 * 1024 * 1024 + 1))
    utimesSync(join(dir, 'big.png'), 5000, 5000)
    writeFileSync(join(dir, 'notes.txt'), 'x')
    symlinkSync(join(web, 'package.json'), join(dir, 'link.png'))

    const s = await qaStatus('stqa0001', none)
    expect(s?.target?.key).toBe('chrome:')
    expect(s?.live).toBe(false)
    expect(s?.shots.map((x) => x.name)).toEqual(['s13.png', 's12.png', 's11.png', 's10.png', 's9.png', 's8.png', 's7.png', 's6.png', 's5.png', 's4.png', 's3.png', 's2.png'])
    expect(s?.shots[0]?.src).toBe(`data:image/png;base64,${Buffer.from('png13').toString('base64')}`)
  })
})
