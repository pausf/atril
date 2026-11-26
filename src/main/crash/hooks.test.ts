import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { installCrashHooks } from './hooks'

describe('crash hooks', () => {
  it("collects failures from main, the window and dead processes", async () => {
    const proc = new EventEmitter()
    const app = new EventEmitter() as EventEmitter & { whenReady(): Promise<void> }
    let ready: () => void = () => undefined
    const readyP = new Promise<void>((r) => (ready = r))
    app.whenReady = () => readyP
    const ipc = new EventEmitter()
    const own = { id: 1 }
    const report = vi.fn(async () => undefined)
    const log = vi.fn()
    installCrashHooks({ proc, app, ipc, isOwnWindow: (s) => s === own, crash: { report }, log })

    // Before ready: they wait in memory, at most five; main logs them and keeps running.
    for (let i = 0; i < 6; i++) proc.emit('uncaughtException', new Error(`early ${i}`), 'uncaughtException')
    expect(report).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(6)
    ready()
    await readyP
    await Promise.resolve()
    expect(report).toHaveBeenCalledTimes(5)
    expect(report.mock.calls.map((c) => (c as unknown[])[0])).toEqual([0, 1, 2, 3, 4].map((i) => expect.objectContaining({ where: 'main', message: `early ${i}`, stack: expect.stringContaining(`early ${i}`) })))

    // After ready: straight to the sender.
    report.mockClear()
    proc.emit('uncaughtException', new TypeError('boom'), 'uncaughtException')
    proc.emit('unhandledRejection', new Error('rejected'), Promise.resolve())
    proc.emit('unhandledRejection', 'plain reason', Promise.resolve())
    expect(report.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      expect.objectContaining({ where: 'main', message: 'boom' }),
      expect.objectContaining({ where: 'main', message: 'rejected' }),
      { where: 'main', message: 'plain reason', stack: '' }
    ])
    expect(log).toHaveBeenCalledTimes(9)

    // The app's own window, strings cut to 16 KB; another sender or another shape is ignored.
    report.mockClear()
    ipc.emit('atril:crash:report', { sender: own }, { message: 'm'.repeat(20_000), stack: 's'.repeat(20_000) })
    ipc.emit('atril:crash:report', { sender: { id: 2 } }, { message: 'stranger', stack: '' })
    ipc.emit('atril:crash:report', { sender: own }, { message: 3, stack: '' })
    ipc.emit('atril:crash:report', { sender: own }, { message: 'no stack' })
    ipc.emit('atril:crash:report', { sender: own }, 'text')
    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith({ where: 'ventana', message: 'm'.repeat(16_384), stack: 's'.repeat(16_384) })

    // Dead processes, except a clean exit or a kill (quitting the app).
    report.mockClear()
    app.emit('render-process-gone', {}, {}, { reason: 'crashed', exitCode: 133 })
    app.emit('render-process-gone', {}, {}, { reason: 'killed', exitCode: 9 })
    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'oom', exitCode: 7 })
    app.emit('child-process-gone', {}, { type: 'Utility', reason: 'clean-exit', exitCode: 0 })
    expect(report.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      { where: 'proceso', message: 'renderer crashed (exit 133)' },
      { where: 'proceso', message: 'GPU oom (exit 7)' }
    ])

    // A sender that rejects never becomes an unhandled rejection.
    report.mockRejectedValueOnce(new Error('send broke'))
    expect(() => proc.emit('uncaughtException', new Error('again'), 'uncaughtException')).not.toThrow()
    await Promise.resolve()
  })
})
