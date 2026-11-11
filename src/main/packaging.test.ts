import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const root = join(__dirname, '../..')
const requireCjs = createRequire(__filename)
const configPath = join(root, 'electron-builder.config.cjs')
const saved = process.env['ATRIL_SIGN_IDENTITY']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadConfig = (identity: string | undefined): any => {
  if (identity === undefined) delete process.env['ATRIL_SIGN_IDENTITY']
  else process.env['ATRIL_SIGN_IDENTITY'] = identity
  delete requireCjs.cache[requireCjs.resolve(configPath)]
  return requireCjs(configPath)
}

afterEach(() => {
  if (saved === undefined) delete process.env['ATRIL_SIGN_IDENTITY']
  else process.env['ATRIL_SIGN_IDENTITY'] = saved
})

describe('packaging', () => {
  it('the packaging config asks for a signed arm64 app', () => {
    const config = loadConfig(undefined)
    expect(config.appId).toBeTruthy()
    expect(config.productName).toBe('Atril')

    expect(config.mac.target).toEqual([
      { target: 'dmg', arch: ['arm64'] },
      { target: 'zip', arch: ['arm64'] }
    ])
    expect(config.mac.icon).toBe('build/icon.icns')

    expect(config.extraResources).toEqual([{ from: 'resources', to: '.' }])
    expect(config.asarUnpack.some((glob: string) => glob.includes('node-pty'))).toBe(true)

    expect(config.mac.hardenedRuntime).toBe(true)
    expect(config.mac.entitlements).toBe('build/entitlements.mac.plist')
    expect(config.mac.entitlementsInherit).toBe('build/entitlements.mac.plist')
    const plist = readFileSync(join(root, 'build/entitlements.mac.plist'), 'utf8')
    for (const key of [
      'com.apple.security.cs.allow-jit',
      'com.apple.security.cs.allow-unsigned-executable-memory',
      'com.apple.security.cs.disable-library-validation'
    ]) {
      expect(plist).toMatch(new RegExp(`<key>${key}</key>\\s*<true/>`))
    }
    expect(config.mac.notarize).toBe(false)

    expect(loadConfig('Atril Local').mac.identity).toBe('Atril Local')
    expect(loadConfig(undefined).mac.identity).toBe('-')

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.devDependencies['electron-builder']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pkg.scripts.dist).toBe('electron-vite build && electron-builder --mac')
  })

  it('bundled reviewers run on sonnet', () => {
    const model = (name: string): string | null => {
      const text = readFileSync(join(__dirname, '..', '..', 'resources', 'libretto', 'agents', `${name}.md`), 'utf8')
      const front = /^---\n([\s\S]*?)\n---\n/.exec(text)![1]!
      return /^model: (.+)$/m.exec(front)?.[1] ?? null
    }
    for (const name of ['converge-reader', 'review-lens-reliability', 'review-lens-security', 'spec-reviewer', 'work-reviewer', 'review-lens-design']) expect(model(name), name).toBe('sonnet')
    for (const name of ['review-lens-intent', 'review-lens-tests']) expect(model(name), name).toBe('haiku')
    expect(model('spec-writer')).toBeNull()
  })
})
