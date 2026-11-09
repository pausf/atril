import { afterEach, describe, expect, it } from 'vitest'
import { atrilHome } from './paths'
import { claudeConfigPath } from './trust'

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
})
