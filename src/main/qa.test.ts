import { existsSync, mkdirSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resourcesDir } from './paths'
import { detectQa, launchQa, qaLive, qaStatus, stopQa } from './qa'
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

  it('live qa starts one scoped agent with its tools', async () => {
    const web = project({ 'package.json': pkg({ scripts: ['dev'] }), 'pnpm-lock.yaml': '', '.agents/changes/add-cart/proposal.md': '# add-cart' })
    const android = project({ 'settings.gradle': '', 'app/src/main/AndroidManifest.xml': '<manifest/>' })
    const expo = project({ 'app.json': '{}', 'package.json': pkg({ deps: ['expo'] }) })
    const plain = project({ 'README.md': 'hi' })
    const rec = (id: string, path: string) => ({ id, repoId: 'demo', branch: `feat/${id}`, mode: 'worktree', path, baseCommit: 'abc123', agent: 'claude', session: `atril-${id}`, paneId: '%1' })
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [rec('webqa001', web), rec('andqa001', android), rec('expqa001', expo), rec('plnqa001', plain)] }))

    const splits: string[][] = []
    const kills: string[] = []
    let panes = ['%1']
    let missing = new Set<string>()
    const fake: Runner = async (cmd, args) => {
      if (missing.has(cmd)) return { code: 127, stdout: '', stderr: `spawn ${cmd} ENOENT` }
      if (cmd === 'tmux' && args.includes('split-window')) {
        splits.push(args)
        await new Promise((r) => setTimeout(r, 5))
        panes.push(`%${40 + splits.length}`)
        return { code: 0, stdout: `%${40 + splits.length}\n`, stderr: '' }
      }
      if (cmd === 'tmux' && args.includes('list-panes')) return { code: 0, stdout: panes.join('\n') + '\n', stderr: '' }
      if (cmd === 'tmux' && args.includes('kill-pane')) {
        kills.push(args.at(-1)!)
        panes = panes.filter((p) => p !== args.at(-1))
        return { code: 0, stdout: '', stderr: '' }
      }
      return { code: 0, stdout: 'v1\n', stderr: '' }
    }
    const qa = join(home, 'qa')
    const mcpFile = join(qa, 'webqa001.mcp.json')
    const shots = join(qa, 'webqa001')

    // Case: an unclassified workspace starts nothing.
    expect(await launchQa('plnqa001', fake)).toHaveProperty('error')

    // Case: a missing tool starts nothing and every missing one is named.
    missing = new Set(['adb', 'emulator', 'node'])
    const refused = await launchQa('andqa001', fake)
    expect('error' in refused && refused.error).toMatch(/node.*adb.*emulator|node, adb, emulator/)
    missing = new Set(['adb', 'xcrun'])
    const noMobile = await launchQa('expqa001', fake)
    expect('error' in noMobile && noMobile.error).toMatch(/adb.*xcrun/)
    // expo needs one mobile tool, not both
    missing = new Set(['adb'])
    expect(await launchQa('expqa001', fake)).toEqual({ ok: true })
    expect(JSON.parse(readFileSync(join(qa, 'expqa001.mcp.json'), 'utf8'))).toEqual({ mcpServers: { 'mobile-mcp': { command: 'npx', args: ['-y', '@mobilenext/mobile-mcp@1.0.16'] } } })
    expect(splits).toHaveLength(1)
    expect(existsSync(join(qa, 'andqa001.mcp.json'))).toBe(false)
    missing = new Set()

    // Case: the MCP file, the split with claude, the prompt; two presses at once start one.
    const both = await Promise.all([launchQa('webqa001', fake), launchQa('webqa001', fake)])
    expect(both.filter((r) => 'ok' in r)).toHaveLength(1)
    expect(both.filter((r) => 'error' in r)).toHaveLength(1)
    expect(JSON.parse(readFileSync(mcpFile, 'utf8'))).toEqual({
      mcpServers: { playwright: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.84', '--isolated', '--output-dir', shots] } }
    })
    expect(existsSync(shots)).toBe(true)
    expect(splits).toHaveLength(2)
    const split = splits[1]!
    const at = split.indexOf('#{pane_id}') + 1
    expect(split.slice(0, at)).toEqual(['split-window', '-h', '-t', '=atril-webqa001:', '-c', web, '-P', '-F', '#{pane_id}'])
    const argv = split.slice(at)
    const prompt = argv.at(-1)!
    expect(argv).toEqual(['claude', '--plugin-dir', join(resourcesDir(), 'libretto'), '--mcp-config', mcpFile, '--strict-mcp-config', prompt])
    for (const part of ['web', 'pnpm run dev', join(web, '.agents', 'changes', 'add-cart', 'proposal.md'), shots]) expect(prompt).toContain(part)
    expect(readFileSync(join(qa, 'webqa001.pane'), 'utf8').trim()).toBe('%42')
    expect(await qaLive('webqa001', fake)).toBe(true)

    // Case: a second press while the pane lives is refused.
    expect(await launchQa('webqa001', fake)).toHaveProperty('error')
    expect(splits).toHaveLength(2)

    // Case: a pane closed by hand is noticed on the next query.
    panes = panes.filter((p) => p !== '%42')
    expect(await qaLive('webqa001', fake)).toBe(false)
    expect(await launchQa('webqa001', fake)).toEqual({ ok: true })
    expect(splits).toHaveLength(3)

    // Case: «Detener QA» kills only that pane; the MCP file and the screenshots stay.
    writeFileSync(join(shots, 'a.png'), 'png')
    expect(await stopQa('webqa001', fake)).toEqual({ ok: true })
    expect(kills).toEqual(['%43'])
    expect(await qaLive('webqa001', fake)).toBe(false)
    expect(existsSync(mcpFile)).toBe(true)
    expect(existsSync(join(shots, 'a.png'))).toBe(true)
    expect(panes).toContain('%1')

    // Case: with no open change the prompt names the branch and its base.
    const noChange = project({ 'package.json': pkg({ scripts: ['start'] }) })
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [rec('nchqa001', noChange)] }))
    expect(await launchQa('nchqa001', fake)).toEqual({ ok: true })
    const mobileless = splits.at(-1)!.at(-1)!
    for (const part of ['feat/nchqa001', 'abc123', 'npm run start']) expect(mobileless).toContain(part)
  })
  it('qa status sends the newest screenshots as data urls', async () => {
    const web = project({ 'package.json': pkg({ scripts: ['dev'] }) })
    const plain = project({})
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [{ id: 'stqa0001', path: web }, { id: 'stqa0002', path: plain }] }))
    const none: Runner = async () => ({ code: 1, stdout: '', stderr: '' })
    expect(await qaStatus('stqa0002', none)).toBeNull()
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
    expect(s?.kind).toBe('web')
    expect(s?.live).toBe(false)
    expect(s?.shots.map((x) => x.name)).toEqual(['s13.png', 's12.png', 's11.png', 's10.png', 's9.png', 's8.png', 's7.png', 's6.png', 's5.png', 's4.png', 's3.png', 's2.png'])
    expect(s?.shots[0]?.src).toBe(`data:image/png;base64,${Buffer.from('png13').toString('base64')}`)
  })
})
