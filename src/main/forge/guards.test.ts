import { describe, expect, it } from 'vitest'
import { createForgeGuards } from './guards'

describe('forge guards', () => {
  it('only links and folders main handed out are accepted', () => {
    const g = createForgeGuards()
    expect(g.openable('https://github.com/pau/x')).toBe(false)
    g.created('https://github.com/pau/x')
    expect(g.openable('https://github.com/pau/x')).toBe(true)
    expect(g.openable('https://evil.example/x')).toBe(false)

    // The latest MR listing counts too; a link from an earlier listing no longer does.
    g.listed(['https://github.com/acme/api/pull/1', 'https://git.example.com/g/p/-/merge_requests/2'])
    expect(g.openable('https://github.com/acme/api/pull/1')).toBe(true)
    expect(g.openable('https://git.example.com/g/p/-/merge_requests/2')).toBe(true)
    g.listed(['https://github.com/acme/api/pull/3'])
    expect(g.openable('https://github.com/acme/api/pull/1')).toBe(false)
    expect(g.openable('https://github.com/acme/api/pull/3')).toBe(true)
    // A new listing never forgets what main created.
    expect(g.openable('https://github.com/pau/x')).toBe(true)

    expect(g.cloneFolder('/Users/pau/gitrepos')).toBe(false)
    g.picked('/Users/pau/gitrepos')
    expect(g.cloneFolder('/Users/pau/gitrepos')).toBe(true)
    expect(g.cloneFolder('/etc')).toBe(false)
  })
})
