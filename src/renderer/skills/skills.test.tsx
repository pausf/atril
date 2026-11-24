// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView, SkillItem, SkillsList } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const repo = (id: string): RepoView => ({ id, path: `/r/${id}`, mode: 'worktree', reason: '', health: 'ok' })
const item = (name: string, origin: SkillItem['origin'], o: Partial<SkillItem> = {}): SkillItem => ({
  name,
  kind: 'skill',
  origin,
  path: `/x/${origin}/${name}/SKILL.md`,
  body: '',
  state: 'on',
  ...(origin === 'plugin' || origin === 'atril' ? { enabled: true } : {}),
  ...o
})

const ITEMS: SkillItem[] = [
  item('revisar-cambios', 'personal', { description: 'Revisa el diff antes del commit', whenToUse: 'Al acabar' }),
  item('deploy', 'personal', { kind: 'command', description: 'Despliega shop-web', shadowedBy: 'skill' }),
  item('deploy', 'personal', { description: 'Skill de deploy', state: 'name-only' }),
  item('explicar-sql', 'personal', { description: 'Explica un plan de consulta', state: 'off' }),
  item('manual', 'personal', { description: 'Solo a mano', state: 'user-invocable-only' }),
  item('escribir-docs', 'project', { description: 'Escribe la documentación', shadowedBy: 'personal' }),
  item('sembrar', 'project', { description: 'Carga datos de ejemplo', disableModelInvocation: true }),
  item('mal', 'project', { broken: true }),
  item('formatear', 'plugin', { plugin: 'estilo@acme', description: 'Formatea el código', enabled: false }),
  item('changelog', 'plugin', { plugin: 'release@acme', description: 'Escribe el changelog' }),
  item('evidence', 'atril', { plugin: 'libretto', description: 'Nada es cierto hasta verlo' })
]
const list = (items: SkillItem[], warnings: string[] = []): SkillsList => ({ items, warnings })

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const rail = (): HTMLElement => screen.getByRole('navigation', { name: 'Pantallas' })
const open = async (): Promise<HTMLElement> => {
  await userEvent.setup().click(within(rail()).getByRole('button', { name: /Skills/ }))
  return screen.findByRole('region', { name: 'Skills' })
}
const cards = (): string[] => screen.queryAllByRole('button', { name: /^\// }).map((b) => b.getAttribute('aria-label') ?? '')

describe('skills screen', () => {
  it('the screen groups every skill by where it comes from', async () => {
    const api = mockApi({ repos: [repo('shop-web'), repo('cms')], skills: { 'shop-web': list(ITEMS), cms: list([]) } })
    render(createElement(App))
    // Rail order: after Avisos, before Ajustes.
    const names = within(rail()).getAllByRole('button').map((b) => b.textContent ?? '')
    expect(names.indexOf('Skills')).toBe(names.findIndex((n) => n.startsWith('Avisos')) + 1)
    const s = await open()
    expect(window.atril.skills.list).toHaveBeenCalledWith('shop-web')
    expect(within(s).getByRole('heading', { level: 1 }).textContent).toBe(`Skills${ITEMS.length}`)
    expect(s.textContent).toContain('Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.')
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).value).toBe('shop-web')

    // Activas: on or name-only, not shadowed, plugin on → revisar-cambios, deploy (skill), sembrar, mal, changelog, evidence.
    const tile = (label: string): string => within(s).getByRole('group', { name: label }).textContent ?? ''
    const activeChars = ['revisar-cambios' + 'Revisa el diff antes del commit' + 'Al acabar', 'deploy' + 'Skill de deploy', 'sembrar' + 'Carga datos de ejemplo', 'mal', 'changelog' + 'Escribe el changelog', 'evidence' + 'Nada es cierto hasta verlo']
    const tokens = Math.round(activeChars.join('').length / 3.2)
    expect(tile('Activas')).toBe(`6Activas~${tokens} tokens de contexto`)
    expect(tile('Apagadas')).toMatch(/^2Apagadas/)
    expect(tile('Choques')).toMatch(/^2Choques/)

    const group = (name: string): HTMLElement => within(s).getByRole('group', { name: new RegExp(`^${name.replace(/[()]/g, (c) => `\\${c}`)}`) })
    expect(within(group('Personal')).getAllByRole('button', { name: /^\// })).toHaveLength(5)
    expect(within(group('Proyecto (shop-web)')).getAllByRole('button', { name: /^\// })).toHaveLength(3)
    const plugins = group('Plugins')
    expect(plugins.textContent).toContain('estilo@acme · 1 skills · apagado entero')
    expect(plugins.textContent).toContain('release@acme · 1 skills · activo')
    const atril = group('Atril')
    expect(atril.textContent).toContain('solo lectura')
    expect((atril as HTMLDetailsElement).open).toBe(false)

    const text = (name: string, i = 0): string => screen.getAllByRole('button', { name: new RegExp(`^${name}( |$)`) })[i]!.textContent ?? ''
    expect(text('/revisar-cambios')).toContain('Personal')
    expect(text('/revisar-cambios')).toContain('Activa')
    expect(text('/revisar-cambios')).toContain('Revisa el diff antes del commit')
    const cmd = screen.getAllByRole('button', { name: /^\/deploy/ }).map((b) => b.textContent ?? '')
    expect(cmd.find((c) => c.includes('comando'))).toContain('No se carga: gana la skill')
    expect(cmd.find((c) => !c.includes('comando'))).toContain('Solo el nombre')
    expect(text('/explicar-sql')).toContain('Apagada')
    expect(text('/manual')).toContain('Solo si la llamas tú')
    expect(text('/escribir-docs')).toContain('No se carga: gana la personal')
    expect(text('/escribir-docs')).toContain('shop-web')
    expect(text('/sembrar')).toContain('Claude no la usa sola')
    expect(text('/mal')).toContain('Cabecera ilegible')
    expect(text('/estilo:formatear')).toContain('estilo')
    expect(text('/libretto:evidence')).toContain('Atril')

    // Another repo reloads; its empty project says so.
    await userEvent.setup().selectOptions(within(s).getByRole('combobox', { name: 'Repo del proyecto' }), 'cms')
    expect(window.atril.skills.list).toHaveBeenLastCalledWith('cms')
    expect(await within(s).findByText('cms aún no tiene skills propias.')).toBeTruthy()

    // ⌘K reaches it too.
    await userEvent.setup().click(within(rail()).getByRole('button', { name: /Ajustes/ }))
    act(() => api.menu({ kind: 'palette' }))
    await userEvent.setup().type(screen.getByRole('combobox', { name: 'Buscar en Atril' }), 'skills{Enter}')
    expect(within(rail()).getByRole('button', { name: /Skills/ }).getAttribute('aria-current')).toBe('page')

    cleanup()
    mockApi({ repos: [], skills: { '': list(ITEMS.filter((i) => i.origin !== 'project')) } })
    render(createElement(App))
    const n = await open()
    expect(window.atril.skills.list).toHaveBeenCalledWith(undefined)
    expect(await within(n).findByText('Añade un repo en Ajustes → Repos para ver sus skills.')).toBeTruthy()
    expect(within(n).queryByRole('combobox', { name: 'Repo del proyecto' })).toBeNull()
    expect(within(n).queryByRole('group', { name: /^Proyecto/ })).toBeNull()
  })

  it('search and filter narrow the cards', async () => {
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(ITEMS) } })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    const search = within(s).getByRole('searchbox', { name: 'Buscar por nombre o descripción…' })
    await user.type(search, 'DIFF')
    expect(cards()).toEqual(['/revisar-cambios'])
    await user.clear(search)
    await user.type(search, 'al acabar')
    expect(cards()).toEqual(['/revisar-cambios'])

    await user.clear(search)
    await user.click(within(s).getByRole('button', { name: 'Apagadas' }))
    expect(cards().sort()).toEqual(['/estilo:formatear', '/explicar-sql'])
    await user.click(within(s).getByRole('button', { name: 'Activas' }))
    expect(cards().sort()).toEqual(['/release:changelog', '/deploy', '/libretto:evidence', '/mal', '/revisar-cambios', '/sembrar'].sort())

    await user.type(search, 'zzz')
    expect(cards()).toEqual([])
    expect(within(s).getByText('Nada se llama «zzz».')).toBeTruthy()
    await user.click(within(s).getByRole('button', { name: 'Borrar la búsqueda' }))
    expect((search as HTMLInputElement).value).toBe('')
    expect(cards()).toHaveLength(6)
    await user.click(within(s).getByRole('button', { name: 'Todas' }))
    expect(cards()).toHaveLength(ITEMS.length)

    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('apagada', 'personal', { state: 'off' })]) } })
    render(createElement(App))
    const e = await open()
    await within(e).findByRole('button', { name: /^\/apagada/ })
    expect(within(e).getByText('shop-web aún no tiene skills propias.')).toBeTruthy()
    await user.click(within(e).getByRole('button', { name: 'Activas' }))
    expect(within(e).getByText('No tienes ninguna activa.')).toBeTruthy()
    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('encendida', 'personal')]) } })
    render(createElement(App))
    const s2 = await open()
    await within(s2).findByRole('button', { name: /^\/encendida/ })
    await user.click(within(s2).getByRole('button', { name: 'Apagadas' }))
    expect(within(s2).getByText('No tienes ninguna apagada.')).toBeTruthy()
  })

  it('a late reply for the previous repo is dropped', async () => {
    const waiting: Record<string, (l: SkillsList) => void> = {}
    mockApi({ repos: [repo('shop-web'), repo('cms')], skills: (id) => new Promise((r) => (waiting[id ?? ''] = r)) })
    render(createElement(App))
    const s = await open()
    await userEvent.setup().selectOptions(within(s).getByRole('combobox', { name: 'Repo del proyecto' }), 'cms')
    await act(async () => waiting.cms!(list([item('de-cms', 'project')])))
    await act(async () => waiting['shop-web']!(list([item('de-shop', 'project')])))
    expect(cards()).toEqual(['/de-cms'])
  })

  it('a failed read says why and offers to retry', async () => {
    let fail = true
    mockApi({
      repos: [repo('shop-web')],
      skills: async () => {
        if (fail) throw new Error('EACCES: permission denied')
        return list([item('revisar-cambios', 'personal')], ['/x/skills tiene más de 300 entradas: solo se leen las primeras.'])
      }
    })
    render(createElement(App))
    const s = await open()
    const alert = await within(s).findByRole('alert')
    expect(alert.textContent).toContain('No he podido leer tus skills.')
    expect(alert.textContent).toContain('EACCES: permission denied')
    fail = false
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Volver a intentar' }))
    expect(await within(s).findByRole('button', { name: /^\/revisar-cambios/ })).toBeTruthy()
    expect(within(s).queryByRole('alert')).toBeNull()
    expect(within(s).getByText('/x/skills tiene más de 300 entradas: solo se leen las primeras.')).toBeTruthy()
  })

  it('a card opens its detail and escape closes it', async () => {
    const full = item('revisar-cambios', 'personal', {
      description: 'Revisa el diff',
      whenToUse: 'Al acabar',
      argumentHint: '[rama]',
      allowedTools: ['Read', 'Bash(git diff:*)'],
      model: 'sonnet',
      effort: 'high',
      disableModelInvocation: true,
      userInvocable: false,
      state: 'name-only',
      body: 'Lee el diff y <b>no</b> toques nada.',
      path: '/x/skills/revisar-cambios/SKILL.md'
    })
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([full, item('otra', 'personal')]) } })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    const c = await within(s).findByRole('button', { name: /^\/revisar-cambios/ })
    await user.click(c)
    const d = screen.getByRole('complementary', { name: '/revisar-cambios' })
    const txt = d.textContent ?? ''
    for (const v of ['Personal', 'Solo el nombre', 'Revisa el diff', 'Al acabar', '[rama]', 'Read, Bash(git diff:*)', 'sonnet', 'high', '/x/skills/revisar-cambios/SKILL.md']) expect(txt).toContain(v)
    expect(within(d).getByText('Lee el diff y <b>no</b> toques nada.')).toBeTruthy()
    expect(d.querySelector('b')?.textContent).not.toBe('no')
    expect(txt).not.toContain('Esfuerzo' + 'undefined')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary', { name: '/revisar-cambios' })).toBeNull()
    expect(document.activeElement).toBe(within(s).getByRole('button', { name: /^\/revisar-cambios/ }))

    await user.click(within(s).getByRole('button', { name: /^\/otra/ }))
    const d2 = screen.getByRole('complementary', { name: '/otra' })
    expect(d2.textContent).not.toContain('Modelo')
    await user.click(within(d2).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.activeElement).toBe(within(s).getByRole('button', { name: /^\/otra/ }))
  })

  it('the repo cannot change while a write is pending', async () => {
    let done: (l: SkillsList) => void = () => undefined
    const items = [item('revisar-cambios', 'personal', { writesTo: '/h/.claude/settings.json' })]
    const set = vi.fn(() => new Promise<SkillsList>((r) => (done = r)))
    mockApi({ repos: [repo('shop-web'), repo('cms')], skills: { 'shop-web': list(items), cms: list([]) }, ui: { skillsWriteOk: true } }, undefined, { skills: { set } })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    await user.click(await within(s).findByRole('button', { name: /^\/revisar-cambios/ }))
    await user.click(within(screen.getByRole('complementary', { name: '/revisar-cambios' })).getByRole('radio', { name: 'Apagada' }))
    const select = within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement
    expect(select.disabled).toBe(true)
    await act(async () => done(list(items)))
    expect(select.disabled).toBe(false)
  })

  it('state and plugin switch write through set', async () => {
    const user = userEvent.setup()
    const U = '/h/.claude/settings.json'
    const L = '/r/shop-web/.claude/settings.local.json'
    let items: SkillItem[] = [
      item('revisar-cambios', 'personal', { description: 'Revisa', writesTo: U }),
      item('revisar-cambios', 'personal', { kind: 'command', description: 'Comando', writesTo: U }),
      item('bloqueada', 'personal', { description: 'Fijada', writesTo: U, lockedBy: '.claude/settings.local.json' }),
      item('sembrar', 'project', { description: 'Datos', writesTo: L }),
      item('formatear', 'plugin', { plugin: 'estilo@acme', description: 'Formatea', writesTo: U }),
      item('changelog', 'plugin', { plugin: 'release@acme', description: 'Changelog', writesTo: U, lockedBy: '.claude/settings.json' }),
      item('evidence', 'atril', { plugin: 'libretto', description: 'Nada es cierto' })
    ]
    const set = vi.fn(async (req: { name?: string; state?: SkillItem['state']; plugin?: string; enabled?: boolean }) => {
      items = items.map((i) =>
        req.plugin ? (i.plugin === req.plugin ? { ...i, enabled: req.enabled } : i) : i.name === req.name && i.origin !== 'plugin' ? { ...i, state: req.state! } : i
      )
      return list(items)
    })
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(items) }, ui: { skillsWriteOk: true } }, undefined, { skills: { set } })
    render(createElement(App))
    const s = await open()

    await user.click((await within(s).findAllByRole('button', { name: /^\/revisar-cambios/ }))[0]!)
    let d = screen.getByRole('complementary', { name: '/revisar-cambios' })
    const group = within(d).getByRole('radiogroup', { name: 'Estado' })
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-label') ?? r.parentElement?.textContent)).toEqual(['Activa', 'Solo el nombre', 'Solo si la llamas tú', 'Apagada'])
    expect((within(group).getByRole('radio', { name: 'Activa' }) as HTMLInputElement).checked).toBe(true)
    await user.click(within(group).getByRole('radio', { name: 'Apagada' }))
    expect(set).toHaveBeenCalledWith({ origin: 'personal', name: 'revisar-cambios', repoId: 'shop-web', state: 'off' })
    d = screen.getByRole('complementary', { name: '/revisar-cambios' })
    expect((within(d).getByRole('radio', { name: 'Apagada' }) as HTMLInputElement).checked).toBe(true)
    expect(d.textContent).toContain('Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.')
    expect(d.textContent).toContain('También cambia 1 más con el mismo nombre.')
    expect(within(s).getAllByRole('button', { name: /^\/revisar-cambios/, description: /Apagada/ })).toHaveLength(2)
    await user.keyboard('{Escape}')

    // A key a later file fixes: the control is off and says which file.
    await user.click(within(s).getByRole('button', { name: /^\/bloqueada/ }))
    d = screen.getByRole('complementary', { name: '/bloqueada' })
    expect(within(d).getAllByRole('radio').every((r) => (r as HTMLInputElement).disabled)).toBe(true)
    expect(d.textContent).toContain('Lo fija .claude/settings.local.json')
    await user.keyboard('{Escape}')
    // An Atril item has no control at all.
    await user.click(within(s).getByRole('button', { name: /^\/libretto:evidence/ }))
    expect(within(screen.getByRole('complementary', { name: '/libretto:evidence' })).queryByRole('radiogroup')).toBeNull()
    await user.keyboard('{Escape}')
    // A plugin item is switched with its plugin, not here.
    await user.click(within(s).getByRole('button', { name: /^\/estilo:formatear/ }))
    expect(within(screen.getByRole('complementary', { name: '/estilo:formatear' })).queryByRole('radiogroup')).toBeNull()
    await user.keyboard('{Escape}')

    const switches = within(s).getAllByRole('switch', { name: 'Activo' })
    expect(switches).toHaveLength(2)
    expect(switches[0]?.getAttribute('aria-checked')).toBe('true')
    await user.click(switches[0]!)
    expect(set).toHaveBeenCalledWith({ plugin: 'estilo@acme', enabled: false, repoId: 'shop-web' })
    expect(within(s).getAllByRole('switch', { name: 'Activo' })[0]?.getAttribute('aria-checked')).toBe('false')
    expect(s.textContent).toContain('estilo@acme · 1 skills · apagado entero')
    expect((switches[1] as HTMLButtonElement).disabled).toBe(true)
    expect(s.textContent).toContain('Lo fija .claude/settings.json')
  })

  it('a failed write says why and keeps the old state', async () => {
    const user = userEvent.setup()
    const set = vi.fn(async () => {
      throw new Error('EACCES: permission denied')
    })
    const reveal = vi.fn(async () => undefined)
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('revisar-cambios', 'personal', { writesTo: '/h/.claude/settings.json' })]) }, ui: { skillsWriteOk: true } }, undefined, { skills: { set, reveal } })
    render(createElement(App))
    const s = await open()
    await user.click(await within(s).findByRole('button', { name: /^\/revisar-cambios/ }))
    const d = screen.getByRole('complementary', { name: '/revisar-cambios' })
    await user.click(within(d).getByRole('radio', { name: 'Apagada' }))
    expect(await screen.findByText('No he podido cambiar tus ajustes de Claude Code.')).toBeTruthy()
    expect(s.textContent).toContain('EACCES: permission denied')
    expect((within(d).getByRole('radio', { name: 'Activa' }) as HTMLInputElement).checked).toBe(true)
    expect(d.textContent).not.toContain('Hecho.')
    await user.click(screen.getByRole('button', { name: 'Ver en Finder' }))
    expect(reveal).toHaveBeenCalledWith({ origin: 'personal', name: 'revisar-cambios', kind: 'skill', repoId: 'shop-web' })
  })

  it('the first write asks and can be told not to again', async () => {
    const user = userEvent.setup()
    const U = '/h/.claude/settings.json'
    let items: SkillItem[] = [
      item('revisar-cambios', 'personal', { description: 'Revisa', writesTo: U }),
      item('formatear', 'plugin', { plugin: 'estilo@acme', description: 'Formatea', writesTo: U })
    ]
    const set = vi.fn(async (req: { name?: string; state?: SkillItem['state']; plugin?: string; enabled?: boolean }) => {
      items = items.map((i) => (req.plugin ? { ...i, enabled: req.enabled } : i.name === req.name ? { ...i, state: req.state! } : i))
      return list(items)
    })
    const api = mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(items) } }, undefined, { skills: { set } })
    render(createElement(App))
    const s = await open()
    await user.click(await within(s).findByRole('button', { name: /^\/revisar-cambios/ }))
    const d = screen.getByRole('complementary', { name: '/revisar-cambios' })
    const dialog = (): HTMLElement => screen.getByRole('dialog', { name: 'Atril va a cambiar tus ajustes de Claude Code' })

    // Cancelar writes nothing and leaves the control as it was.
    await user.click(within(d).getByRole('radio', { name: 'Apagada' }))
    expect(dialog().textContent).toContain(U)
    expect(dialog().textContent).toContain('skillOverrides.revisar-cambios')
    expect(dialog().textContent).toContain('off')
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cambiar' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(set).not.toHaveBeenCalled()
    expect((within(d).getByRole('radio', { name: 'Activa' }) as HTMLInputElement).checked).toBe(true)

    // Escape is the same as Cancelar, and does not close the panel behind it.
    await user.click(within(d).getByRole('radio', { name: 'Apagada' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(set).not.toHaveBeenCalled()
    expect(screen.queryByRole('complementary', { name: '/revisar-cambios' })).not.toBeNull()

    // Cambiar writes; without the box ticked the next change asks again.
    await user.click(within(d).getByRole('radio', { name: 'Apagada' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Cambiar' }))
    expect(set).toHaveBeenCalledTimes(1)
    expect(api.stored.skillsWriteOk).toBeUndefined()
    await user.click(within(screen.getByRole('complementary', { name: '/revisar-cambios' })).getByRole('radio', { name: 'Solo el nombre' }))
    expect(dialog().textContent).toContain('name-only')
    // The box stores the consent and the write goes through.
    await user.click(within(dialog()).getByRole('checkbox', { name: 'No volver a preguntar' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Cambiar' }))
    expect(set).toHaveBeenCalledTimes(2)
    expect(api.stored.skillsWriteOk).toBe(true)

    // After that no dialog shows, for a state or a plugin switch.
    await user.click(within(screen.getByRole('complementary', { name: '/revisar-cambios' })).getByRole('radio', { name: 'Activa' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(set).toHaveBeenCalledTimes(3)
    await user.keyboard('{Escape}')
    await user.click(within(s).getByRole('switch', { name: 'Activo' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(set).toHaveBeenLastCalledWith({ plugin: 'estilo@acme', enabled: false, repoId: 'shop-web' })
  })
})

describe('skills editor', () => {
  const FILE = '---\nname: revisar-cambios\ndescription: Revisa\n---\nLee el diff.\n'
  const panel = (name: string): HTMLElement => screen.getByRole('complementary', { name })
  const box = (name: string): HTMLTextAreaElement => screen.getByRole('textbox', { name: `Texto de ${name}` }) as HTMLTextAreaElement
  const mine = (path: string, name = 'revisar-cambios'): SkillItem => item(name, 'personal', { path, description: 'Revisa' })
  /** One personal item at `path` open in its detail; save and read are the given doubles. */
  const setup = async (path: string, over: { read?: () => Promise<string>; save?: (r: unknown) => Promise<unknown> }, extra: SkillItem[] = []) => {
    const items = [mine(path), ...extra]
    mockApi({ repos: [repo('shop-web'), repo('cms')], skills: { 'shop-web': list(items), cms: list([]) } }, undefined, { skills: over as never })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    await user.click(await within(s).findByRole('button', { name: /^\/revisar-cambios/ }))
    return { s, user }
  }

  it('edit and save a skill from its detail', async () => {
    const P = '/x/edit1/revisar-cambios/SKILL.md'
    let done: (v: unknown) => void = () => undefined
    const save = vi.fn(() => new Promise((r) => (done = r)))
    const read = vi.fn(async () => FILE)
    const { s, user } = await setup(P, { read, save }, [
      item('formatear', 'plugin', { plugin: 'estilo@acme', path: '/x/edit1/formatear/SKILL.md' }),
      item('evidence', 'atril', { plugin: 'libretto', path: '/x/edit1/evidence/SKILL.md' }),
      item('grande', 'personal', { path: '/x/edit1/grande/SKILL.md' })
    ])
    // Plugin and Atril items are read-only.
    await user.click(within(s).getByRole('button', { name: /^\/estilo:formatear/ }))
    expect(within(panel('/estilo:formatear')).queryByRole('button', { name: 'Editar' })).toBeNull()
    await user.click(within(s).getByRole('button', { name: /^\/libretto:evidence/ }))
    expect(within(panel('/libretto:evidence')).queryByRole('button', { name: 'Editar' })).toBeNull()

    // A read that refuses keeps the panel read-only and says why.
    read.mockRejectedValueOnce(new Error('Es demasiado grande para editarla aquí.'))
    await user.click(within(s).getByRole('button', { name: /^\/grande/ }))
    await user.click(within(panel('/grande')).getByRole('button', { name: 'Editar' }))
    expect(panel('/grande').textContent).toContain('Es demasiado grande para editarla aquí.')
    expect(screen.queryByRole('textbox')).toBeNull()

    await user.click(within(s).getByRole('button', { name: /^\/revisar-cambios/ }))
    await user.click(within(panel('/revisar-cambios')).getByRole('button', { name: 'Editar' }))
    expect(read).toHaveBeenLastCalledWith({ path: P, repoId: 'shop-web' })
    expect(box('revisar-cambios').value).toBe(FILE)
    expect(box('revisar-cambios').className).toContain('skd-edit')
    await user.type(box('revisar-cambios'), 'Más.')
    const text = FILE + 'Más.'
    // ⌘S saves; while it does the repo cannot change.
    await user.keyboard('{Meta>}s{/Meta}')
    expect(save).toHaveBeenCalledWith({ path: P, repoId: 'shop-web', base: FILE, text })
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).disabled).toBe(true)
    const renamed = item('renombrada', 'personal', { path: P, description: 'Nueva' })
    await act(async () => done({ list: list([renamed]) }))
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).disabled).toBe(false)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(panel('/renombrada').textContent).toContain('Guardado.')
    expect(within(s).getByRole('button', { name: /^\/renombrada/ })).toBeTruthy()

    // «Guardar» with the button does the same, and «Descartar» with no changes leaves without asking.
    read.mockResolvedValueOnce(text)
    await user.click(within(panel('/renombrada')).getByRole('button', { name: 'Editar' }))
    await user.click(within(panel('/renombrada')).getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    read.mockResolvedValueOnce(text)
    await user.click(within(panel('/renombrada')).getByRole('button', { name: 'Editar' }))
    await user.type(box('renombrada'), '!')
    await user.click(within(panel('/renombrada')).getByRole('button', { name: 'Guardar' }))
    expect(save).toHaveBeenLastCalledWith({ path: P, repoId: 'shop-web', base: text, text: text + '!' })
  })

  it('a save that conflicts or has a broken header asks first', async () => {
    const P = '/x/edit2/revisar-cambios/SKILL.md'
    const save = vi.fn()
    const { user } = await setup(P, { read: async () => FILE, save: async (r) => save(r) })
    const d = (): HTMLElement => panel('/revisar-cambios')
    const btn = (n: string): HTMLElement => within(d()).getByRole('button', { name: n })
    await user.click(btn('Editar'))
    await user.type(box('revisar-cambios'), 'A')

    // Changed outside: nothing is overwritten until the person chooses.
    save.mockResolvedValueOnce({ conflict: true, disk: 'DISCO' })
    await user.click(btn('Guardar'))
    expect(d().textContent).toContain('Este archivo ha cambiado fuera de Atril.')
    expect(box('revisar-cambios').value).toBe(FILE + 'A')
    await user.click(btn('Cargar el de disco'))
    expect(box('revisar-cambios').value).toBe('DISCO')
    expect(d().textContent).not.toContain('Este archivo ha cambiado')
    await user.type(box('revisar-cambios'), 'B')
    save.mockResolvedValueOnce({ conflict: true, disk: 'DISCO2' })
    await user.click(btn('Guardar'))
    expect(save).toHaveBeenLastCalledWith({ path: P, repoId: 'shop-web', base: 'DISCO', text: 'DISCOB' })
    // «Guardar el mío encima» saves again with force; a broken header then asks too.
    save.mockResolvedValueOnce({ brokenHeader: true })
    await user.click(btn('Guardar el mío encima'))
    expect(save).toHaveBeenLastCalledWith({ path: P, repoId: 'shop-web', base: 'DISCO', text: 'DISCOB', force: true })
    expect(d().textContent).toContain('La cabecera no se entiende: Claude Code puede ignorar esta skill.')
    await user.click(btn('Seguir editando'))
    expect(d().textContent).not.toContain('La cabecera no se entiende')
    expect(box('revisar-cambios').value).toBe('DISCOB')
    // «Guardar igual» keeps the force and adds allowBroken.
    save.mockResolvedValueOnce({ brokenHeader: true })
    await user.click(btn('Guardar'))
    expect(save).toHaveBeenLastCalledWith({ path: P, repoId: 'shop-web', base: 'DISCO', text: 'DISCOB' })
    save.mockResolvedValueOnce({ brokenHeader: true })
    await user.click(btn('Guardar igual'))
    expect(save).toHaveBeenLastCalledWith({ path: P, repoId: 'shop-web', base: 'DISCO', text: 'DISCOB', allowBroken: true })

    // Any rejection is a Problem; the text stays.
    save.mockRejectedValueOnce(new Error('disco lleno'))
    await user.click(btn('Guardar igual'))
    expect(d().textContent).toContain('No he podido guardar la skill.')
    expect(d().textContent).toContain('disco lleno')
    expect(box('revisar-cambios').value).toBe('DISCOB')
  })

  it('leaving with unsaved changes asks first', async () => {
    const P = '/x/edit3/revisar-cambios/SKILL.md'
    const read = vi.fn(async () => FILE)
    const { s, user } = await setup(P, { read }, [mine('/x/edit3/otra/SKILL.md', 'otra')])
    const d = (): HTMLElement => panel('/revisar-cambios')
    const dialog = (): HTMLElement => screen.getByRole('dialog')
    const ask = 'Tienes cambios sin guardar. ¿Descartarlos?'
    const edit = async (): Promise<void> => {
      await user.click(within(d()).getByRole('button', { name: 'Editar' }))
      await user.type(box('revisar-cambios'), 'x')
    }
    const stay = async (): Promise<void> => {
      expect(dialog().textContent).toContain(ask)
      await user.click(within(dialog()).getByRole('button', { name: 'Seguir editando' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(box('revisar-cambios').value).toBe(FILE + 'x')
    }

    // No changes: it leaves without asking.
    await user.click(within(d()).getByRole('button', { name: 'Editar' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()

    // Escape, «Cerrar», «Descartar», another card and another repo all ask.
    await user.click(within(s).getByRole('button', { name: /^\/revisar-cambios/ }))
    await edit()
    await user.keyboard('{Escape}')
    await stay()
    await user.click(within(d()).getByRole('button', { name: 'Cerrar' }))
    await stay()
    await user.click(within(d()).getByRole('button', { name: 'Descartar' }))
    await stay()
    await user.click(within(s).getByRole('button', { name: /^\/otra/ }))
    await stay()
    await user.selectOptions(within(s).getByRole('combobox', { name: 'Repo del proyecto' }), 'cms')
    await stay()
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).value).toBe('shop-web')
    // Only «Descartar cambios» leaves, and the text is gone for good.
    await user.click(within(d()).getByRole('button', { name: 'Descartar' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    await user.click(within(d()).getByRole('button', { name: 'Editar' }))
    expect(box('revisar-cambios').value).toBe(FILE)
    expect(d().textContent).not.toContain('Tienes cambios sin guardar de antes.')

    // Leaving the screen keeps the text in memory; the editor brings it back.
    await user.type(box('revisar-cambios'), 'y')
    await user.click(within(rail()).getByRole('button', { name: /Avisos/ }))
    await user.click(within(rail()).getByRole('button', { name: /Skills/ }))
    const s2 = await screen.findByRole('region', { name: 'Skills' })
    await user.click(await within(s2).findByRole('button', { name: /^\/revisar-cambios/ }))
    await user.click(within(d()).getByRole('button', { name: 'Editar' }))
    expect(box('revisar-cambios').value).toBe(FILE + 'y')
    expect(d().textContent).toContain('Tienes cambios sin guardar de antes.')
  })
})
