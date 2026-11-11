// Usage: node scripts/bundle-libretto.mjs [ref]
// Copies Libretto's payload from a git ref (or, when the source is not a git repo, its working
// tree) into resources/libretto/ as a Claude Code plugin.
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinModels } from './libretto-models.mjs'

const SOURCE = join(homedir(), 'gitrepos/libretto-automata')
const ITEMS = ['skills', 'agents', 'commands', 'LICENSE', 'THIRD-PARTY.md', 'licenses']
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'libretto')
const ref = process.argv[2] ?? 'HEAD'

const out = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim()
const isGit = (() => {
  try {
    return out('git', ['rev-parse', '--is-inside-work-tree'], SOURCE) === 'true'
  } catch {
    return false
  }
})()

// Refuses any symlink under `dir` that resolves outside `boundary`.
function assertInside(dir, boundary) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const real = realpathSync(p)
    const rel = relative(boundary, real)
    if (rel.startsWith('..') || resolve(boundary, rel) !== real) throw new Error(`${p} resolves outside the source: ${real}`)
    if (lstatSync(p).isDirectory()) assertInside(p, boundary)
  }
}

const stage = mkdtempSync(join(tmpdir(), 'bundle-libretto-'))
try {
  let version
  let note
  if (isGit) {
    const sha = out('git', ['rev-parse', '--verify', `${ref}^{commit}`], SOURCE)
    const tar = execFileSync('git', ['archive', '--format=tar', sha, ...ITEMS], { cwd: SOURCE, maxBuffer: 1 << 28 })
    execFileSync('tar', ['-x', '-C', stage], { input: tar })
    assertInside(stage, realpathSync(stage))
    version = sha
    note = `git ${sha} (${ref})`
  } else {
    const root = realpathSync(SOURCE)
    for (const item of ITEMS) {
      const from = join(root, item)
      if (lstatSync(from).isDirectory()) assertInside(from, root)
      else if (!realpathSync(from).startsWith(root + '/')) throw new Error(`${from} resolves outside the source`)
      cpSync(from, join(stage, item), { recursive: true, dereference: true })
    }
    const first = out('libretto', ['--help']).split('\n')[0] ?? ''
    version = first.match(/v\d+\.\d+\.\d+\S*/)?.[0]
    if (!version) throw new Error(`cannot read a version from «${first}»`)
    note = `${version} dirty-copy`
  }

  // W151: Atril's model choice for Libretto's reviewers, applied before the copy lands.
  const agents = join(stage, 'agents')
  for (const f of readdirSync(agents).filter((f) => f.endsWith('.md'))) {
    const p = join(agents, f)
    writeFileSync(p, pinModels(readFileSync(p, 'utf8'), f.slice(0, -3)))
  }
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(join(OUT, '.claude-plugin'), { recursive: true })
  for (const item of ITEMS) cpSync(join(stage, item), join(OUT, item), { recursive: true, dereference: true })
  writeFileSync(
    join(OUT, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'libretto', version, description: `Libretto flow, bundled with Atril from ${note}` }, null, 2) + '\n'
  )
  process.stdout.write(`bundled libretto ${note} into ${OUT}\n`)
} finally {
  rmSync(stage, { recursive: true, force: true })
}
