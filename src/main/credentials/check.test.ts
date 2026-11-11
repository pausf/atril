import { describe, expect, it } from 'vitest'
import { checkJira } from './check'

const creds = { site: 'https://x.atlassian.net', email: 'a@b.c', token: 'SECRET-TOKEN' }
const reply = (status: number, body: unknown = {}) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch

describe('checkJira', () => {
  it('check shows the account or the error', async () => {
    expect(await checkJira(creds, reply(200, { displayName: 'Ana Pérez' }))).toEqual({ account: 'Ana Pérez' })

    const bad = await checkJira(creds, reply(401))
    expect(bad).toHaveProperty('error')
    expect(JSON.stringify(bad)).not.toContain('SECRET-TOKEN')

    const down = await checkJira(creds, (async () => { throw new Error(`boom ${creds.token}`) }) as typeof fetch)
    expect(JSON.stringify(down)).not.toContain('SECRET-TOKEN')

    expect(await checkJira({ ...creds, site: 'http://x.atlassian.net' }, reply(200))).toHaveProperty('error')
  })

  it('network failure names the cause and folds the code', async () => {
    const failing = (code?: string) =>
      (async () => {
        throw Object.assign(new TypeError('fetch failed'), code ? { cause: { code } } : {})
      }) as typeof fetch
    const site = { ...creds, site: 'https://127.0.0.1:9' }
    const tip = 'Revisa la dirección: la de tu Jira suele ser https://tuempresa.atlassian.net.'
    const cases: Array<[string | undefined, string]> = [
      ['ENOTFOUND', 'No encuentro 127.0.0.1:9.'],
      ['EAI_AGAIN', 'No encuentro 127.0.0.1:9.'],
      ['CERT_HAS_EXPIRED', 'El certificado de 127.0.0.1:9 no es válido.'],
      ['SELF_SIGNED_CERT_IN_CHAIN', 'El certificado de 127.0.0.1:9 no es válido.'],
      ['ECONNREFUSED', 'No responde nada en https://127.0.0.1:9.'],
      [undefined, 'No responde nada en https://127.0.0.1:9.']
    ]
    for (const [code, sentence] of cases) {
      const r = (await checkJira(site, failing(code))) as { error: string; detail?: string }
      expect(r.error, code).toBe(`${sentence} ${tip}`)
      expect(r.error, code).not.toContain('TypeError')
      expect(r.detail, code).toBe(code ?? 'TypeError')
    }
  })

  it('avatar comes back as image data and the token only goes to the jira site', async () => {
    const seen: { url: string; auth: string | null }[] = []
    const png = Buffer.from([137, 80, 78, 71])
    const fake = (async (url: URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get('authorization')
      seen.push({ url: String(url), auth })
      if (String(url).endsWith('/myself'))
        return new Response(JSON.stringify({ displayName: 'Ana', avatarUrls: { '48x48': 'https://cdn.example.net/a.png' } }))
      return new Response(png, { headers: { 'content-type': 'image/png' } })
    }) as unknown as typeof fetch

    const r = await checkJira(creds, fake)
    expect(r).toEqual({ account: 'Ana', avatar: `data:image/png;base64,${png.toString('base64')}` })
    expect(seen[0]!.auth).toMatch(/^Basic /)
    expect(seen[1]!.auth).toBeNull()

    const huge = (async (url: URL) =>
      String(url).endsWith('/myself')
        ? new Response(JSON.stringify({ displayName: 'Ana', avatarUrls: { '48x48': 'https://cdn.example.net/a.png' } }))
        : new Response(Buffer.alloc(200 * 1024 + 1), { headers: { 'content-type': 'image/png' } })) as unknown as typeof fetch
    expect(await checkJira(creds, huge)).toEqual({ account: 'Ana' })
  })
})
