import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LAUNCH_QUERY, cdpConfig, guardCdp, verifyOwnTarget, withLaunch } from './cdp'

const TOKEN = 'abcDEF0123456789_-xyz'
const dev = (env: Record<string, string | undefined>) => cdpConfig({ packaged: false, env })

describe('cdpConfig', () => {
  it('enables only in dev with a port and a token', () => {
    expect(dev({ ATRIL_CDP_PORT: '9333', ATRIL_LAUNCH_TOKEN: TOKEN })).toEqual({ port: 9333, token: TOKEN })
    expect(dev({ ATRIL_CDP_PORT: '1024', ATRIL_LAUNCH_TOKEN: 'a'.repeat(16) })).toEqual({ port: 1024, token: 'a'.repeat(16) })
    expect(dev({ ATRIL_CDP_PORT: '65535', ATRIL_LAUNCH_TOKEN: 'a'.repeat(128) })).toEqual({ port: 65535, token: 'a'.repeat(128) })
  })

  it('answers nothing when packaged or without a port', () => {
    expect(cdpConfig({ packaged: true, env: { ATRIL_CDP_PORT: '9333', ATRIL_LAUNCH_TOKEN: TOKEN } })).toBeUndefined()
    expect(dev({ ATRIL_LAUNCH_TOKEN: TOKEN })).toBeUndefined()
    expect(dev({ ATRIL_CDP_PORT: '', ATRIL_LAUNCH_TOKEN: TOKEN })).toBeUndefined()
    expect(dev({ ATRIL_CDP_PORT: '' })).toBeUndefined()
  })

  it('refuses a bad port or token without echoing the token', () => {
    for (const port of ['abc', '9333.5', '1023', '65536', '-1', '0x2455', ' 9333']) {
      const out = dev({ ATRIL_CDP_PORT: port, ATRIL_LAUNCH_TOKEN: TOKEN })
      expect(out).toEqual({ error: expect.stringContaining('ATRIL_CDP_PORT') })
      expect(JSON.stringify(out)).not.toContain(TOKEN)
    }
    const secret = 'has a space and is secret'
    for (const token of [undefined, '', 'short', 'a'.repeat(129), 'a'.repeat(15) + '!', secret]) {
      const out = dev({ ATRIL_CDP_PORT: '9333', ATRIL_LAUNCH_TOKEN: token })
      expect(out).toEqual({ error: expect.stringContaining('ATRIL_LAUNCH_TOKEN') })
      expect(JSON.stringify(out)).not.toContain(secret)
    }
  })
})

describe('withLaunch', () => {
  it('sets the launch parameter and keeps the rest', () => {
    expect(LAUNCH_QUERY).toBe('launch')
    const out = new URL(withLaunch('http://localhost:5173/?a=1#h', TOKEN))
    expect(out.searchParams.get('launch')).toBe(TOKEN)
    expect(out.searchParams.get('a')).toBe('1')
    expect(out.hash).toBe('#h')
    const file = new URL(withLaunch('file:///app/out/renderer/index.html', TOKEN))
    expect(file.protocol).toBe('file:')
    expect(file.searchParams.get('launch')).toBe(TOKEN)
    expect(new URL(withLaunch(`http://x/?launch=old`, TOKEN)).searchParams.getAll('launch')).toEqual([TOKEN])
  })
})

let server: Server | undefined
afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())).then(() => (server = undefined)))

// A real http server on port 0 that answers /json/list like a DevTools endpoint would.
const serve = async (status: number, body: string): Promise<number> => {
  server = createServer((_req, res) => res.writeHead(status, { 'content-type': 'application/json' }).end(body))
  await new Promise<void>((ok) => server!.listen(0, '127.0.0.1', ok))
  return (server.address() as AddressInfo).port
}
const page = (url: string) => ({ type: 'page', url, title: 'Atril' })

describe('verifyOwnTarget', () => {
  it('finds its own page on a real server', async () => {
    const port = await serve(200, JSON.stringify([{ type: 'background_page', url: 'chrome://x' }, page('http://localhost:5173/?x=1'), page(`http://localhost:5173/?launch=${TOKEN}&x=1`)]))
    expect(await verifyOwnTarget(port, TOKEN)).toBe(true)
    expect(await verifyOwnTarget(port, TOKEN, fetch)).toBe(true)
  })

  it('refuses a port another Atril holds', async () => {
    const other = await serve(200, JSON.stringify([page('http://localhost:5173/'), page('http://localhost:5173/?launch=someoneElses123456')]))
    expect(await verifyOwnTarget(other, TOKEN)).toBe(false)
    await new Promise<void>((done) => server!.close(() => done()))
    // a token that only starts with ours is not ours
    const prefix = await serve(200, JSON.stringify([page(`http://localhost:5173/?launch=${TOKEN}EXTRA`)]))
    expect(await verifyOwnTarget(prefix, TOKEN)).toBe(false)
    await new Promise<void>((done) => server!.close(() => done()))
    // the token in the wrong place is not the launch parameter
    const text = await serve(200, JSON.stringify([page(`http://localhost:5173/#launch=${TOKEN}`), page(`http://localhost:5173/?other=launch%3D${TOKEN}`), { type: 'iframe', url: `http://x/?launch=${TOKEN}` }]))
    expect(await verifyOwnTarget(text, TOKEN)).toBe(false)
    await new Promise<void>((done) => server!.close(() => done()))
    const junk = await serve(200, 'not json at all')
    expect(await verifyOwnTarget(junk, TOKEN)).toBe(false)
    await new Promise<void>((done) => server!.close(() => done()))
    const broken = await serve(500, JSON.stringify([page(`http://x/?launch=${TOKEN}`)]))
    expect(await verifyOwnTarget(broken, TOKEN)).toBe(false)
    await new Promise<void>((done) => server!.close(() => done()))
    const nothing = await serve(200, '[]')
    const closed = nothing
    await new Promise<void>((done) => server!.close(() => done()))
    expect(await verifyOwnTarget(closed, TOKEN)).toBe(false) // nothing listens any more
  })
})

describe('guardCdp', () => {
  const run = (verify: () => Promise<boolean>, attempts = 4) => {
    const err = vi.fn()
    const exit = vi.fn()
    const sleep = vi.fn(async () => {})
    return guardCdp({ verify, attempts, delayMs: 150, sleep, port: 9333, err, exit }).then(() => ({ err, exit, sleep }))
  }

  it('retries then exits on a port another Atril holds', async () => {
    const never = vi.fn(async () => false)
    const bad = await run(never, 4)
    expect(never).toHaveBeenCalledTimes(4)
    expect(bad.exit).toHaveBeenCalledExactlyOnceWith(1)
    expect(bad.err).toHaveBeenCalledOnce()
    const line = String(bad.err.mock.calls[0]?.[0])
    expect(line).toContain('9333')
    expect(line.trim().split('\n')).toHaveLength(1)
    expect(line).not.toContain(TOKEN)

    // the target list fills a moment after the page exists: false, false, then true stays quiet
    const answers = [false, false, true]
    const slow = vi.fn(async () => answers.shift() ?? false)
    const good = await run(slow, 4)
    expect(slow).toHaveBeenCalledTimes(3)
    expect(good.sleep).toHaveBeenCalledTimes(2)
    expect(good.sleep).toHaveBeenCalledWith(150)
    expect(good.err).not.toHaveBeenCalled()
    expect(good.exit).not.toHaveBeenCalled()
  })
})

describe('startup order', () => {
  it('index runs the cdp gate before any other startup', () => {
    const src = readFileSync(join(__dirname, 'index.ts'), 'utf8')
    const opener = 'app.whenReady().then(async () => {'
    const at = src.indexOf(opener)
    expect(at).toBeGreaterThan(-1)
    const first = src
      .slice(at + opener.length)
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l !== '' && !l.startsWith('//'))
    expect(first).toMatch(/^await cdpGate\(/)
  })
})
