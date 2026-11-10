import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { atrilHome, resourcesDir } from './paths'
import { claudeConfigPath } from './trust'

const root = join(__dirname, '../..')
const saved = { home: process.env['ATRIL_HOME'], claude: process.env['ATRIL_CLAUDE_JSON'] }
const restore = (name: string, value: string | undefined): void => {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
afterEach(() => {
  restore('ATRIL_HOME', saved.home)
  restore('ATRIL_CLAUDE_JSON', saved.claude)
})

describe('paths', () => {
  it('a test without its own home never reaches the real one', () => {
    delete process.env['ATRIL_HOME']
    delete process.env['ATRIL_CLAUDE_JSON']
    expect(() => atrilHome()).toThrow(/ATRIL_HOME/)
    expect(() => claudeConfigPath()).toThrow(/ATRIL_CLAUDE_JSON/)
  })

  it('resources resolve packaged and in dev', () => {
    const saveProp = (name: string): PropertyDescriptor | undefined => Object.getOwnPropertyDescriptor(process, name)
    const versions = Object.getOwnPropertyDescriptor(process, 'versions')
    const original = {
      electron: process.versions.electron,
      defaultApp: saveProp('defaultApp'),
      resourcesPath: saveProp('resourcesPath')
    }
    const set = (electron: string | undefined, defaultApp: boolean | undefined): void => {
      Object.defineProperty(process, 'versions', {
        value: { ...process.versions, electron },
        configurable: true
      })
      Object.defineProperty(process, 'defaultApp', { value: defaultApp, configurable: true, writable: true })
      Object.defineProperty(process, 'resourcesPath', { value: '/Applications/Atril.app/Contents/Resources', configurable: true, writable: true })
    }
    try {
      set('45.0.0', undefined)
      expect(resourcesDir()).toBe('/Applications/Atril.app/Contents/Resources')
      set('45.0.0', true)
      expect(resourcesDir()).toBe(join(root, 'resources'))
      set(undefined, undefined)
      expect(resourcesDir()).toBe(join(root, 'resources'))
    } finally {
      if (versions) Object.defineProperty(process, 'versions', versions)
      for (const [name, d] of [['defaultApp', original.defaultApp], ['resourcesPath', original.resourcesPath]] as const) {
        if (d) Object.defineProperty(process, name, d)
        else delete (process as unknown as Record<string, unknown>)[name]
      }
    }

    const sources: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full)
        else if (full.endsWith('.ts') && !/\.test\.ts$/.test(full)) sources.push(full)
      }
    }
    walk(join(root, 'src/main'))
    const joined = new Set<string>()
    for (const file of sources) {
      for (const m of readFileSync(file, 'utf8').matchAll(/join\(\s*resourcesDir\(\)\s*,\s*'([^']+)'/g)) joined.add(m[1]!)
    }
    expect([...joined].sort()).toEqual(expect.arrayContaining(['claude-hook.mjs', 'libretto']))
    for (const name of joined) expect(existsSync(join(root, 'resources', name)), name).toBe(true)
    // the hook imports its sibling: both must travel in the flat copy
    const hook = readFileSync(join(root, 'resources/claude-hook.mjs'), 'utf8')
    const local = [...hook.matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1] as string)
    expect(local).toContain('summarise.mjs')
    for (const f of local) expect(existsSync(join(root, 'resources', f)), f).toBe(true)
  })
})
