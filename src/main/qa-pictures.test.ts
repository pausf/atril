import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { QaReport } from '../preload/api'
import { cleanPng, createPictures, leakOf, ocrText } from './qa-pictures'
import type { Runner } from './run'
import { cleanTmp, tmp } from './test-helpers'

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
function chunk(type: string, data: Buffer | string = ''): Buffer {
  const body = Buffer.from(data)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  return Buffer.concat([len, Buffer.from(type, 'ascii'), body, Buffer.from([1, 2, 3, 4])])
}
const png = (...extra: Buffer[]): Buffer => Buffer.concat([SIG, chunk('IHDR', 'h'.repeat(13)), ...extra, chunk('IDAT', 'pixels'), chunk('IEND')])

const CTX = { home: '/Users/jdoe', host: 'Jdoes-MacBook-Pro.local', user: 'jdoe' }

let home: string
let dir: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
  dir = join(home, 'qa', 'wpic0001')
  mkdirSync(dir, { recursive: true })
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

function report(entries: QaReport['entries'], ids = entries.map((e) => e.id)): QaReport {
  return { change: 'add-x', criteria: ids.map((id) => ({ id, text: `${id} text` })), entries, at: 1, target: null, targets: [], note: null, branch: 'feat/x', head: 'abc' }
}
const shotStep = (shot: string, view?: string) => ({ text: 'step', shot, shotAt: 1, ...(view && { view }) })

describe('pictures for the mr', () => {
  it('prepare previews without touching the forge or claude', async () => {
    writeFileSync(join(dir, 'a.png'), png())
    const read: string[] = []
    const pics = createPictures({ ...CTX, ocr: async (f) => (read.push(f), 'Sign in') })
    const r = await pics.prepare('wpic0001', report([{ id: 'W1', status: 'pass', note: '', steps: [shotStep('a.png', 'login')] }]), null)
    expect(r.token).toMatch(/^[0-9a-f]{32}$/)
    expect(r.rows).toEqual([{ id: 'W1', status: 'pass', view: 'login', verdict: 'send', src: `data:image/png;base64,${cleanPng(png()).toString('base64')}` }])
    // OCR reads the cleaned bytes Atril would send, from its own copy, never the agent's file.
    expect(read).toHaveLength(1)
    expect(read[0]).not.toBe(join(dir, 'a.png'))

    // No shots: no rows, no token.
    expect(await pics.prepare('wpic0001', report([{ id: 'W1', status: 'pass', note: '', steps: [{ text: 'x' }] }]), null)).toEqual({ rows: [], token: null })
  })

  it('only the last png of each criterion goes, within caps', async () => {
    writeFileSync(join(dir, 'first.png'), png())
    writeFileSync(join(dir, 'last.png'), png(chunk('tEXt', 'x')))
    writeFileSync(join(dir, 'fake.png'), 'GIF89a not a png')
    writeFileSync(join(dir, 'big.png'), Buffer.concat([png(), Buffer.alloc(5 * 1024 * 1024)]))
    for (let i = 0; i < 20; i++) writeFileSync(join(dir, `m${i}.png`), png())
    const ocr: string[] = []
    const pics = createPictures({ ...CTX, ocr: async (f) => (ocr.push(f), '') })
    const entries: QaReport['entries'] = [
      { id: 'W1', status: 'pass', note: '', steps: [shotStep('first.png'), { text: 'no shot' }, shotStep('last.png'), { text: 'after' }] },
      { id: 'W2', status: 'fail', note: '', steps: [shotStep('fake.png')] },
      { id: 'W3', status: 'untested', note: '', steps: [shotStep('big.png')] },
      ...Array.from({ length: 20 }, (_, i) => ({ id: `W${10 + i}`, status: 'pass' as const, note: '', steps: [shotStep(`m${i}.png`)] }))
    ]
    const { rows } = await pics.prepare('wpic0001', report(entries), null)
    expect(rows.map((r) => [r.id, r.verdict, r.reason ?? null])).toEqual([
      ['W1', 'send', null],
      ['W2', 'blocked', 'not-png'],
      ['W3', 'blocked', 'too-big'],
      ...Array.from({ length: 17 }, (_, i) => [`W${10 + i}`, 'send', null]),
      ['W27', 'blocked', 'too-many'],
      ['W28', 'blocked', 'too-many'],
      ['W29', 'blocked', 'too-many']
    ])
    // W1 sent its last shot, cleaned: the tEXt chunk is gone.
    expect(rows[0]!.src).toBe(`data:image/png;base64,${cleanPng(png()).toString('base64')}`)
    // Blocked rows carry no picture, and nothing past the cap or a failed check is read.
    expect(rows.filter((r) => r.verdict === 'blocked').every((r) => r.src === undefined)).toBe(true)
    expect(ocr).toHaveLength(18)
    // The criterion order decides, not the report's.
    const swapped = await pics.prepare('wpic0001', report([entries[1]!, entries[0]!], ['W1', 'W2']), null)
    expect(swapped.rows.map((r) => r.id)).toEqual(['W1', 'W2'])
  })

  it('a picture showing a host, path, token, email or the mac is blocked', async () => {
    const cases: Array<[string, string | null]> = [
      ['Welcome back\nAdd to cart', null],
      ['Open localhost:5173', 'host'],
      ['api.acme.corp/v1', 'host'],
      ['pausf/shop-\nweb.example.com', 'host'],
      ['shop.acme\n.corp', 'host'],
      ['Saved to /Users/someone/Desktop/x.png', 'path'],
      ['~/projects/app', 'path'],
      ['ghp_abcdefghijklmnopqrstuvwxyz0123456789', 'token'],
      ['contact jane@acme.io', 'email'],
      ['ghp_abc123 and jane@acme.io', 'token'],
      ['Logged in as JDOE', 'machine'],
      ['Jdoes-MacBook-Pro', 'machine'],
      ['«quoted» "text" stays', null],
      ['pause the video', null]
    ]
    for (const [text, reason] of cases) expect([text, leakOf(text, CTX)]).toEqual([text, reason])

    writeFileSync(join(dir, 'a.png'), png())
    writeFileSync(join(dir, 'b.png'), png())
    writeFileSync(join(dir, 'c.png'), png())
    const texts: Record<string, string | null> = { 0: 'http://10.0.0.4:3000', 1: null, 2: 'Dashboard' }
    let n = 0
    const pics = createPictures({ ...CTX, ocr: async () => texts[n++] ?? null })
    const steps = (s: string) => [shotStep(s)]
    const { rows } = await pics.prepare(
      'wpic0001',
      report([
        { id: 'W1', status: 'pass', note: '', steps: steps('a.png') },
        { id: 'W2', status: 'pass', note: '', steps: steps('b.png') },
        { id: 'W3', status: 'pass', note: '', steps: steps('c.png') }
      ]),
      null
    )
    expect(rows.map((r) => [r.verdict, r.reason ?? null])).toEqual([
      ['blocked', 'host'],
      ['blocked', 'unreadable'],
      ['send', null]
    ])

    // The real reader: Vision through osascript, on this Mac, killed after 15 s.
    const calls: Array<{ cmd: string; args: string[]; timeoutMs?: number }> = []
    const ok: Runner = async (cmd, args, opts) => (calls.push({ cmd, args, timeoutMs: opts?.timeoutMs }), { code: 0, stdout: 'Line one\nLine two\n', stderr: '' })
    expect(await ocrText('/tmp/x.png', ok)).toBe('Line one\nLine two')
    expect(calls[0]!.cmd).toBe('osascript')
    expect(calls[0]!.args.slice(0, 2)).toEqual(['-l', 'JavaScript'])
    expect(calls[0]!.args.at(-1)).toBe('/tmp/x.png')
    expect(calls[0]!.timeoutMs).toBe(15_000)
    const killed: Runner = async () => ({ code: 124, stdout: 'partial', stderr: '' })
    expect(await ocrText('/tmp/x.png', killed)).toBeNull()
  })

  it('the sent png keeps critical chunks only and a hash name', async () => {
    const dirty = png(chunk('tEXt', 'Comment\0/Users/jdoe/x'), chunk('PLTE', 'rgb'), chunk('tRNS', 'a'), chunk('eXIf', 'gps'), chunk('iTXt', 'xmp'), chunk('zTXt', 'z'), chunk('tIME', 't'))
    const clean = cleanPng(dirty)
    const types: string[] = []
    for (let at = 8; at < clean.length; ) {
      const len = clean.readUInt32BE(at)
      types.push(clean.toString('ascii', at + 4, at + 8))
      at += 12 + len
    }
    expect(types).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])
    expect(clean.includes('/Users/jdoe')).toBe(false)
    expect(() => cleanPng(Buffer.concat([SIG, chunk('IHDR', 'h'.repeat(13)), Buffer.from([0, 0, 0, 99])]))).toThrow()
    expect(() => cleanPng(Buffer.concat([SIG, chunk('IDAT', 'x'), chunk('IEND')]))).toThrow()

    writeFileSync(join(dir, 'Screenshot from jdoe laptop.png'), dirty)
    const pics = createPictures({ ...CTX, ocr: async () => '' })
    const { token } = await pics.prepare('wpic0001', report([{ id: 'W1', status: 'pass', note: '', steps: [shotStep('Screenshot from jdoe laptop.png')] }]), null)
    const taken = await pics.take(token!, 'wpic0001')
    if (!('pictures' in taken)) throw new Error('expected pictures')
    expect(taken.pictures[0]!.name).toBe(`${createHash('sha256').update(clean).digest('hex').slice(0, 16)}.png`)
    expect(taken.pictures[0]!.bytes.equals(clean)).toBe(true)
  })

  it('send refuses pictures that changed after the preview', async () => {
    writeFileSync(join(dir, 'a.png'), png())
    let now = 1_000
    const pics = createPictures({ ...CTX, ocr: async () => '', now: () => now })
    const r = report([{ id: 'W1', status: 'pass', note: '', steps: [shotStep('a.png', 'cart')] }])
    const { token } = await pics.prepare('wpic0001', r, { mr: 'x' })
    const changed = { error: 'Las capturas han cambiado: revísalas otra vez', fix: 'recheck' }

    // Unchanged: exactly the previewed picture, with what publish handed prepare.
    const first = await pics.take(token!, 'wpic0001')
    expect('pictures' in first && first.pictures.map((p) => [p.id, p.view])).toEqual([['W1', 'cart']])
    expect('pictures' in first && first.extra).toEqual({ mr: 'x' })
    // A failed send keeps the token: taking it again works.
    expect('pictures' in (await pics.take(token!, 'wpic0001'))).toBe(true)
    // Another workspace, or an unknown token, gets nothing.
    expect(await pics.take(token!, 'other')).toEqual(changed)
    expect(await pics.take('f'.repeat(32), 'wpic0001')).toEqual(changed)

    // The agent rewrites the shot after the preview: nothing goes.
    writeFileSync(join(dir, 'a.png'), png(chunk('tEXt', 'new')))
    expect(await pics.take(token!, 'wpic0001')).toEqual(changed)

    // A success ends the token; so do 10 minutes.
    writeFileSync(join(dir, 'a.png'), png())
    const second = (await pics.prepare('wpic0001', r, null)).token!
    pics.done(second)
    expect(await pics.take(second, 'wpic0001')).toEqual(changed)
    const third = (await pics.prepare('wpic0001', r, null)).token!
    now += 10 * 60_000 + 1
    expect(await pics.take(third, 'wpic0001')).toEqual(changed)
  })
})
