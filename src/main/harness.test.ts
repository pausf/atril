import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const repoRoot = join(__dirname, '../..')
const eslint = new ESLint({ cwd: repoRoot })

const ZERO = '0'.repeat(40)
const prePush = join(repoRoot, '.githooks/pre-push')
const text = (r: { stdout: string; stderr: string }): string => r.stdout + r.stderr
const pushLine = (sha: string): string => `refs/heads/main ${sha} refs/heads/main ${ZERO}\n`

/** A temp HOME (with the private list when `list` is given) and a git repo whose first commit holds `files`. */
function pushFixture(files: Record<string, string>, list?: string) {
  const root = mkdtempSync(join(tmpdir(), 'atril-prepush-'))
  const home = join(root, 'home')
  mkdirSync(join(home, '.config/atril'), { recursive: true })
  if (list !== undefined) writeFileSync(join(home, '.config/atril/work-identifiers.txt'), list)
  const repo = join(root, 'repo')
  mkdirSync(repo)
  const env = { ...process.env, HOME: home }
  const git = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8', env })
  git('init', '-q', '-b', 'main')
  for (const [name, body] of Object.entries(files)) writeFileSync(join(repo, name), body)
  git('add', '.')
  git('commit', '-q', '-m', 'x')
  const sha = git('rev-parse', 'HEAD').stdout.trim()
  const hook = (stdin: string) => spawnSync('sh', [prePush], { cwd: repo, input: stdin, encoding: 'utf8', env })
  return { root, home, repo, git, sha, hook, clean: () => rmSync(root, { recursive: true, force: true }) }
}

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
    expect(await lint("import { x } from '../main'\nexport const y = x\n", 'src/renderer/c.ts')).toContainEqual(expect.stringContaining(BOUNDARY))
    expect(await lint("import { x } from '../renderer'\nexport const y = x\n", 'src/main/c.ts')).toContainEqual(expect.stringContaining(BOUNDARY))
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
    expect(await lint(assignments[0], 'test/setup.ts')).toContainEqual(expect.stringContaining(MOCK))
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
    expect(await lint("import { homedir as h } from 'node:os'\nexport const p = h()\n", 'src/main/forge/b.ts')).toContainEqual(expect.stringContaining(HOME))
    for (const file of ['src/main/paths.ts', 'src/main/trust.ts', 'src/main/qa.ts', 'src/main/a.test.ts'])
      expect(await lint(calls[0], file)).not.toContainEqual(expect.stringContaining(HOME))
    expect(await lint("export const h = (env: NodeJS.ProcessEnv) => env['HOME']\n", 'src/main/login-path.ts')).not.toContainEqual(expect.stringContaining(HOME))
  })

  it('prepare points git at the hooks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atril-prepare-'))
    try {
      spawnSync('git', ['init', '-q'], { cwd: dir })
      const prepare = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts.prepare as string
      expect(spawnSync('sh', ['-c', prepare], { cwd: dir }).status).toBe(0)
      expect(spawnSync('git', ['config', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' }).stdout.trim()).toBe('.githooks')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the pre-commit hook stops a red commit', () => {
    const bin = mkdtempSync(join(tmpdir(), 'atril-hook-'))
    try {
      // A pnpm that fails only for the script named in FAIL.
      writeFileSync(join(bin, 'pnpm'), '#!/bin/sh\nfor a in "$@"; do [ "$a" = "$FAIL" ] && exit 1; done\nexit 0\n')
      chmodSync(join(bin, 'pnpm'), 0o755)
      const run = (fail: string): number | null =>
        spawnSync('sh', [join(repoRoot, '.githooks/pre-commit')], { env: { ...process.env, PATH: `${bin}:${process.env['PATH']}`, FAIL: fail } }).status
      expect(run('typecheck')).not.toBe(0)
      expect(run('lint')).not.toBe(0)
      expect(run('none')).toBe(0)
    } finally {
      rmSync(bin, { recursive: true, force: true })
    }
  })

  it('the pre-push hook refuses a work identifier', () => {
    const fx = pushFixture({ 'a.txt': 'clean\n' }, 'acme-secret\n')
    try {
      // The identifier sits in another branch (case differs from the list); HEAD is clean.
      fx.git('checkout', '-q', '-b', 'other')
      writeFileSync(join(fx.repo, 'notes.txt'), 'talking about ACME-Secret here\n')
      fx.git('add', '.')
      fx.git('commit', '-q', '-m', 'y')
      const other = fx.git('rev-parse', 'HEAD').stdout.trim()
      fx.git('checkout', '-q', 'main')
      const refused = fx.hook(pushLine(other))
      expect(refused.status).not.toBe(0)
      expect(text(refused)).toContain(`${other}:notes.txt:1:`)
      expect(fx.hook(pushLine(fx.sha)).status).toBe(0)

      // A lock line that is not an integrity line is scanned.
      const lock = pushFixture({ 'pnpm-lock.yaml': 'x:\n  resolution: {tarball: https://r/acme-secret-1.tgz}\n' }, 'acme-secret\n')
      try {
        const r = lock.hook(pushLine(lock.sha))
        expect(r.status).not.toBe(0)
        expect(text(r)).toContain(`${lock.sha}:pnpm-lock.yaml:2:`)
      } finally {
        lock.clean()
      }

      // A real push: git must run the hook (executable bit, stdin format) and stop.
      const bare = join(fx.root, 'remote.git')
      spawnSync('git', ['init', '-q', '--bare', bare])
      fx.git('remote', 'add', 'origin', bare)
      const hooks = `core.hooksPath=${join(repoRoot, '.githooks')}`
      fx.git('checkout', '-q', 'other')
      const push = fx.git('-c', hooks, 'push', 'origin', 'other')
      expect(push.status).not.toBe(0)
      expect(spawnSync('git', ['--git-dir', bare, 'rev-parse', '--verify', '-q', 'refs/heads/other']).status).not.toBe(0)
      // Control: the same push of a clean branch goes through, so the refusal above was the hook's.
      expect(fx.git('-c', hooks, 'push', 'origin', 'main').status).toBe(0)
    } finally {
      fx.clean()
    }
  })

  it('the pre-push hook lets clean pushes through', () => {
    const body = { 'n.txt': 'acme-secret\n' }
    const cases: [string, ReturnType<typeof pushFixture>, (fx: ReturnType<typeof pushFixture>) => string][] = [
      ['no list', pushFixture(body), (fx) => pushLine(fx.sha)],
      ['a list of blank lines', pushFixture(body, '\n  \n\t\n'), (fx) => pushLine(fx.sha)],
      ['no match', pushFixture({ 'n.txt': 'fine\n' }, 'acme-secret\n'), (fx) => pushLine(fx.sha)],
      ['a delete push', pushFixture(body, 'acme-secret\n'), (fx) => `(delete) ${ZERO} refs/heads/old ${fx.sha}\n`],
      [
        'an integrity line',
        pushFixture({ 'pnpm-lock.yaml': '  resolution: {integrity: sha512-acme-secret=}\n' }, 'acme-secret\n'),
        (fx) => pushLine(fx.sha)
      ]
    ]
    try {
      for (const [name, fx, stdin] of cases) expect(fx.hook(stdin(fx)).status, name).toBe(0)
    } finally {
      for (const [, fx] of cases) fx.clean()
    }
  })

  it('the pre-push hook refuses when the scan itself fails', () => {
    const SAID = 'work-identifier scan failed'
    const bad = pushFixture({ 'a.txt': 'x\n' }, '(\n')
    const locked = pushFixture({ 'a.txt': 'x\n' }, 'acme-secret\n')
    const unknown = pushFixture({ 'a.txt': 'x\n' }, 'acme-secret\n')
    try {
      const r = bad.hook(pushLine(bad.sha))
      expect(r.status).not.toBe(0)
      expect(text(r)).toContain(SAID)
      const list = join(locked.home, '.config/atril/work-identifiers.txt')
      chmodSync(list, 0o000)
      const l = locked.hook(pushLine(locked.sha))
      chmodSync(list, 0o600)
      expect(l.status).not.toBe(0)
      expect(text(l)).toContain(SAID)
      const u = unknown.hook(pushLine('1'.repeat(40)))
      expect(u.status).not.toBe(0)
      expect(text(u)).toContain(SAID)
    } finally {
      bad.clean()
      locked.clean()
      unknown.clean()
    }
  })

  /** Runs the command that .claude/settings.json registers for Bash, the way Claude Code would. */
  function guard(stdin: string): { status: number | null; stdout: string; stderr: string } {
    const settings = JSON.parse(readFileSync(join(repoRoot, '.claude/settings.json'), 'utf8'))
    const entry = settings.hooks.PreToolUse.find((e: { matcher: string }) => e.matcher === 'Bash')
    expect(entry.hooks[0].type).toBe('command')
    return spawnSync('sh', ['-c', entry.hooks[0].command], { input: stdin, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: repoRoot } })
  }
  const bash = (command: string): string => JSON.stringify({ tool_name: 'Bash', tool_input: { command } })

  it('the build guard denies pnpm build', () => {
    for (const command of [
      'pnpm build',
      'pnpm run build',
      'pnpm -s build',
      'pnpm  build',
      'pnpm run -s build',
      'pnpm build --mode x',
      'cd x && pnpm build',
      'pnpm test; pnpm build',
      'false || pnpm build',
      'cat f | pnpm build',
      'echo hi\npnpm build'
    ]) {
      const r = guard(bash(command))
      expect(r.status, command).toBe(2)
      expect(r.stderr.trim(), command).toMatch(/^[^\n]*never built[^\n]*$/)
    }
  })

  it('the build guard lets everything else through', () => {
    const payloads = [
      bash('pnpm -s typecheck'),
      bash('pnpm test'),
      bash('pnpm builder'),
      bash('git commit -m "never pnpm build"'),
      bash('rg "pnpm build" CLAUDE.md'),
      JSON.stringify({ tool_name: 'Edit', tool_input: { command: 'pnpm build' } }),
      'not json',
      '{}',
      ''
    ]
    for (const p of payloads) {
      const r = guard(p)
      expect([r.status, r.stdout, r.stderr], p).toEqual([0, '', ''])
    }
  })
})
