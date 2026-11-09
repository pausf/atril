import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSecretStore, type Encryptor } from '../credentials/store'
import { run, type Runner } from '../run'
import { cleanTmp, git, tmp } from '../test-helpers'
import { cloneAndRegister, createRepo } from './create'

const TOKEN = 'ghp_super-secret-forge-token'
const enc: Encryptor = {
  isAvailable: () => true,
  encrypt: (s) => Buffer.from(Buffer.from([...s].reverse().join('')).toString('base64')),
  decrypt: (b) => [...Buffer.from(b.toString(), 'base64').toString()].reverse().join('')
}
const json = (status: number, body: object) => vi.fn(async () => new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  process.env['ATRIL_HOME'] = tmp()
})
afterEach(() => {
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

async function connected() {
  const store = createSecretStore(enc)
  await store.saveSecret('github', { token: TOKEN, site: 'https://github.com' }, { account: 'pau', site: 'https://github.com' })
  await store.saveSecret('gitlab', { token: TOKEN, site: 'https://git.example.com' }, { account: 'pau', site: 'https://git.example.com' })
  return store
}

describe('create repo', () => {
  it('an invalid name sends nothing', async () => {
    const store = await connected()
    const f = json(201, {})
    for (const name of ['', ' ', 'a'.repeat(101), 'con espacio', 'ñu', 'a/b', '.', '..']) {
      expect(await createRepo(store, { forge: 'github', name, description: '', public: false }, f as unknown as typeof fetch)).toEqual({ error: 'Nombre de repo no válido' })
    }
    expect(f).not.toHaveBeenCalled()
    // A name the forge refuses anyway comes back as its detail.
    const refused = json(422, { message: 'Repository creation failed.', errors: [{ message: 'name already exists on this account' }] })
    expect(await createRepo(store, { forge: 'github', name: 'taken', description: '', public: false }, refused as unknown as typeof fetch)).toEqual({
      error: 'GitHub no ha creado el repo: name already exists on this account'
    })
  })

  it('creates a private repo with a readme', async () => {
    const store = await connected()
    const gh = json(201, { html_url: 'https://github.com/pau/atril-x', ssh_url: 'git@github.com:pau/atril-x.git', name: 'atril-x' })
    expect(await createRepo(store, { forge: 'github', name: 'atril-x', description: 'Pruebas', public: false }, gh as unknown as typeof fetch)).toEqual({
      url: 'https://github.com/pau/atril-x',
      sshUrl: 'git@github.com:pau/atril-x.git',
      path: 'atril-x'
    })
    const [url, init] = gh.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(url)).toBe('https://api.github.com/user/repos')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`)
    expect(JSON.parse(String(init.body))).toEqual({ name: 'atril-x', description: 'Pruebas', private: true, auto_init: true })

    const gl = json(201, { web_url: 'https://git.example.com/pau/mi.repo', ssh_url_to_repo: 'git@git.example.com:pau/mi.repo.git', path: 'mi.repo' })
    const r = await createRepo(store, { forge: 'gitlab', name: 'mi.repo', description: '', public: true }, gl as unknown as typeof fetch)
    expect(r).toEqual({ url: 'https://git.example.com/pau/mi.repo', sshUrl: 'git@git.example.com:pau/mi.repo.git', path: 'mi.repo' })
    const [glUrl, glInit] = gl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(glUrl)).toBe('https://git.example.com/api/v4/projects')
    expect(JSON.parse(String(glInit.body))).toEqual({ name: 'mi.repo', description: '', visibility: 'public', initialize_with_readme: true })

    // Not connected: nothing is sent.
    const empty = createSecretStore(enc)
    await empty.deleteSecret('github')
    const none = json(201, {})
    process.env['ATRIL_HOME'] = tmp()
    expect(await createRepo(createSecretStore(enc), { forge: 'github', name: 'x', description: '', public: false }, none as unknown as typeof fetch)).toEqual({ error: 'Conecta GitHub en Ajustes antes de crear un repo.' })
    expect(none).not.toHaveBeenCalled()
  })

  function origin(): string {
    const src = tmp()
    git(src, 'init', '-q')
    git(src, 'commit', '-q', '--allow-empty', '-m', 'readme')
    const bare = join(tmp(), 'atril-x.git')
    git(src, 'clone', '-q', '--bare', src, bare)
    return bare
  }
  function spy(): { runner: Runner; calls: string[] } {
    const calls: string[] = []
    return {
      calls,
      runner: (cmd, args, opts) => {
        calls.push([cmd, ...args, JSON.stringify(opts?.env ?? {})].join(' '))
        return run(cmd, args, opts)
      }
    }
  }

  it('clones over ssh and registers the repo', async () => {
    const folder = tmp()
    const { runner, calls } = spy()
    const r = await cloneAndRegister({ url: 'https://x/pau/atril-x', sshUrl: origin(), path: 'atril-x' }, folder, runner)
    expect(r).toEqual({ registered: 'atril-x' })
    expect(existsSync(join(folder, 'atril-x', '.git'))).toBe(true)
    expect(readFileSync(join(process.env['ATRIL_HOME']!, 'repos.json'), 'utf8')).toContain(join(folder, 'atril-x'))
    expect(calls.join('\n')).not.toContain(TOKEN)

    // Same name again elsewhere: the derived id is taken, the suggested one is used.
    const again = await cloneAndRegister({ url: 'https://x/pau/atril-x', sshUrl: origin(), path: 'atril-x' }, tmp(), runner)
    expect(again).toEqual({ registered: 'atril-x-2' })
  })

  it('a failed clone registers nothing', async () => {
    const folder = tmp()
    const { runner, calls } = spy()
    const missing = join(tmp(), 'nope.git')
    const r = await cloneAndRegister({ url: 'https://x/pau/y', sshUrl: missing, path: 'y' }, folder, runner)
    expect(r).toMatchObject({ cloneCommand: `git clone ${missing} ${join(folder, 'y')}` })
    expect('cloneError' in r && r.cloneError.startsWith('No se ha podido clonar por SSH')).toBe(true)
    expect(existsSync(join(process.env['ATRIL_HOME']!, 'repos.json'))).toBe(false)
    expect(calls.join('\n')).not.toContain(TOKEN)
  })

  it('an existing folder is not overwritten', async () => {
    const folder = tmp()
    mkdirSync(join(folder, 'atril-x'))
    const { runner, calls } = spy()
    const r = await cloneAndRegister({ url: 'https://x/pau/atril-x', sshUrl: origin(), path: 'atril-x' }, folder, runner)
    expect(r).toMatchObject({ cloneError: `La carpeta ${join(folder, 'atril-x')} ya existe: no se ha clonado.` })
    expect(calls.some((c) => c.startsWith('git clone'))).toBe(false)
  })
})
