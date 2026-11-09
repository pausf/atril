import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTmp, tmp } from '../test-helpers'
import { forgeSettings } from './forge'
import { createSecretStore, type Encryptor } from './store'

const TOKEN = 'ghp_super-secret-forge-token'
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}
const answer = (status: number, body: object = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status }))

let home: string
beforeEach(() => {
  home = tmp()
  process.env['ATRIL_HOME'] = home
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

describe('forge connections', () => {
  it('a forge token is checked before it is stored', async () => {
    const ok = answer(200, { login: 'pau' })
    const gh = forgeSettings(createSecretStore(enc), ok as unknown as typeof fetch)
    expect(await gh.save('github', { token: TOKEN })).toEqual({ account: 'pau' })
    const [url, init] = ok.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(url)).toBe('https://api.github.com/user')
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`)
    // A redirect would carry the token elsewhere: requests refuse to follow one.
    expect(init.redirect).toBe('error')
    expect(await gh.status('github')).toEqual({ saved: true, account: 'pau', site: 'https://github.com' })

    for (const [status, msg] of [
      [401, 'GitHub ha rechazado el token (401). No se ha guardado.'],
      [503, 'GitHub ha rechazado el token (503). No se ha guardado.']
    ] as const) {
      const store = createSecretStore(enc)
      const r = await forgeSettings(store, answer(status) as unknown as typeof fetch).save('github', { token: TOKEN })
      expect(r).toEqual({ error: msg })
    }
    const offline = vi.fn(async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } })
    })
    expect(await forgeSettings(createSecretStore(enc), offline as unknown as typeof fetch).save('gitlab', { site: 'https://git.example.com', token: TOKEN })).toEqual({
      error: 'No se ha podido conectar con GitLab (ENOTFOUND).'
    })

    // GitLab: https only, checked before any request.
    const never = answer(200, { username: 'pau' })
    const gl = forgeSettings(createSecretStore(enc), never as unknown as typeof fetch)
    expect(await gl.save('gitlab', { site: 'http://git.example.com', token: TOKEN })).toEqual({ error: 'La dirección de GitLab debe empezar por https://' })
    expect(never).not.toHaveBeenCalled()
    expect(await gl.save('gitlab', { site: 'https://git.example.com/', token: TOKEN })).toEqual({ account: 'pau' })
    const [glUrl, glInit] = never.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(glUrl)).toBe('https://git.example.com/api/v4/user')
    expect((glInit.headers as Record<string, string>)['PRIVATE-TOKEN']).toBe(TOKEN)
    expect(await gl.status('gitlab')).toEqual({ saved: true, account: 'pau', site: 'https://git.example.com' })
  })

  it('forge status carries no token', async () => {
    const store = createSecretStore(enc)
    const gh = forgeSettings(store, answer(200, { login: 'pau' }) as unknown as typeof fetch)
    await gh.save('github', { token: TOKEN })
    const status = await gh.status('github')
    expect(Object.keys(status).sort()).toEqual(['account', 'saved', 'site'])
    expect(JSON.stringify(status)).not.toContain('super-secret')
    expect(await readFile(join(home, 'secrets.bin'), 'utf8')).not.toContain(TOKEN)
    await gh.delete('github')
    expect(await gh.status('github')).toEqual({ saved: false })
  })
})
