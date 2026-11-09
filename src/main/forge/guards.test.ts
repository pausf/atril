import { describe, expect, it } from 'vitest'
import { createForgeGuards } from './guards'

describe('forge guards', () => {
  it('only links and folders main handed out are accepted', () => {
    const g = createForgeGuards()
    expect(g.openable('https://github.com/pau/x')).toBe(false)
    g.created('https://github.com/pau/x')
    expect(g.openable('https://github.com/pau/x')).toBe(true)
    expect(g.openable('https://evil.example/x')).toBe(false)

    expect(g.cloneFolder('/Users/pau/gitrepos')).toBe(false)
    g.picked('/Users/pau/gitrepos')
    expect(g.cloneFolder('/Users/pau/gitrepos')).toBe(true)
    expect(g.cloneFolder('/etc')).toBe(false)
  })
})
