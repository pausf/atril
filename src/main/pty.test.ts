import { beforeEach, describe, expect, it, vi } from 'vitest'

const clients: Array<{ exit: () => void; resize: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn>; kill: ReturnType<typeof vi.fn> }> = []
let refuse = false
vi.mock('node-pty', () => ({
  spawn: () => {
    if (refuse) throw new Error('posix_spawnp failed.')
    let onExit = (): void => undefined
    const dead = (): never => {
      throw new Error('ioctl(2) failed, EBADF')
    }
    const c = { resize: vi.fn(dead), write: vi.fn(dead), kill: vi.fn(dead), onData: () => undefined, onExit: (cb: () => void) => (onExit = cb), exit: () => onExit() }
    clients.push(c)
    return c
  }
}))

const { attach, detach, input, resize } = await import('./pty')

beforeEach(() => {
  clients.length = 0
  refuse = false
})

describe('pty', () => {
  it('a dead terminal client never throws', () => {
    attach('w1', '/tmp', 80, 24, () => undefined)
    // tmux died: node-pty throws EBADF on anything sent to the closed descriptor.
    expect(() => resize('w1', 100, 30)).not.toThrow()
    expect(() => input('w1', 'x')).not.toThrow()
    expect(() => detach('w1')).not.toThrow()

    attach('w2', '/tmp', 80, 24, () => undefined)
    const second = clients.at(-1)!
    second.exit()
    // Once the client exits it is forgotten: nothing reaches it any more.
    resize('w2', 100, 30)
    input('w2', 'x')
    expect(second.resize).not.toHaveBeenCalled()
    expect(second.write).not.toHaveBeenCalled()
  })

  it('a client that cannot start answers an error and keeps nothing', () => {
    expect(attach('w3', '/tmp', 80, 24, () => undefined)).toEqual({ ok: true })
    const first = clients.at(-1)!
    refuse = true
    expect(attach('w3', '/tmp', 80, 24, () => undefined)).toEqual({ error: 'posix_spawnp failed.' })
    // The earlier client was let go and no new one was kept: nothing reaches w3.
    first.write.mockClear()
    first.resize.mockClear()
    input('w3', 'x')
    resize('w3', 100, 30)
    expect(first.write).not.toHaveBeenCalled()
    expect(first.resize).not.toHaveBeenCalled()
    expect(clients).toHaveLength(1)
  })
})
