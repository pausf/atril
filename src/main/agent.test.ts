import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { agentArgv, hooksSettings } from './agent'

describe('agentArgv', () => {
  it('claude starts with the bundled libretto plugin', () => {
    const argv = agentArgv()
    expect(argv[0]).toBe('claude')
    const flag = argv.indexOf('--plugin-dir')
    expect(flag).toBeGreaterThan(0)
    const dir = argv[flag + 1] ?? ''
    expect(statSync(dir).isDirectory()).toBe(true)
    expect(JSON.parse(readFileSync(join(dir, '.claude-plugin', 'plugin.json'), 'utf8')).name).toBe('libretto')
    expect(existsSync(join(dir, 'skills'))).toBe(true)
  })

  it('claude loads the hooks file that reports agent state', () => {
    const argv = agentArgv()
    const flag = argv.indexOf('--settings')
    expect(flag).toBeGreaterThan(0)
    expect(flag).toBeLessThan(argv.indexOf('--plugin-dir'))
    expect(argv[flag + 1]).toMatch(/hooks\.json$/)
    expect(Object.keys(hooksSettings().hooks).sort()).toEqual(['Notification', 'Stop', 'UserPromptSubmit'])
  })

  it('claude keeps the person\'s own skills', () => {
    const argv = agentArgv()
    for (const drop of ['--setting-sources', '--bare', '--strict-mcp-config']) expect(argv).not.toContain(drop)
  })
})
