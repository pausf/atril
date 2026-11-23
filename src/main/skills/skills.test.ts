import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { SkillItem } from '../../preload/api'
import { claudeDir } from '../paths'
import { listSkills } from './read'
import { revealFile, setSkill } from './write'

const made: string[] = []
const tmp = (): string => {
  const d = realpathSync(mkdtempSync(join(tmpdir(), 'atril-skills-')))
  made.push(d)
  return d
}
const put = (root: string, rel: string, text: string): string => {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return file
}
const saved = process.env['ATRIL_CLAUDE_DIR']
afterEach(() => {
  if (saved === undefined) delete process.env['ATRIL_CLAUDE_DIR']
  else process.env['ATRIL_CLAUDE_DIR'] = saved
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true })
})

const skill = (fields: string, body = 'Haz esto.'): string => `---\n${fields}\n---\n${body}`
const find = (items: SkillItem[], origin: string, name: string, kind = 'skill'): SkillItem | undefined =>
  items.find((i) => i.origin === origin && i.name === name && i.kind === kind)

/** A claude dir, a repo and Atril's Libretto folder; plugins installed in the first shape. */
function seed(): { claude: string; repo: string; libretto: string; plugin: string } {
  const claude = tmp()
  const repo = tmp()
  const libretto = tmp()
  const plugin = tmp()
  put(
    claude,
    'skills/revisar-cambios/SKILL.md',
    skill(
      [
        'name: revisar-cambios',
        'description: "Revisa el diff: busca fallos"',
        'when_to_use: >',
        '  Cuando acabas un cambio',
        '  y antes del commit.',
        'argument-hint: [rama]',
        'allowed-tools: [Read, Grep, "Bash(git diff:*)"]',
        'model: sonnet',
        'effort: high',
        'disable-model-invocation: yes',
        'user-invocable: false',
        'metadata:',
        '  author: acme'
      ].join('\n'),
      'Primero lee el diff.\n'
    )
  )
  put(claude, 'skills/sin-nombre/SKILL.md', skill('description: Sin nombre en la cabecera'))
  put(claude, 'commands/deploy.md', skill("description: 'Despliega shop-web'\nallowed-tools:\n  - Bash\n  - Read"))
  put(claude, 'commands/sub/anidado.md', skill('description: no cuenta'))
  put(repo, '.claude/skills/escribir-docs/SKILL.md', skill('description: Escribe la documentación'))
  put(repo, '.claude/commands/probar.md', 'Sin cabecera: ejecuta los tests.')
  put(plugin, 'skills/formatear/SKILL.md', skill('description: Formatea el código'))
  put(plugin, 'commands/limpiar.md', skill('description: Limpia'))
  put(claude, 'plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins: { 'estilo@acme': [{ scope: 'user', installPath: plugin }] } }))
  put(libretto, 'skills/evidence/SKILL.md', skill('name: evidence\ndescription: Nada es cierto hasta verlo'))
  put(libretto, 'commands/libretto-flow.md', skill('description: Lleva el flujo'))
  process.env['ATRIL_CLAUDE_DIR'] = claude
  return { claude, repo, libretto, plugin }
}
const repos = (path: string) => async () => [{ id: 'shop-web', path }]

describe('skills', () => {
  it('lists skills and commands from every origin with their header', async () => {
    const { claude, repo, libretto, plugin } = seed()
    expect(claudeDir()).toBe(claude)
    const { items, warnings } = await listSkills('shop-web', repos(repo), libretto)
    expect(warnings).toEqual([])

    const rc = find(items, 'personal', 'revisar-cambios')
    expect(rc).toMatchObject({
      kind: 'skill',
      path: join(claude, 'skills/revisar-cambios/SKILL.md'),
      description: 'Revisa el diff: busca fallos',
      whenToUse: 'Cuando acabas un cambio y antes del commit.',
      argumentHint: '[rama]',
      allowedTools: ['Read', 'Grep', 'Bash(git diff:*)'],
      model: 'sonnet',
      effort: 'high',
      disableModelInvocation: true,
      userInvocable: false,
      body: 'Primero lee el diff.\n'
    })
    expect(rc?.broken).toBeUndefined()
    expect(find(items, 'personal', 'sin-nombre')?.description).toBe('Sin nombre en la cabecera')
    expect(find(items, 'personal', 'deploy', 'command')).toMatchObject({ description: 'Despliega shop-web', allowedTools: ['Bash', 'Read'], path: join(claude, 'commands/deploy.md') })
    expect(items.some((i) => i.name === 'anidado')).toBe(false)

    expect(find(items, 'project', 'escribir-docs')?.path).toBe(join(repo, '.claude/skills/escribir-docs/SKILL.md'))
    // A command without frontmatter is a plain command: its whole text is the body.
    expect(find(items, 'project', 'probar', 'command')).toMatchObject({ body: 'Sin cabecera: ejecuta los tests.' })
    expect(find(items, 'project', 'probar', 'command')?.broken).toBeUndefined()

    expect(find(items, 'plugin', 'formatear')).toMatchObject({ plugin: 'estilo@acme', path: join(plugin, 'skills/formatear/SKILL.md') })
    expect(find(items, 'plugin', 'limpiar', 'command')?.plugin).toBe('estilo@acme')
    expect(find(items, 'atril', 'evidence')).toMatchObject({ plugin: 'libretto', description: 'Nada es cierto hasta verlo' })
    expect(find(items, 'atril', 'libretto-flow', 'command')?.plugin).toBe('libretto')
    expect(items).toHaveLength(9)

    // Without a repo there is no project origin and nothing to warn about.
    const none = await listSkills(undefined, repos(repo), libretto)
    expect(none.items.some((i) => i.origin === 'project')).toBe(false)
    expect(none.warnings).toEqual([])
    // An unknown repo and a failing repo list each say so once.
    const unknown = await listSkills('otro', repos(repo), libretto)
    expect(unknown.items.some((i) => i.origin === 'project')).toBe(false)
    expect(unknown.warnings).toHaveLength(1)
    const failed = await listSkills('shop-web', async () => ({ problem: { error: 'roto', detail: 'x', fix: 'reveal', file: 'repos' } }), libretto)
    expect(failed.items.some((i) => i.origin === 'project')).toBe(false)
    expect(failed.warnings).toHaveLength(1)
  })

  it('reads the second shape of installed_plugins.json and follows linked skills', async () => {
    const { claude, libretto, plugin } = seed()
    put(claude, 'plugins/installed_plugins.json', JSON.stringify({ 'estilo@acme': { installPath: plugin } }))
    const elsewhere = tmp()
    put(elsewhere, 'enlazada/SKILL.md', skill('description: Vive en otra carpeta'))
    symlinkSync(join(elsewhere, 'enlazada'), join(claude, 'skills/enlazada'))
    const { items } = await listSkills(undefined, repos(''), libretto)
    expect(find(items, 'plugin', 'formatear')?.plugin).toBe('estilo@acme')
    expect(find(items, 'personal', 'enlazada')?.description).toBe('Vive en otra carpeta')
  })

  it('a broken header never hides the rest', async () => {
    const { claude, repo, libretto } = seed()
    put(claude, 'skills/sin-cierre/SKILL.md', '---\nname: otro-nombre\ndescription: nunca se cierra\n')
    put(claude, 'skills/linea-rara/SKILL.md', '---\ndescription: bien\nesto no es una clave\n---\nCuerpo')
    put(repo, '.claude/commands/mal.md', '---\n: : :\n---\n')
    rmSync(join(libretto, 'commands'), { recursive: true })
    const { items, warnings } = await listSkills('shop-web', repos(repo), libretto)
    expect(find(items, 'personal', 'sin-cierre')).toMatchObject({ broken: true, kind: 'skill' })
    expect(find(items, 'personal', 'linea-rara')?.broken).toBe(true)
    expect(find(items, 'project', 'mal', 'command')?.broken).toBe(true)
    expect(find(items, 'personal', 'revisar-cambios')?.broken).toBeUndefined()
    // a missing folder adds nothing and says nothing
    expect(items.some((i) => i.origin === 'atril' && i.kind === 'command')).toBe(false)
    expect(find(items, 'atril', 'evidence')).toBeDefined()
    expect(warnings).toEqual([])
    // no claude dir at all
    process.env['ATRIL_CLAUDE_DIR'] = join(tmp(), 'no-existe')
    const empty = await listSkills(undefined, repos(repo), libretto)
    expect(empty.items.map((i) => i.origin)).toEqual(['atril'])
    expect(empty.warnings).toEqual([])
  })

  it('a huge file or folder is cut with a warning', async () => {
    const { claude, repo, libretto } = seed()
    put(claude, 'skills/enorme/SKILL.md', skill('description: grande', 'x'.repeat(256 * 1024 + 1)))
    for (let i = 0; i < 305; i++) put(repo, `.claude/commands/c${String(i).padStart(3, '0')}.md`, skill(`description: comando ${i}`))
    const { items, warnings } = await listSkills('shop-web', repos(repo), libretto)
    const enorme = find(items, 'personal', 'enorme')
    expect(enorme?.description).toBeUndefined()
    expect(enorme?.body).toBe('')
    expect(warnings.filter((w) => w.includes(join(claude, 'skills')))).toHaveLength(1)
    expect(items.filter((i) => i.origin === 'project' && i.kind === 'command')).toHaveLength(300)
    expect(warnings.filter((w) => w.includes(join(repo, '.claude/commands')))).toHaveLength(1)
    expect(warnings).toHaveLength(2)
    expect(find(items, 'personal', 'revisar-cambios')?.description).toBe('Revisa el diff: busca fallos')
  })

  it('an unreadable settings or plugins file is a warning', async () => {
    const { claude, repo, libretto } = seed()
    const plugins = put(claude, 'plugins/installed_plugins.json', '{ no es json')
    const settings = put(claude, 'settings.json', '[')
    const local = put(repo, '.claude/settings.local.json', 'nope')
    const { items, warnings } = await listSkills('shop-web', repos(repo), libretto)
    expect(items.some((i) => i.origin === 'plugin')).toBe(false)
    expect(find(items, 'personal', 'revisar-cambios')).toBeDefined()
    expect(warnings).toHaveLength(3)
    for (const f of [plugins, settings, local]) expect(warnings.filter((w) => w.includes(f))).toHaveLength(1)
  })
  it('state comes from skillOverrides and plugins from enabledPlugins', async () => {
    const { claude, repo, libretto } = seed()
    put(claude, 'settings.json', JSON.stringify({ skillOverrides: { 'revisar-cambios': 'off', deploy: 'name-only', 'escribir-docs': 'off', formatear: 'off', evidence: 'off', 'sin-nombre': 'raro' }, enabledPlugins: { 'estilo@acme': false } }))
    put(repo, '.claude/settings.json', JSON.stringify({ skillOverrides: { 'escribir-docs': 'user-invocable-only', probar: 'off' }, enabledPlugins: { 'estilo@acme': true } }))
    put(repo, '.claude/settings.local.json', JSON.stringify({ skillOverrides: { probar: 'on' }, enabledPlugins: { 'estilo@acme': false } }))
    const { items } = await listSkills('shop-web', repos(repo), libretto)
    expect(find(items, 'personal', 'revisar-cambios')?.state).toBe('off')
    expect(find(items, 'personal', 'deploy', 'command')?.state).toBe('name-only')
    expect(find(items, 'personal', 'sin-nombre')?.state).toBe('on')
    // repo beats user, local beats repo
    expect(find(items, 'project', 'escribir-docs')?.state).toBe('user-invocable-only')
    expect(find(items, 'project', 'probar', 'command')?.state).toBe('on')
    // skillOverrides never reaches plugins; the plugin is off whole by the local file
    expect(find(items, 'plugin', 'formatear')).toMatchObject({ state: 'on', enabled: false })
    expect(find(items, 'plugin', 'limpiar', 'command')).toMatchObject({ state: 'on', enabled: false })
    expect(find(items, 'atril', 'evidence')).toMatchObject({ state: 'on', enabled: true })
    expect(find(items, 'personal', 'revisar-cambios')?.enabled).toBeUndefined()

    // Without a repo only the user file counts.
    const userOnly = await listSkills(undefined, repos(repo), libretto)
    expect(find(userOnly.items, 'plugin', 'formatear')?.enabled).toBe(false)
    put(claude, 'settings.json', '{}')
    const plain = await listSkills(undefined, repos(repo), libretto)
    expect(find(plain.items, 'plugin', 'formatear')?.enabled).toBe(true)
  })

  it("a personal skill wins over the repo's and a skill over a command", async () => {
    const { claude, repo, libretto, plugin } = seed()
    put(claude, 'settings.json', JSON.stringify({ skillOverrides: { 'escribir-docs': 'off' } }))
    put(claude, 'skills/escribir-docs/SKILL.md', skill('description: La mía'))
    put(claude, 'skills/deploy/SKILL.md', skill('description: Skill de deploy'))
    put(repo, '.claude/commands/escribir-docs.md', skill('description: comando del repo'))
    put(repo, '.claude/skills/probar/SKILL.md', skill('description: skill del repo'))
    put(plugin, 'skills/deploy/SKILL.md', skill('description: del plugin'))
    put(libretto, 'skills/deploy/SKILL.md', skill('description: de Atril'))
    const { items } = await listSkills('shop-web', repos(repo), libretto)
    expect(find(items, 'personal', 'escribir-docs')?.shadowedBy).toBeUndefined()
    // a shadowed item keeps its state
    expect(find(items, 'project', 'escribir-docs')).toMatchObject({ shadowedBy: 'personal', state: 'off' })
    // personal comes first even for a repo command that a repo skill also shadows
    expect(find(items, 'project', 'escribir-docs', 'command')?.shadowedBy).toBe('personal')
    expect(find(items, 'project', 'probar', 'command')?.shadowedBy).toBe('skill')
    expect(find(items, 'project', 'probar')?.shadowedBy).toBeUndefined()
    expect(find(items, 'personal', 'deploy', 'command')?.shadowedBy).toBe('skill')
    expect(find(items, 'personal', 'deploy')?.shadowedBy).toBeUndefined()
    expect(find(items, 'plugin', 'deploy')?.shadowedBy).toBeUndefined()
    expect(find(items, 'atril', 'deploy')?.shadowedBy).toBeUndefined()
  })
})

describe('skills write', () => {
  const json = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'))

  it('a key fixed by a later file is locked', async () => {
    const { claude, repo, libretto } = seed()
    put(claude, 'settings.json', JSON.stringify({ skillOverrides: { 'revisar-cambios': 'off' } }))
    put(repo, '.claude/settings.json', JSON.stringify({ skillOverrides: { deploy: 'off' }, enabledPlugins: { 'estilo@acme': false } }))
    put(repo, '.claude/settings.local.json', JSON.stringify({ skillOverrides: { 'escribir-docs': 'name-only', deploy: 'on' } }))
    const { items } = await listSkills('shop-web', repos(repo), libretto)
    // Personal writes to the user file; the repo's files come later in the merge.
    expect(find(items, 'personal', 'revisar-cambios')).toMatchObject({ writesTo: join(claude, 'settings.json') })
    expect(find(items, 'personal', 'revisar-cambios')?.lockedBy).toBeUndefined()
    expect(find(items, 'personal', 'deploy', 'command')?.lockedBy).toBe('.claude/settings.local.json')
    // A project item writes to the repo's local file, the last one: nothing can lock it.
    expect(find(items, 'project', 'escribir-docs')).toMatchObject({ writesTo: join(repo, '.claude/settings.local.json') })
    expect(find(items, 'project', 'escribir-docs')?.lockedBy).toBeUndefined()
    // A plugin item is locked by the repo's settings.json when it fixes enabledPlugins.
    expect(find(items, 'plugin', 'formatear')).toMatchObject({ writesTo: join(claude, 'settings.json'), lockedBy: '.claude/settings.json' })
    // Without a repo there is nothing later to lock the plugin.
    const none = await listSkills(undefined, repos(repo), libretto)
    expect(find(none.items, 'plugin', 'formatear')?.lockedBy).toBeUndefined()
    expect(find(items, 'atril', 'evidence')?.writesTo).toBeUndefined()
    expect(find(items, 'atril', 'evidence')?.lockedBy).toBeUndefined()
  })

  it('set writes one key in the file that decides', async () => {
    const { claude, repo, libretto } = seed()
    const user = join(claude, 'settings.json')
    const local = join(repo, '.claude/settings.local.json')
    put(claude, 'settings.json', JSON.stringify({ zeta: 1, skillOverrides: { otra: 'off' }, alfa: { x: [1] } }))
    const r = repos(repo)

    // Personal: the user file, other keys and their order untouched.
    const a = await setSkill({ origin: 'personal', name: 'revisar-cambios', repoId: 'shop-web', state: 'off' }, r, libretto)
    expect(readFileSync(user, 'utf8')).toBe(
      JSON.stringify({ zeta: 1, skillOverrides: { otra: 'off', 'revisar-cambios': 'off' }, alfa: { x: [1] } }, null, 2) + '\n'
    )
    expect(find(a.items, 'personal', 'revisar-cambios')?.state).toBe('off')
    expect(existsSync(user + '.tmp')).toBe(false)

    // Project: the repo's local file, created with its folder.
    expect(existsSync(local)).toBe(false)
    const b = await setSkill({ origin: 'project', name: 'escribir-docs', repoId: 'shop-web', state: 'name-only' }, r, libretto)
    expect(json(local)).toEqual({ skillOverrides: { 'escribir-docs': 'name-only' } })
    expect(readFileSync(local, 'utf8').endsWith('}\n')).toBe(true)
    expect(find(b.items, 'project', 'escribir-docs')?.state).toBe('name-only')
    expect(existsSync(join(repo, '.claude/settings.json'))).toBe(false)

    // Plugin: enabledPlugins in the user file, with or without a repo.
    const c = await setSkill({ plugin: 'estilo@acme', enabled: false, repoId: 'shop-web' }, r, libretto)
    expect((json(user) as { enabledPlugins: unknown }).enabledPlugins).toEqual({ 'estilo@acme': false })
    expect(find(c.items, 'plugin', 'formatear')?.enabled).toBe(false)
    const d = await setSkill({ plugin: 'estilo@acme', enabled: true }, r, libretto)
    expect((json(user) as { enabledPlugins: unknown }).enabledPlugins).toEqual({ 'estilo@acme': true })
    expect(find(d.items, 'plugin', 'formatear')?.enabled).toBe(true)
    expect(Object.keys(json(user) as object)).toEqual(['zeta', 'skillOverrides', 'alfa', 'enabledPlugins'])

    // A symlinked settings file stays a symlink; its target gets the key.
    const real = join(tmp(), 'dotfiles-settings.json')
    writeFileSync(real, '{}')
    rmSync(user)
    symlinkSync(real, user)
    await setSkill({ origin: 'personal', name: 'deploy', state: 'off' }, r, libretto)
    expect(lstatSync(user).isSymbolicLink()).toBe(true)
    expect(json(real)).toEqual({ skillOverrides: { deploy: 'off' } })
  })

  it('set refuses and leaves the files alone', async () => {
    const { claude, repo, libretto } = seed()
    const user = join(claude, 'settings.json')
    const local = join(repo, '.claude/settings.local.json')
    const r = repos(repo)
    const snap = (): string => [user, local, join(repo, '.claude/settings.json')].map((f) => (existsSync(f) ? readFileSync(f, 'utf8') : '-')).join('|')
    const refuses = async (req: Parameters<typeof setSkill>[0], why: RegExp): Promise<void> => {
      const before = snap()
      await expect(setSkill(req, r, libretto)).rejects.toThrow(why)
      expect(snap()).toBe(before)
    }
    const base = { origin: 'personal', name: 'revisar-cambios', repoId: 'shop-web', state: 'off' } as const

    // Not JSON, not an object, and keys that are not objects: the file is named.
    for (const text of ['{nope', '[1]', '"x"', '{"skillOverrides": []}', '{"skillOverrides": "off"}']) {
      put(claude, 'settings.json', text)
      await refuses(base, /settings\.json/)
    }
    put(claude, 'settings.json', '{"enabledPlugins": 3}')
    await refuses({ plugin: 'estilo@acme', enabled: false }, /settings\.json/)
    put(repo, '.claude/settings.local.json', 'no json')
    await refuses({ origin: 'project', name: 'escribir-docs', repoId: 'shop-web', state: 'off' }, /settings\.local\.json/)
    rmSync(local)

    // Atril and plugin items are not switched one by one; a bad state is not a state.
    put(claude, 'settings.json', '{"a":1}')
    await refuses({ ...base, origin: 'atril' }, /./)
    await expect(revealFile({ origin: 'atril', name: 'evidence' }, r)).rejects.toThrow()
    await refuses({ ...base, origin: 'plugin' }, /./)
    await refuses({ ...base, state: 'maybe' as never }, /./)
    await refuses({ ...base, name: '' }, /./)
    await refuses({ origin: 'project', name: 'x', state: 'off' }, /./)

    // A later file already fixes the key: no write.
    put(repo, '.claude/settings.local.json', JSON.stringify({ skillOverrides: { 'revisar-cambios': 'on' } }))
    await refuses(base, /settings\.local\.json/)
    put(repo, '.claude/settings.local.json', '{}')
    put(repo, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'estilo@acme': true } }))
    await refuses({ plugin: 'estilo@acme', enabled: false, repoId: 'shop-web' }, /settings\.json/)
  })
})
