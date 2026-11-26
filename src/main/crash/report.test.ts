import { describe, expect, it } from 'vitest'
import { buildReport, type RawCrash } from './report'

const HOME = '/Users/ana maria'
const ctx = { home: HOME, versions: { atril: '0.9.0', electron: '45.1.0', macos: '15.3.1' } }
const at = Date.UTC(2026, 10, 26, 10, 30)
const raw = (message: string, stack = ''): RawCrash => ({ where: 'main', message, stack, at })
const msg = (message: string): string => {
  const md = buildReport(raw(message), ctx).markdown
  return md.split('## Message\n\n')[1]!.split('\n')[1]!
}
const trace = (stack: string): string => buildReport(raw('x', stack), ctx).markdown.split('## Stack\n\n')[1]!

describe('crash report', () => {
  it("scrubs paths, tokens, mails, hosts and keys from a report", () => {
    // Home directory, spaces included.
    expect(msg(`ENOENT at ${HOME}/gitrepos/shop-web/a.ts`)).toBe('ENOENT at <path>')
    // Tokens.
    for (const secret of [
      'ghp_abcdEFGH1234abcdEFGH1234',
      'gho_abcdEFGH1234',
      'ghs_abcdEFGH1234',
      'github_pat_11ABCDEFG_abcdefgh',
      'glpat-abcdEFGH-1234',
      'xoxb-1234-abcd',
      'sk-ant-api03-abcdEFGH',
      'AKIAABCDEFGHIJKLMNOP',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
      'Bearer abc.def-123',
      'Basic dXNlcjpwYXNz',
      'token=abc123',
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
      'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVoxMjM0NTY='
    ])
      expect(msg(`failed with ${secret} now`), secret).toBe('failed with <token> now')
    // E-mail addresses.
    expect(msg('no user ana.maria+x@acme.example.com here')).toBe('no user <email> here')
    // Server addresses.
    for (const host of ['https://jira.acme.example/rest/api/2?x=1', 'ssh://git@acme.example/x.git', '10.0.0.12', '10.0.0.12:8080', '::1', 'fe80::1ff:fe23:4567:890a', 'api.acme.example:443', 'localhost:5173', 'git@github.com:acme/shop-web.git'])
      expect(msg(`connect ${host} refused`), host).toBe('connect <url> refused')
    // Other absolute paths and ~/ paths; the app's own files keep their tail.
    for (const path of ['/Users/otra/x.ts', '/home/otra/x.ts', '/private/var/folders/ab/T/x', '/var/log/x.log', '/tmp/x', '/Volumes/Disco/x', 'C:\\Users\\otra\\x.ts', '~/gitrepos/shop-web'])
      expect(msg(`open ${path} failed`), path).toBe('open <path> failed')
    expect(trace(`Error: x\n    at f (${HOME}/Applications/Atril.app/Contents/Resources/app.asar/out/main/index.js:12:3)\n    at g (/Users/otra/dev/atril/out/renderer/assets/index.js:1:2)`)).toContain(
      'at f (<path>/app.asar/out/main/index.js:12:3)\n    at g (<path>/out/renderer/assets/index.js:1:2)'
    )
    // Stack positions are not hosts or addresses.
    expect(trace('Error: x\n    at h (node:internal/x.js:12:34)')).toContain('node:internal/x.js:12:34')
    // Jira-like keys.
    expect(msg('issue SHOP-1234 failed')).toBe('issue <key> failed')
    // In the message only, quoted text.
    expect(msg('bad "secret title" and \'other\' and «más»')).toBe('bad <text> and <text> and <text>')
    expect(trace('Error: x\n    at "kept"')).toContain('"kept"')
    // Cut to 4 000 characters each.
    const long = buildReport(raw('m'.repeat(5000), 's'.repeat(5000)), ctx).markdown
    expect(long).toContain('m'.repeat(4000) + '\n')
    expect(long).not.toContain('m'.repeat(4001))
    expect(long).not.toContain('s'.repeat(4001))
    // No home path survives anywhere.
    expect(long + buildReport(raw(`x ${HOME}/a`, `at ${HOME}/b`), ctx).markdown).not.toContain('/Users/')
  })

  it('writes the title, versions and fenced blocks', () => {
    const r = buildReport({ where: 'ventana', message: 'Cannot read @x `y` <b> [c] of undefined and a very long tail that goes past the limit of the title', stack: 'Error\n    at a ```` b', at }, ctx)
    const lines = r.markdown.split('\n')
    expect(lines[0]).toBe('# Crash: ' + 'Cannot read x y b c of undefined and a very long tail that goes past the limit of the title'.slice(0, 72))
    expect(r.title).toBe(lines[0]!.slice(2))
    // Public text: English labels, and `where` in English too.
    expect(r.markdown).toContain('\n- Where: window\n- Atril: 0.9.0\n- Electron: 45.1.0\n- macOS: 15.3.1\n- Time: 2026-11-26T10:30:00.000Z\n')
    expect(buildReport({ where: 'proceso', message: 'x', at }, ctx).markdown).toContain('- Where: process\n')
    expect(r.markdown).toContain('\n`````\nError\n    at a ```` b\n`````')
    expect(r.markdown).toContain('\n```\nCannot read')
  })

  it("the same failure keeps one signature", () => {
    const a = buildReport(raw('Timeout after 3000 ms on job 12', 'Error: x\n    at run (/Users/otra/x.ts:1:2)\n    at later (y.ts:3:4)'), ctx)
    const b = buildReport(raw('Timeout after 5000 ms on job 99', 'Error: x\n    at walk (/Users/otra/x.ts:1:2)'), ctx)
    expect(a.signature).toMatch(/^[0-9a-f]{12}$/)
    const c = buildReport(raw('Timeout after 3000 ms on job 12', 'Error: x\n    at run (/Users/otra/x.ts:1:2)\n    at another (q.ts:1:1)'), ctx)
    expect(c.signature).toBe(a.signature)
    expect(buildReport(raw('Timeout after 7 ms on job 1', 'Error: x\n    at run (/Users/otra/x.ts:1:2)'), ctx).signature).toBe(a.signature)
    expect(b.signature).not.toBe(a.signature)
    expect(buildReport(raw('Timeout after 3000 ms on job 12', 'Error: x\n    at run (/Users/otra/x.ts:1:2)'), { ...ctx, versions: { ...ctx.versions, atril: '0.9.1' } }).signature).not.toBe(a.signature)
    expect(buildReport(raw('no stack'), ctx).signature).toMatch(/^[0-9a-f]{12}$/)
  })
})
