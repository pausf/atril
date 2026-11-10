import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agentSpy, cleanTmp, git, killTmux, makeRegisteredRepo, tmp, tmuxSock } from './test-helpers'
import { librettoState, queueIdea, startQueued } from './libretto'
import { run } from './run'

let sock: string
let home: string
let repo: string

const changes = (): string => join(repo, '.agents', 'changes')
const proposal = (name: string, body: string, root = repo): void => {
  mkdirSync(join(root, '.agents', 'changes', name), { recursive: true })
  writeFileSync(join(root, '.agents', 'changes', name, 'proposal.md'), body)
}
const queuedBody = (name: string, date: string, reading = 'something'): string =>
  `# ${name}\n\nTracker: none\nQueued: ${date}\n\n## The ask, verbatim\n\n> x\n\n## Reading\n\n\n${reading}\nsecond line\n`
const commitAll = (): void => {
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'seed')
}

beforeEach(() => {
  sock = tmuxSock()
  home = tmp()
  process.env['ATRIL_TMUX_SOCKET'] = sock
  process.env['ATRIL_HOME'] = home
  repo = makeRegisteredRepo(home)
})
afterEach(() => {
  killTmux(sock)
  delete process.env['ATRIL_TMUX_SOCKET']
  delete process.env['ATRIL_HOME']
  cleanTmp()
})

describe('libretto', () => {
  it('a repo\'s queue and work in flight are read from disk', async () => {
    expect(await librettoState(repo)).toEqual({ none: true })

    proposal('b-idea', queuedBody('b-idea', '2026-11-02'))
    proposal('a-idea', queuedBody('a-idea', '2026-11-02', 'first reading'))
    proposal('old-idea', queuedBody('old-idea', '2026-10-01'))
    // «Queued:» after the first heading does not count: that folder is in flight.
    proposal('late', '# late\n\n## Reading\n\nQueued: 2026-09-01\n')
    proposal('doing', '# doing\n\nTracker: none\n\n## Checklist\n\n- [x] one\n- [ ] two\n- [ ] three\n')
    proposal('nobox', '# nobox\n')
    mkdirSync(join(changes(), 'empty'))
    commitAll()
    git(repo, 'branch', 'feat/a-idea')

    const s = await librettoState(repo)
    if (!('queued' in s)) throw new Error('expected a state')
    expect(s.queued).toEqual([
      { name: 'old-idea', date: '2026-10-01', reading: 'something', started: false },
      { name: 'a-idea', date: '2026-11-02', reading: 'first reading', started: true },
      { name: 'b-idea', date: '2026-11-02', reading: 'something', started: false }
    ])
    const flight = Object.fromEntries(s.inFlight.map((f) => [f.name, f]))
    expect(Object.keys(flight).sort()).toEqual(['doing', 'empty', 'late', 'nobox'])
    expect(flight['doing']).toEqual({ name: 'doing', closed: 1, total: 3, firstOpen: 'two' })
    expect(flight['nobox']).toEqual({ name: 'nobox', closed: 0, total: 0 })
  })

  it('queueing an idea writes and commits only its proposal', async () => {
    mkdirSync(changes(), { recursive: true })
    writeFileSync(join(changes(), '.gitkeep'), '')
    commitAll()
    // Another file already staged, and another one dirty: neither may ride in the commit.
    writeFileSync(join(repo, 'staged.txt'), 's')
    git(repo, 'add', 'staged.txt')
    writeFileSync(join(repo, 'a.txt'), 'dirty')
    const head = git(repo, 'rev-parse', 'HEAD').trim()

    const r = await queueIdea(repo, '  Añadir «descuentos» relativos!!\nsegunda línea  ', run)
    expect(r).toEqual({ name: 'anadir-descuentos-relativos' })

    const file = join(changes(), 'anadir-descuentos-relativos', 'proposal.md')
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(readFileSync(file, 'utf8')).toBe(
      `# anadir-descuentos-relativos\n\nTracker: none\nQueued: ${iso}\n\n## The ask, verbatim\n\n> Añadir «descuentos» relativos!!\n> segunda línea\n\n## Reading\n\n`
    )
    expect(git(repo, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): capture anadir-descuentos-relativos')
    expect(git(repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').trim()).toBe('.agents/changes/anadir-descuentos-relativos/proposal.md')
    expect(git(repo, 'rev-parse', 'HEAD~1').trim()).toBe(head)
    expect(git(repo, 'status', '--porcelain').split('\n').filter(Boolean).sort()).toEqual([' M a.txt', 'A  staged.txt'])

    // Taken names get a suffix that still fits in 40; a long one is cut; a symbol-only one is «idea».
    expect(await queueIdea(repo, 'Añadir descuentos relativos', run)).toEqual({ name: 'anadir-descuentos-relativos-2' })
    const long = await queueIdea(repo, 'x'.repeat(60), run)
    expect(long).toEqual({ name: 'x'.repeat(40) })
    expect(await queueIdea(repo, 'x'.repeat(60), run)).toEqual({ name: `${'x'.repeat(38)}-2` })
    expect(await queueIdea(repo, '¡¿?!', run)).toEqual({ name: 'idea' })
  })

  it('queueing refuses blank text or a repo without changes and cleans up a failed commit', async () => {
    expect('error' in (await queueIdea(repo, '   \n ', run))).toBe(true)
    expect(existsSync(join(repo, '.agents'))).toBe(false)
    // No .agents/changes/: nothing written.
    expect('error' in (await queueIdea(repo, 'idea', run))).toBe(true)
    expect(existsSync(join(repo, '.agents'))).toBe(false)

    mkdirSync(changes(), { recursive: true })
    writeFileSync(join(changes(), '.gitkeep'), '')
    commitAll()
    const failing: typeof run = (cmd, args, opts) => (args.includes('commit') ? Promise.resolve({ code: 1, stdout: '', stderr: 'boom' }) : run(cmd, args, opts))
    expect(await queueIdea(repo, 'hola mundo', failing)).toEqual({ error: 'boom' })
    expect(existsSync(join(changes(), 'hola-mundo'))).toBe(false)
    expect(git(repo, 'status', '--porcelain').trim()).toBe('')
  })

  it('starting a queued idea opens its work at write-spec', async () => {
    proposal('my-idea', queuedBody('my-idea', '2026-11-02'))
    commitAll()
    const spy = agentSpy(run)

    const r = await startQueued('demo', 'my-idea', spy.run)
    if (!('workspace' in r)) throw new Error(r.error)

    expect(r.workspace.branch).toBe('feat/my-idea')
    const text = readFileSync(join(r.workspace.path, '.agents', 'changes', 'my-idea', 'proposal.md'), 'utf8')
    expect(text).not.toMatch(/^Queued:/m)
    expect(git(r.workspace.path, 'log', '-1', '--format=%s').trim()).toBe('docs(queue): start my-idea')
    expect(git(r.workspace.path, 'status', '--porcelain').trim()).toBe('')
    // The commit is in before the agent is given its first message, which is the write-spec step.
    expect(spy.argvs).toHaveLength(1)
    expect(spy.argvs[0]?.at(-1)).toBe('/libretto:write-spec my-idea')
    // The queued file in the repo's own checkout is untouched.
    expect(readFileSync(join(changes(), 'my-idea', 'proposal.md'), 'utf8')).toMatch(/^Queued:/m)

    const s = await librettoState(repo)
    if (!('queued' in s)) throw new Error('expected a state')
    expect(s.queued[0]?.started).toBe(true)
  })

  it('starting refuses what it cannot open and commits nothing', async () => {
    proposal('my-idea', queuedBody('my-idea', '2026-11-02'))
    commitAll()
    const head = git(repo, 'rev-parse', 'HEAD').trim()
    expect('error' in (await startQueued('nope', 'my-idea', run))).toBe(true)
    expect('error' in (await startQueued('demo', '../x', run))).toBe(true)
    // A name with no proposal: the worktree opened for it is taken away again.
    const r = await startQueued('demo', 'ghost', agentSpy(run).run)
    expect('error' in r).toBe(true)
    expect(git(repo, 'branch', '--list', 'feat/ghost').trim()).toBe('')
    expect(git(repo, 'worktree', 'list').trim().split('\n')).toHaveLength(1)
    expect(git(repo, 'rev-parse', 'HEAD').trim()).toBe(head)
  })
})
