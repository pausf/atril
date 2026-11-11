import { mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addManual, chooseTarget, findTargets, qaTargets, removeManual } from './qa-targets'
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
const web = pkg({ scripts: ['dev'] })
const brief = (ts: Array<{ platform: string; dir: string; command: string; why: string; key: string; source: string }>) => ts.map((x) => [x.key, x.command, x.why, x.source])

let home: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

describe('qa targets', () => {
  it('targets come from the root and two levels down with their reason', async () => {
    const mono = project({
      'package.json': pkg({ scripts: ['build'] }),
      'apps/web/package.json': web,
      'apps/web/pnpm-lock.yaml': '',
      // a classified folder is never descended into
      'apps/web/sub/package.json': pkg({ scripts: ['start'] }),
      'apps/mobile/app.json': '{}',
      'apps/mobile/package.json': pkg({ deps: ['expo'] }),
      'native/package.json': pkg({ deps: ['react-native'] }),
      'native/android/': null,
      'flutter/pubspec.yaml': 'flutter:\n',
      'flutter/ios/': null,
      'shop/Shop.xcodeproj/': null,
      'droid/settings.gradle.kts': '',
      'droid/app/src/main/AndroidManifest.xml': '<manifest/>',
      // three levels down is out of reach
      'deep/a/b/package.json': web,
      // skipped folders
      'node_modules/x/package.json': web,
      'Pods/x/package.json': web,
      'build/package.json': web,
      'dist/package.json': web,
      'vendor/package.json': web,
      '.hidden/package.json': web
    })
    const { targets, note } = await findTargets(mono)
    expect(note).toBeNull()
    expect(targets.map((x) => [x.key, x.command, x.why, x.source])).toEqual([
      ['android:apps/mobile', 'npx expo start', 'Hay un app.json de Expo', 'detected'],
      ['ios:apps/mobile', 'npx expo start', 'Hay un app.json de Expo', 'detected'],
      ['chrome:apps/web', 'pnpm run dev', 'Hay un package.json con el script dev', 'detected'],
      ['safari:apps/web', 'pnpm run dev', 'Hay un package.json con el script dev', 'detected'],
      ['android:droid', './gradlew installDebug', 'Hay un settings.gradle.kts con una app Android', 'detected'],
      ['ios:flutter', 'flutter run', 'Hay un pubspec.yaml de Flutter', 'detected'],
      ['android:native', 'npx react-native run-ios / npx react-native run-android', 'Hay un package.json con react-native', 'detected'],
      ['ios:shop', 'xcodebuild -scheme <scheme> -destination "platform=iOS Simulator,name=<simulator>"', 'Hay un Shop.xcodeproj de iOS', 'detected']
    ])
    expect(targets.every((x) => x.key === `${x.platform}:${x.dir}`)).toBe(true)

    // A classified root is its own target and nothing under it is read: its android/ and ios/ belong to it.
    const rn = project({
      'package.json': pkg({ deps: ['react-native'], scripts: ['start'] }),
      'android/settings.gradle': '',
      'android/app/src/main/AndroidManifest.xml': '<manifest/>',
      'ios/App.xcodeproj/': null,
      'site/package.json': web
    })
    expect(brief((await findTargets(rn)).targets).map((x) => x[0])).toEqual(['android:', 'ios:'])

    // At most 200 folders are read: one past them is not found.
    const many: Record<string, string | null> = {}
    for (let i = 0; i < 205; i++) many[`f${String(i).padStart(3, '0')}/`] = null
    many['zz/package.json'] = web
    expect((await findTargets(project(many))).targets).toEqual([])
    // The root, 198 empty folders and zz make 200.
    for (let i = 198; i < 205; i++) delete many[`f${i}/`]
    expect((await findTargets(project(many))).targets.map((x) => x.key)).toEqual(['chrome:zz', 'safari:zz'])

    // A symlinked folder is not followed.
    const linked = project({ 'other/package.json': web })
    const host = project({ 'README.md': 'x' })
    symlinkSync(join(linked, 'other'), join(host, 'link'))
    expect((await findTargets(host)).targets).toEqual([])
  })

  it('qa.json replaces detection only with valid entries', async () => {
    const outside = project({ 'secret/': null })
    const root = project({
      'package.json': web,
      'apps/web/': null,
      'apps/ios/': null,
      '.atril/qa.json': JSON.stringify({
        targets: [
          { platform: 'safari', dir: 'apps/web', command: 'pnpm --filter web dev' },
          { platform: 'ios', dir: './apps/ios/', command: 'make run' },
          // the same platform and folder count once
          { platform: 'safari', dir: 'apps/web', command: 'again' },
          { platform: 'web', dir: 'apps/web', command: 'x' },
          { platform: 'chrome', dir: '../x', command: 'x' },
          { platform: 'chrome', dir: 'apps/../apps/web', command: 'x' },
          { platform: 'chrome', dir: '/tmp', command: 'x' },
          { platform: 'chrome', dir: 'apps/missing', command: 'x' },
          { platform: 'chrome', dir: 'apps/web', command: 'x'.repeat(201) },
          { platform: 'chrome', dir: 'apps/web', command: 42 },
          { platform: 'chrome', dir: 'escape', command: 'x' },
          'nonsense'
        ]
      })
    })
    symlinkSync(join(outside, 'secret'), join(root, 'escape'))
    const got = await findTargets(root)
    expect(got.note).toBeNull()
    expect(got.targets.map((x) => [x.key, x.command, x.why, x.source])).toEqual([
      ['ios:apps/ios', 'make run', 'Lo dice .atril/qa.json', 'file'],
      ['safari:apps/web', 'pnpm --filter web dev', 'Lo dice .atril/qa.json', 'file']
    ])

    // A file with nothing valid: the detected targets and W121's line.
    const NOTE = '.atril/qa.json no se entiende: uso lo que detecto'
    for (const body of ['{ nope', JSON.stringify({ targets: [{ platform: 'chrome', dir: '..', command: 'x' }] }), JSON.stringify({ other: 1 }), JSON.stringify({ targets: [] })]) {
      const r = project({ 'package.json': web, '.atril/qa.json': body })
      const g = await findTargets(r)
      expect([g.targets.map((x) => x.key), g.note]).toEqual([['chrome:', 'safari:'], NOTE])
    }
    // Too big, or a link, is not read.
    const big = project({ 'package.json': web, '.atril/qa.json': JSON.stringify({ targets: [{ platform: 'chrome', dir: '', command: 'x' }], pad: 'x'.repeat(70 * 1024) }) })
    expect((await findTargets(big)).note).toBe(NOTE)
    const target = project({ 'qa.json': JSON.stringify({ targets: [{ platform: 'chrome', dir: '', command: 'x' }] }) })
    const viaLink = project({ 'package.json': web, '.atril/': null })
    symlinkSync(join(target, 'qa.json'), join(viaLink, '.atril', 'qa.json'))
    expect((await findTargets(viaLink)).note).toBe(NOTE)
    // No file: no line.
    expect((await findTargets(project({ 'package.json': web }))).note).toBeNull()
  })

  it('manual targets are kept per repo and validated', async () => {
    const a = project({ 'package.json': web, 'apps/admin/': null })
    const b = project({ 'package.json': web, 'apps/admin/': null })
    const c = project({ 'package.json': web })
    const rec = (id: string, repoId: string, path: string, mode = 'worktree') => ({ id, repoId, branch: `feat/${id}`, mode, path, baseCommit: 'abc', agent: 'claude', session: `atril-${id}`, paneId: '%1' })
    writeFileSync(join(home, 'workspaces.json'), JSON.stringify({ workspaces: [rec('mana0001', 'shop', a), rec('mana0002', 'shop', b), rec('manc0001', 'ops', c), rec('manr0001', 'shop', a, 'review')] }))

    // Refused, each with a sentence saying why.
    const refuse = async (req: unknown): Promise<string> => {
      const r = await addManual('mana0001', req)
      return 'error' in r ? r.error : 'saved'
    }
    expect(await refuse({ platform: 'web', dir: '', command: 'x' })).toBe('La plataforma tiene que ser Chrome, Safari, Android o iOS')
    expect(await refuse({ platform: 'chrome', dir: '../x', command: 'x' })).toBe('La carpeta tiene que estar dentro del repo, sin «..»')
    expect(await refuse({ platform: 'chrome', dir: 'apps/nope', command: 'x' })).toBe('La carpeta apps/nope no existe en este trabajo')
    expect(await refuse({ platform: 'chrome', dir: '', command: '  ' })).toBe('Falta el comando')
    expect(await refuse(null)).toBe('La plataforma tiene que ser Chrome, Safari, Android o iOS')
    expect((await addManual('manr0001', { platform: 'chrome', dir: '', command: 'x' }))).toHaveProperty('error')
    expect(readdirSync(home)).not.toContain('qa-targets.json')

    // Saved after the detected ones, with its reason; every workspace of the repo sees it, another repo does not.
    const saved = await addManual('mana0001', { platform: 'safari', dir: 'apps/admin', command: 'pnpm --filter admin dev' })
    expect('targets' in saved && saved.targets.map((x) => x.key)).toEqual(['chrome:', 'safari:', 'safari:apps/admin'])
    for (const id of ['mana0001', 'mana0002']) {
      const got = (await qaTargets(id))!
      expect(got.targets.map((x) => [x.key, x.command, x.why, x.source])).toEqual([
        ['chrome:', 'npm run dev', 'Hay un package.json con el script dev', 'detected'],
        ['safari:', 'npm run dev', 'Hay un package.json con el script dev', 'detected'],
        ['safari:apps/admin', 'pnpm --filter admin dev', 'Lo elegiste a mano', 'manual']
      ])
    }
    expect((await qaTargets('manc0001'))!.targets.map((x) => x.key)).toEqual(['chrome:', 'safari:'])
    // Written whole: a temp file and a rename, nothing left behind.
    expect(JSON.parse(readFileSync(join(home, 'qa-targets.json'), 'utf8'))).toEqual({ shop: { manual: [{ platform: 'safari', dir: 'apps/admin', command: 'pnpm --filter admin dev' }] } })
    expect(readdirSync(home).filter((n) => n.includes('.tmp'))).toEqual([])

    // A hand-picked target on a detected one's platform and folder takes its place.
    await addManual('mana0001', { platform: 'chrome', dir: '', command: 'npm run dev -- --port 4000' })
    expect((await qaTargets('mana0001'))!.targets.map((x) => [x.key, x.source])).toEqual([['safari:', 'detected'], ['safari:apps/admin', 'manual'], ['chrome:', 'manual']])

    // The chosen target is the repo's, and the first one until something is chosen.
    expect((await qaTargets('mana0002'))!.chosen).toBe('safari:')
    await chooseTarget('mana0001', 'safari:apps/admin')
    expect((await qaTargets('mana0002'))!.chosen).toBe('safari:apps/admin')
    expect((await qaTargets('manc0001'))!.chosen).toBe('chrome:')

    // «Quitar» removes it; a choice that is gone falls back to the first.
    await removeManual('mana0002', 'safari:apps/admin')
    await removeManual('mana0002', 'chrome:')
    const after = (await qaTargets('mana0001'))!
    expect([after.targets.map((x) => x.key), after.chosen]).toEqual([['chrome:', 'safari:'], 'chrome:'])

    // Two saves at once both land.
    await Promise.all([addManual('mana0001', { platform: 'android', dir: '', command: 'a' }), addManual('mana0002', { platform: 'ios', dir: '', command: 'i' })])
    expect((await qaTargets('mana0001'))!.targets.filter((x) => x.source === 'manual').map((x) => x.key).sort()).toEqual(['android:', 'ios:'])

    // An unknown workspace has no targets.
    expect(await qaTargets('nobody00')).toBeNull()
  })
})
