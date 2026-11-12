import { describe, expect, it, vi } from 'vitest'
import { createMrPoll } from './mrpoll'

describe('mr poll', () => {
  it('main lists when nobody has for five minutes', async () => {
    let now = 10 * 60_000
    let last: { at: number } | null = null
    let connected = true
    const list = vi.fn(async () => {
      last = { at: now }
    })
    const poll = createMrPoll({ last: () => last, list, connected: async () => connected, now: () => now })
    // No listing yet: list now.
    expect(await poll.tick()).toBe(true)
    expect(list).toHaveBeenCalledTimes(1)
    // The window listed a minute ago: nothing.
    now += 4 * 60_000
    last = { at: now - 60_000 }
    expect(await poll.tick()).toBe(false)
    // Five minutes since the last listing, whoever made it: list.
    now += 4 * 60_000
    expect(await poll.tick()).toBe(true)
    expect(list).toHaveBeenCalledTimes(2)
    // No forge connected: never.
    connected = false
    now += 60 * 60_000
    expect(await poll.tick()).toBe(false)
    expect(list).toHaveBeenCalledTimes(2)
    // A failing listing never breaks the poll.
    connected = true
    list.mockRejectedValueOnce(new Error('boom'))
    expect(await poll.tick()).toBe(true)
  })
})
