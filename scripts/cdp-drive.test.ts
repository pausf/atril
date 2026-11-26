import { describe, expect, it, vi } from 'vitest'
import { LAUNCH_QUERY, withLaunch } from '../src/main/cdp'
import { attachVerified, LAUNCH_QUERY as SCRIPT_QUERY } from './cdp-drive.mjs'

const TOKEN = 'abcDEF0123456789_-xyz'

// Every read a driver could make of a page, as spies: only `url()` may ever be called.
const page = (url: string) => ({
  url: vi.fn(() => url),
  content: vi.fn(),
  evaluate: vi.fn(),
  title: vi.fn(),
  screenshot: vi.fn(),
  innerText: vi.fn(),
  locator: vi.fn()
})
const reads = (p: ReturnType<typeof page>) => [p.content, p.evaluate, p.title, p.screenshot, p.innerText, p.locator]

const browser = (...contexts: Array<Array<ReturnType<typeof page>>>) => {
  const close = vi.fn(async () => {})
  const connect = vi.fn<(endpoint: string) => Promise<{ contexts: () => Array<{ pages: () => Array<ReturnType<typeof page>> }>; close: typeof close }>>(async () => ({ contexts: () => contexts.map((pages) => ({ pages: () => pages })), close }))
  return { connect, close }
}

describe('attachVerified', () => {
  it('refuses a browser that is not ours without reading it', async () => {
    const real = page('http://localhost:5173/')
    const other = page('http://localhost:5173/?launch=someoneElses123456')
    const { connect, close } = browser([real], [other])
    await expect(attachVerified(connect, 9333, TOKEN)).rejects.toThrow(/9333/)
    expect(connect).toHaveBeenCalledWith('http://127.0.0.1:9333')
    expect(close).toHaveBeenCalledTimes(1)
    for (const p of [real, other]) reads(p).forEach((spy) => expect(spy).not.toHaveBeenCalled())
    // an app with no pages at all is not ours either
    const empty = browser([])
    await expect(attachVerified(empty.connect, 9333, TOKEN)).rejects.toThrow(/9333/)
    expect(empty.close).toHaveBeenCalledTimes(1)
  })

  it('ignores the pages of another Atril', async () => {
    const real = page('http://localhost:5173/')
    const prefix = page(`http://localhost:5173/?launch=${TOKEN}EXTRA`)
    const ours = page(`http://localhost:5175/?x=1&launch=${TOKEN}`)
    const { connect, close } = browser([real, prefix], [ours])
    expect(await attachVerified(connect, 9462, TOKEN)).toBe(ours)
    expect(close).not.toHaveBeenCalled()
    for (const p of [real, prefix, ours]) reads(p).forEach((spy) => expect(spy).not.toHaveBeenCalled())

    // two pages with our token is a stale or duplicated launch: refuse and disconnect
    const twice = browser([page(`http://a/?launch=${TOKEN}`)], [page(`http://b/?launch=${TOKEN}`)])
    await expect(attachVerified(twice.connect, 9462, TOKEN)).rejects.toThrow(/9462/)
    expect(twice.close).toHaveBeenCalledTimes(1)
  })

  it('uses the query name main writes', async () => {
    expect(SCRIPT_QUERY).toBe(LAUNCH_QUERY)
    const ours = page(withLaunch('http://localhost:5175/', TOKEN))
    const { connect } = browser([ours])
    expect(await attachVerified(connect, 9462, TOKEN)).toBe(ours)
  })
})
