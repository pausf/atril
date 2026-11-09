import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** safeStorage in the app; a fake reversible one in tests. */
export interface Encryptor {
  isAvailable(): boolean
  encrypt(plain: string): Buffer
  decrypt(cipher: Buffer): string
}

export interface SecretStatus {
  saved: boolean
  account?: string
  site?: string
}

export type SaveResult = { ok: true } | { error: string }

interface Entry {
  cipher: string
  account?: string
  site?: string
}

const file = (): string => join(process.env['ATRIL_HOME'] ?? join(homedir(), '.atril'), 'secrets.bin')

async function readAll(): Promise<Record<string, Entry>> {
  try {
    return JSON.parse(await readFile(file(), 'utf8')) as Record<string, Entry>
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw err
  }
}

async function writeAll(all: Record<string, Entry>): Promise<void> {
  const target = file()
  await mkdir(join(target, '..'), { recursive: true })
  const tmp = `${target}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(all), { mode: 0o600 })
  await rename(tmp, target)
}

export function createSecretStore(enc: Encryptor) {
  return {
    /** Account and site are not secret, so they sit beside the ciphertext for hasSecret. */
    async saveSecret(
      service: string,
      fields: Record<string, string>,
      meta: { account?: string; site?: string } = {}
    ): Promise<SaveResult> {
      if (!enc.isAvailable())
        return { error: 'El Llavero de macOS no está disponible: Atril no guarda tokens sin cifrarlos.' }
      const all = await readAll()
      all[service] = { cipher: enc.encrypt(JSON.stringify(fields)).toString('base64'), ...meta }
      await writeAll(all)
      return { ok: true }
    },

    async hasSecret(service: string): Promise<SecretStatus> {
      const e = (await readAll())[service]
      return e ? { saved: true, account: e.account, site: e.site } : { saved: false }
    },

    async deleteSecret(service: string): Promise<void> {
      const all = await readAll()
      delete all[service]
      await writeAll(all)
    },

    /** Main-process callers only: never wire this to IPC. */
    async readSecret(service: string): Promise<Record<string, string> | null> {
      const e = (await readAll())[service]
      if (!e || !enc.isAvailable()) return null
      return JSON.parse(enc.decrypt(Buffer.from(e.cipher, 'base64'))) as Record<string, string>
    }
  }
}

export type SecretStore = ReturnType<typeof createSecretStore>
