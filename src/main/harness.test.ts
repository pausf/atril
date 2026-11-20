import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import { join } from 'node:path'

const repoRoot = join(__dirname, '../..')
const eslint = new ESLint({ cwd: repoRoot })

/** The messages the repo's real config gives `code` as if it lived at `filePath`. */
async function lint(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(repoRoot, filePath) })
  return result!.messages.map((m) => m.message)
}

const BOUNDARY = 'renderer y main solo hablan por preload'
const MOCK = 'usa mockApi() de src/renderer/mockApi.ts'
const HOME = 'las rutas de casa salen de paths.ts (ATRIL_HOME en tests)'

describe('harness', () => {
  it('lint refuses an import across main and renderer', async () => {
    expect(await lint("import { x } from '../main/paths'\nexport const y = x\n", 'src/renderer/a.ts')).toContainEqual(expect.stringContaining(BOUNDARY))
    expect(await lint("import type { X } from '../../main/paths'\nexport type Y = X\n", 'src/renderer/components/a.tsx')).toContainEqual(expect.stringContaining(BOUNDARY))
    expect(await lint("export { x } from '../renderer/a'\n", 'src/main/a.ts')).toContainEqual(expect.stringContaining(BOUNDARY))
    expect(await lint("import { x } from '../renderer/a'\nexport const y = x\n", 'src/main/b.ts')).toContainEqual(expect.stringContaining(BOUNDARY))
    // Tests may cross to compare constants, and preload is the bridge itself.
    expect(await lint("import { x } from '../main/paths'\nexport const y = x\n", 'src/renderer/a.test.ts')).not.toContainEqual(expect.stringContaining(BOUNDARY))
    expect(await lint("import type { X } from '../preload/api'\nexport type Y = X\n", 'src/renderer/a.ts')).not.toContainEqual(expect.stringContaining(BOUNDARY))
  })

  it('lint refuses a hand-made window.atril', async () => {
    const assignments: [string, ...string[]] = [
      'window.atril = {} as never\n',
      ';(window as unknown as { atril: unknown }).atril = {}\n',
      ';(globalThis as unknown as { atril: unknown }).atril = {}\n'
    ]
    for (const file of ['src/renderer/a.test.tsx', 'src/renderer/b.ts', 'src/main/c.ts', 'src/main/paths.ts', 'src/preload/d.ts'])
      for (const code of assignments) expect(await lint(code, file)).toContainEqual(expect.stringContaining(MOCK))
    expect(await lint(assignments[0], 'src/renderer/mockApi.ts')).not.toContainEqual(expect.stringContaining(MOCK))
    expect(await lint('export const a = window.atril\n', 'src/renderer/b.ts')).not.toContainEqual(expect.stringContaining(MOCK))
    // Both rules share no-restricted-syntax: the home rule must survive in main.
    expect(await lint("import { homedir } from 'node:os'\nexport const h = homedir()\n", 'src/main/c.ts')).toContainEqual(
      expect.stringContaining('las rutas de casa')
    )
  })

  it('lint refuses homedir outside paths', async () => {
    const calls: [string, ...string[]] = [
      "import { homedir } from 'node:os'\nexport const h = homedir()\n",
      "import os from 'node:os'\nexport const h = os.homedir()\n",
      'export const h = process.env.HOME\n',
      "export const h = process.env['HOME']\n"
    ]
    for (const code of calls) expect(await lint(code, 'src/main/forge/a.ts')).toContainEqual(expect.stringContaining(HOME))
    for (const file of ['src/main/paths.ts', 'src/main/trust.ts', 'src/main/qa.ts', 'src/main/a.test.ts'])
      expect(await lint(calls[0], file)).not.toContainEqual(expect.stringContaining(HOME))
    expect(await lint("export const h = (env: NodeJS.ProcessEnv) => env['HOME']\n", 'src/main/login-path.ts')).not.toContainEqual(expect.stringContaining(HOME))
  })
})
