// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoView, SkillItem, SkillsList, SkillsUsage, SkillUse } from '../../preload/api'
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
/** The Todas/Activas/Apagadas buttons, apart from the tiles that share their names. */
const seg = (s: HTMLElement, name: string): HTMLElement => within(within(s).getByRole('group', { name: 'Filtro' })).getByRole('button', { name })
const tileOf = (s: HTMLElement, name: string): HTMLElement => within(within(s).getByRole('group', { name: 'Resumen' })).getByRole('button', { name })
/** Unfolds a folded group by its header (K40). */
const unfold = async (s: HTMLElement, name: string): Promise<void> => {
  const g = within(s).getByRole('group', { name })
  await userEvent.setup().click(within(g).getByRole('button', { expanded: false }))
}

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
    const tile = (label: string): string => tileOf(s, label).textContent ?? ''
    const activeChars = ['revisar-cambios' + 'Revisa el diff antes del commit' + 'Al acabar', 'deploy' + 'Skill de deploy', 'sembrar' + 'Carga datos de ejemplo', 'mal', 'changelog' + 'Escribe el changelog', 'evidence' + 'Nada es cierto hasta verlo']
    const tokens = Math.round(activeChars.join('').length / 3.2)
    expect(tile('Activas')).toBe(`6Activas~${tokens} tokens de contexto`)
    expect(tile('Apagadas')).toMatch(/^2Apagadas/)
    expect(tile('Choques')).toMatch(/^2Choques/)

    const group = (name: string): HTMLElement => within(s).getByRole('group', { name: new RegExp(`^${name.replace(/[()]/g, (c) => `\\${c}`)}`) })
    expect(within(group('Personal')).getAllByRole('button', { name: /^\// })).toHaveLength(5)
    expect(within(group('Proyecto (shop-web)')).getAllByRole('button', { name: /^\// })).toHaveLength(3)
    // Each group's header names it and counts its rows.
    const header = (name: string): HTMLElement => within(group(name)).getByRole('button', { expanded: true })
    expect(header('Personal').textContent).toMatch(/^Personal.*5$/)
    expect(header('Proyecto (shop-web)').textContent).toMatch(/3$/)
    expect(within(group('Plugins')).getByRole('button', { name: 'Añadir plugin' })).toBeTruthy()
    expect(group('estilo@acme').textContent).toContain('estilo@acme · 1 skills · apagado entero')
    expect(group('release@acme').textContent).toContain('release@acme · 1 skills · activo')
    const atril = group('Atril')
    expect(atril.textContent).toContain('solo lectura')
    expect(within(atril).getByRole('button', { expanded: false })).toBeTruthy()
    await unfold(s, 'estilo@acme')
    await unfold(s, 'Atril')

    const text = (name: string, i = 0): string => screen.getAllByRole('button', { name: new RegExp(`^${name}( |$)`) })[i]!.textContent ?? ''
    const dim = (name: string): boolean => screen.getAllByRole('button', { name: new RegExp(`^${name}( |$)`) })[0]!.closest('li')!.classList.contains('off')
    // No origin and no «Activa»: the group and the filter already say so.
    expect(text('/revisar-cambios')).not.toContain('Personal')
    expect(text('/revisar-cambios')).not.toContain('Activa')
    expect(text('/revisar-cambios')).toContain('Revisa el diff antes del commit')
    expect(text('/escribir-docs')).not.toContain('shop-web')
    expect(text('/libretto:evidence')).not.toContain('Atril')
    expect(text('/estilo:formatear')).not.toMatch(/Apagada|Activa/)
    expect([dim('/estilo:formatear'), dim('/explicar-sql'), dim('/escribir-docs'), dim('/revisar-cambios')]).toEqual([true, true, true, false])
    const cmd = screen.getAllByRole('button', { name: /^\/deploy/ }).map((b) => b.textContent ?? '')
    expect(cmd.find((c) => c.includes('comando'))).toContain('No se carga: gana la skill')
    expect(cmd.find((c) => !c.includes('comando'))).toContain('Solo el nombre')
    expect(text('/explicar-sql')).toContain('Apagada')
    expect(text('/manual')).toContain('Solo si la llamas tú')
    expect(text('/escribir-docs')).toContain('No se carga: gana la personal')
    expect(text('/sembrar')).toContain('Claude no la usa sola')
    expect(text('/mal')).toContain('Cabecera ilegible')

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
    await user.click(seg(s, 'Apagadas'))
    expect(cards().sort()).toEqual(['/estilo:formatear', '/explicar-sql'])
    await user.click(seg(s, 'Activas'))
    expect(cards().sort()).toEqual(['/release:changelog', '/deploy', '/libretto:evidence', '/mal', '/revisar-cambios', '/sembrar'].sort())

    await user.type(search, 'zzz')
    expect(cards()).toEqual([])
    expect(within(s).getByText('Nada se llama «zzz».')).toBeTruthy()
    await user.click(within(s).getByRole('button', { name: 'Borrar la búsqueda' }))
    expect((search as HTMLInputElement).value).toBe('')
    expect(cards()).toHaveLength(6)
    await user.click(seg(s, 'Todas'))
    // Not narrowed: the two plugin groups and Atril are folded again (K40).
    expect(cards()).toHaveLength(ITEMS.length - 3)

    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('apagada', 'personal', { state: 'off' })]) } })
    render(createElement(App))
    const e = await open()
    await within(e).findByRole('button', { name: /^\/apagada/ })
    expect(within(e).getByText('shop-web aún no tiene skills propias.')).toBeTruthy()
    await user.click(seg(e, 'Activas'))
    expect(within(e).getByText('No tienes ninguna activa.')).toBeTruthy()
    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('encendida', 'personal')]) } })
    render(createElement(App))
    const s2 = await open()
    await within(s2).findByRole('button', { name: /^\/encendida/ })
    await user.click(seg(s2, 'Apagadas'))
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

  it("shows when each skill was last used and filters the unused ones", async () => {
    const use = (pairs: [number, number][]): SkillUse => {
      const days = Array<number>(30).fill(0)
      for (const [k, n] of pairs) days[k] = n
      return { last: '2026-11-25T10:00:00.000Z', days }
    }
    let answer: (u: SkillsUsage) => void = () => undefined
    mockApi({
      repos: [repo('shop-web'), repo('cms')],
      skills: { 'shop-web': list(ITEMS), cms: list(ITEMS) },
      skillsUsage: () => new Promise((r) => (answer = r))
    })
    render(createElement(App))
    const s = await open()
    await within(s).findByRole('button', { name: /^\/revisar-cambios/ })
    const text = (name: string, i = 0): string => screen.getAllByRole('button', { name: new RegExp(`^${name}( |$)`) })[i]!.textContent ?? ''
    // Not answered yet: the list shows, nothing about use.
    expect(within(s).queryByRole('button', { name: 'Sin usar en 30 días' })).toBeNull()
    expect(s.textContent).not.toMatch(/usada|sin usar/)

    await act(async () =>
      answer({
        usage: {
          'revisar-cambios': use([[0, 2]]),
          deploy: use([[1, 1]]),
          'release:changelog': use([[5, 1], [9, 2]]),
          'escribir-docs': use([[0, 1]])
        }
      })
    )
    await unfold(s, 'release@acme')
    const deploy = screen.getAllByRole('button', { name: /^\/deploy$/ }).map((b) => b.textContent ?? '')
    expect(text('/revisar-cambios')).toContain('usada hoy')
    expect(deploy.find((c) => !c.includes('comando'))).toContain('usada hace 1 día')
    expect(text('/release:changelog')).toContain('usada hace 5 días')
    expect(text('/sembrar')).toContain('sin usar en 30 días')
    // Shadowed cards say nothing, used or not.
    expect(deploy.find((c) => c.includes('comando'))).not.toMatch(/usada|sin usar/)
    expect(text('/escribir-docs')).not.toMatch(/usada|sin usar/)

    // Idle: not atril, not off, not shadowed, not enabled:false, no use → manual, sembrar, mal.
    const tile = within(s).getByRole('button', { name: 'Sin usar en 30 días' })
    expect(tile.textContent).toBe('3Sin usar en 30 díascandidatas a apagar')
    const user = userEvent.setup()
    await user.click(tile)
    expect(tile.getAttribute('aria-pressed')).toBe('true')
    expect(cards().sort()).toEqual(['/mal', '/manual', '/sembrar'])
    await user.click(tile)
    expect(tile.getAttribute('aria-pressed')).toBe('false')
    // estilo and Atril stay folded; release was unfolded above.
    expect(cards()).toHaveLength(ITEMS.length - 2)
    await user.click(tile)
    await user.click(seg(s, 'Todas'))
    expect(tile.getAttribute('aria-pressed')).toBe('false')
    expect(cards()).toHaveLength(ITEMS.length - 2)
    await user.click(tile)
    await user.click(seg(s, 'Activas'))
    expect(tile.getAttribute('aria-pressed')).toBe('false')
    expect(cards()).toHaveLength(6)

    // Once per visit: picking another repo does not ask again.
    await user.selectOptions(within(s).getByRole('combobox', { name: 'Repo del proyecto' }), 'cms')
    await waitFor(() => expect(window.atril.skills.list).toHaveBeenCalledWith('cms'))
    expect(window.atril.skills.usage).toHaveBeenCalledTimes(1)

    // Everything used: «todas en uso», and the filter says none.
    cleanup()
    const used = [item('a', 'personal'), item('b', 'project', { state: 'off' })]
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(used) }, skillsUsage: { usage: { a: use([[2, 1]]) } } })
    render(createElement(App))
    const s2 = await open()
    const t2 = await within(s2).findByRole('button', { name: 'Sin usar en 30 días' })
    expect(t2.textContent).toBe('0Sin usar en 30 díastodas en uso')
    await user.click(t2)
    expect(within(s2).getByText('No tienes ninguna sin usar.')).toBeTruthy()

    // An error: no tile, cards say nothing.
    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(ITEMS) }, skillsUsage: { error: 'EACCES' } })
    render(createElement(App))
    const s3 = await open()
    await within(s3).findByRole('button', { name: /^\/revisar-cambios/ })
    await act(async () => undefined)
    expect(within(s3).queryByRole('button', { name: 'Sin usar en 30 días' })).toBeNull()
    expect(s3.textContent).not.toMatch(/usada|sin usar/)
  })

  it("the detail shows the last 14 days of use", async () => {
    const days = Array<number>(30).fill(0)
    days[0] = 3
    days[2] = 1
    days[13] = 2
    days[20] = 4
    mockApi({
      repos: [repo('shop-web')],
      skills: { 'shop-web': list([item('revisar-cambios', 'personal'), item('otra', 'personal'), item('una', 'personal')]) },
      skillsUsage: { usage: { 'revisar-cambios': { last: '2026-11-25T10:00:00.000Z', days }, una: { last: '2026-11-25T10:00:00.000Z', days: [1, ...Array<number>(29).fill(0)] } } }
    })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    await within(s).findByRole('button', { name: 'Sin usar en 30 días' })
    await user.click(within(s).getByRole('button', { name: /^\/revisar-cambios/ }))
    const d = screen.getByRole('complementary', { name: '/revisar-cambios' })
    const chart = within(d).getByRole('group', { name: 'Uso · últimos 14 días' })
    expect(d.textContent).toContain('Uso · últimos 14 días')
    const bars = within(chart).getAllByRole('img')
    expect(bars).toHaveLength(14)
    const day = (k: number): string => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - k).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    }
    // Oldest left: the first bar is 13 days ago, the last is today.
    expect(bars.map((b) => b.getAttribute('aria-label'))).toEqual(Array.from({ length: 14 }, (_, i) => `${day(13 - i)}: ${days[13 - i]}`))
    expect(bars[13]!.getAttribute('aria-label')).toMatch(/^\d{1,2} \S+: 3$/)
    // Proportional to the 14-day maximum (3), 2 px when 0; day 20 (4 uses) is outside the chart.
    expect(bars[13]!.style.height).toBe('32px')
    expect(bars[0]!.style.height).toBe(`${Math.round((2 / 3) * 32)}px`)
    expect(bars[11]!.style.height).toBe(`${Math.round((1 / 3) * 32)}px`)
    expect(bars[1]!.style.height).toBe('2px')
    expect(d.textContent).toContain('10 veces en 30 días')
    expect(d.textContent).toContain('Según las sesiones de Claude Code en este Mac.')

    await user.click(within(s).getByRole('button', { name: /^\/otra/ }))
    const d2 = screen.getByRole('complementary', { name: '/otra' })
    expect(d2.textContent).toContain('Sin usar en 30 días.')
    expect(within(within(d2).getByRole('group', { name: 'Uso · últimos 14 días' })).getAllByRole('img').map((b) => b.style.height)).toEqual(Array(14).fill('2px'))
    await user.click(within(s).getByRole('button', { name: /^\/una/ }))
    expect(screen.getByRole('complementary', { name: '/una' }).textContent).toContain('1 vez en 30 días')

    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('revisar-cambios', 'personal')]) }, skillsUsage: { error: 'EACCES' } })
    render(createElement(App))
    const s2 = await open()
    await user.click(await within(s2).findByRole('button', { name: /^\/revisar-cambios/ }))
    await act(async () => undefined)
    const d3 = screen.getByRole('complementary', { name: '/revisar-cambios' })
    expect(within(d3).queryByRole('group', { name: 'Uso · últimos 14 días' })).toBeNull()
    for (const v of ['Uso · últimos 14 días', 'veces en 30 días', 'Sin usar en 30 días.', 'Según las sesiones de Claude Code en este Mac.']) expect(d3.textContent).not.toContain(v)
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
    await unfold(s, 'Atril')
    await unfold(s, 'estilo@acme')
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
    await unfold(s, 'estilo@acme')
    await unfold(s, 'Atril')
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
    await user.click(within(within(s).getByRole('group', { name: /^Personal/ })).getByRole('button', { name: 'Nueva skill' }))
    await stay()
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).value).toBe('shop-web')
    // Only «Descartar cambios» leaves, and the text is gone for good.
    await user.click(within(d()).getByRole('button', { name: 'Descartar' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    await user.click(within(d()).getByRole('button', { name: 'Editar' }))
    expect(box('revisar-cambios').value).toBe(FILE)
    expect(d().textContent).not.toContain('Tienes cambios sin guardar de antes.')

    // Discarding for «Nueva skill» closes the editor too: no editor left holding text nobody guards.
    await user.type(box('revisar-cambios'), 'z')
    await user.click(within(within(s).getByRole('group', { name: /^Personal/ })).getByRole('button', { name: 'Nueva skill' }))
    await user.click(within(dialog()).getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }))
    await user.click(within(s).getByRole('button', { name: /^\/revisar-cambios/ }))
    await user.click(within(d()).getByRole('button', { name: 'Editar' }))
    expect(box('revisar-cambios').value).toBe(FILE)

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

  it('new skill creates and opens it in the editor', async () => {
    const NEW = '---\nname: nueva-1\ndescription: \n---\n\n'
    const made = item('nueva-1', 'personal', { path: '/x/new1/nueva-1/SKILL.md' })
    const create = vi.fn(async () => list([mine('/x/new1/revisar-cambios/SKILL.md'), made]))
    const read = vi.fn(async () => NEW)
    const { s, user } = await setup('/x/new1/revisar-cambios/SKILL.md', { create, read } as never)
    const group = (n: RegExp): HTMLElement => within(s).getByRole('group', { name: n })
    const dialog = (): HTMLElement => screen.getByRole('dialog')
    const crear = (): HTMLButtonElement => within(dialog()).getByRole('button', { name: 'Crear' }) as HTMLButtonElement

    await user.click(within(group(/^Personal/)).getByRole('button', { name: 'Nueva skill' }))
    expect(dialog().textContent).toContain('Minúsculas, números y guiones.')
    const name = within(dialog()).getByRole('textbox', { name: 'Nombre' })
    expect(crear().disabled).toBe(true)
    for (const bad of ['Mala', '1x', 'a_b', 'a'.repeat(65)]) {
      await user.clear(name)
      await user.type(name, bad)
      expect(crear().disabled).toBe(true)
    }
    await user.clear(name)
    await user.type(name, 'nueva-1')
    expect(crear().disabled).toBe(false)

    // A refusal shows its reason and keeps the dialog.
    create.mockRejectedValueOnce(new Error('Ya hay una skill con ese nombre.'))
    await user.click(crear())
    expect(dialog().textContent).toContain('Ya hay una skill con ese nombre.')
    await user.click(crear())
    expect(create).toHaveBeenLastCalledWith({ origin: 'personal', repoId: 'shop-web', name: 'nueva-1' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(((await screen.findByRole('textbox', { name: 'Texto de nueva-1' })) as HTMLTextAreaElement).value).toBe(NEW)
    expect(read).toHaveBeenLastCalledWith({ path: '/x/new1/nueva-1/SKILL.md', repoId: 'shop-web' })

    // Escape in the editor with the new, unchanged text leaves; the Project group asks for its own origin.
    await user.keyboard('{Escape}')
    await user.click(within(group(/^Proyecto/)).getByRole('button', { name: 'Nueva skill' }))
    await user.type(within(dialog()).getByRole('textbox', { name: 'Nombre' }), 'del-repo')
    await user.click(crear())
    expect(create).toHaveBeenLastCalledWith({ origin: 'project', repoId: 'shop-web', name: 'del-repo' })
  })
  it('add plugin installs from the catalog', async () => {
    const user = userEvent.setup()
    const catalog = {
      installed: [{ pluginId: 'estilo@acme', scope: 'user' }],
      available: [
        { pluginId: 'estilo@acme', name: 'estilo', marketplace: 'acme', description: 'Formatea el código' },
        { pluginId: 'release@acme', name: 'release', marketplace: 'acme', description: 'Escribe el changelog' },
        { pluginId: 'lint@otros', name: 'lint', marketplace: 'otros', description: 'Pasa el linter' }
      ]
    }
    const after = list([item('changelog', 'plugin', { plugin: 'release@acme', description: 'Escribe el changelog' })])
    let release: (r: { list: SkillsList }) => void = () => undefined
    const plugin = vi.fn(() => new Promise<{ list: SkillsList }>((res) => (release = res)))
    const marketplace = vi.fn(async () => ({ catalog: { installed: catalog.installed, available: [...catalog.available, { pluginId: 'nuevo@mk', name: 'nuevo', marketplace: 'mk', description: 'Recién añadido' }] } }))
    mockApi({ repos: [repo('shop-web'), repo('cms')], skills: { 'shop-web': list(ITEMS), cms: list([]) } }, undefined, {
      skills: { catalog: vi.fn(async () => ({ catalog })), plugin, marketplace }
    })
    render(createElement(App))
    const s = await open()
    await user.click(within(within(s).getByRole('group', { name: 'Plugins' })).getByRole('button', { name: 'Añadir plugin' }))
    const dlg = await screen.findByRole('dialog', { name: 'Añadir plugin' })
    expect(dlg.getAttribute('aria-modal')).toBe('true')
    expect(window.atril.skills.catalog).toHaveBeenCalledWith('shop-web')

    // Not-installed plugins by marketplace, each with name, description and «Instalar».
    const mk = (name: string): HTMLElement => within(dlg).getByRole('group', { name })
    expect(within(mk('acme')).getAllByRole('listitem')).toHaveLength(1)
    expect(mk('acme').textContent).toContain('release')
    expect(mk('acme').textContent).toContain('Escribe el changelog')
    expect(mk('otros').textContent).toContain('lint')
    expect(within(dlg).queryByText('estilo')).toBeNull()
    expect(within(dlg).getAllByRole('button', { name: 'Instalar' })).toHaveLength(2)

    // The search box filters by name or description.
    const search = within(dlg).getByRole('searchbox', { name: 'Buscar plugin' })
    expect(document.activeElement).toBe(search)
    await user.type(search, 'linter')
    expect(within(dlg).queryByText('release')).toBeNull()
    expect(within(dlg).getByText('lint')).toBeTruthy()
    await user.clear(search)
    await user.type(search, 'changelog')
    expect(within(dlg).queryByText('lint')).toBeNull()

    // «Instalar» offers both scopes with a repo.
    await user.click(within(dlg).getByRole('button', { name: 'Instalar' }))
    expect(within(dlg).getByRole('button', { name: 'Solo para mí en shop-web' })).toBeTruthy()
    await user.click(within(dlg).getByRole('button', { name: 'Para mí, en todos los repos' }))
    expect(plugin).toHaveBeenCalledWith({ action: 'install', plugin: 'release@acme', scope: 'user', repoId: 'shop-web' })

    // While it runs every plugin button and the repo selector are disabled.
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).disabled).toBe(true)
    for (const b of within(dlg).getAllByRole('button')) if (b.textContent !== 'Cancelar') expect((b as HTMLButtonElement).disabled).toBe(true)
    release({ list: after })

    // On success the dialog closes, the list updates and the note shows.
    expect(await screen.findByText('Instalado. Las sesiones nuevas de Claude Code ya lo cargan.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    // The new plugin's group arrives folded (K40), counting its one skill.
    expect(within(within(s).getByRole('group', { name: 'release@acme' })).getByRole('button', { expanded: false }).textContent).toMatch(/1$/)
    expect((within(s).getByRole('combobox', { name: 'Repo del proyecto' }) as HTMLSelectElement).disabled).toBe(false)

    // The local scope names the repo; «Añadir marketplace» reloads the catalog.
    await user.click(within(within(s).getByRole('group', { name: 'Plugins' })).getByRole('button', { name: 'Añadir plugin' }))
    const dlg2 = await screen.findByRole('dialog', { name: 'Añadir plugin' })
    await user.click(within(dlg2).getAllByRole('button', { name: 'Instalar' })[0]!)
    plugin.mockResolvedValueOnce({ list: after })
    await user.click(within(dlg2).getByRole('button', { name: 'Solo para mí en shop-web' }))
    expect(plugin).toHaveBeenLastCalledWith({ action: 'install', plugin: expect.any(String), scope: 'local', repoId: 'shop-web' })
    await user.click(await within(s).findByRole('button', { name: 'Añadir plugin' }))
    const dlg3 = await screen.findByRole('dialog', { name: 'Añadir plugin' })
    await user.type(within(dlg3).getByRole('textbox', { name: 'owner/repo o URL' }), 'acme/tools')
    await user.click(within(dlg3).getByRole('button', { name: 'Añadir' }))
    expect(marketplace).toHaveBeenCalledWith({ source: 'acme/tools', repoId: 'shop-web' })
    expect(await within(dlg3).findByText('nuevo')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('update and remove a plugin from its bar', async () => {
    const user = userEvent.setup()
    const items = [
      item('formatear', 'plugin', { plugin: 'estilo@acme', description: 'Formatea' }),
      item('changelog', 'plugin', { plugin: 'release@acme', description: 'Changelog' }),
      item('ajeno', 'plugin', { plugin: 'ajeno@acme', description: 'De otro repo' }),
      item('evidence', 'atril', { plugin: 'libretto', description: 'Nada es cierto' })
    ]
    const catalog = {
      installed: [
        { pluginId: 'estilo@acme', scope: 'user' },
        { pluginId: 'release@acme', scope: 'local', projectPath: '/r/shop-web' },
        { pluginId: 'ajeno@acme', scope: 'local', projectPath: '/r/cms' }
      ],
      available: []
    }
    const plugin = vi.fn(async () => ({ list: list(items) }))
    mockApi({ repos: [repo('shop-web'), repo('cms')], skills: { 'shop-web': list(items), cms: list([]) } }, undefined, { skills: { catalog: vi.fn(async () => ({ catalog })), plugin } })
    render(createElement(App))
    const s = await open()
    expect(window.atril.skills.catalog).toHaveBeenCalledWith('shop-web')
    const bar = async (name: string): Promise<HTMLElement> => within(s).findByRole('group', { name })
    const estilo = await bar('estilo@acme')
    await within(estilo).findByRole('button', { name: 'Actualizar' })
    const release = await bar('release@acme')
    const ajeno = await bar('ajeno@acme')
    expect(within(ajeno).queryByRole('button', { name: 'Actualizar' })).toBeNull()
    expect(within(ajeno).queryByRole('button', { name: 'Quitar' })).toBeNull()
    expect(ajeno.textContent).toContain('Instalado en otro ámbito: se gestiona fuera de Atril.')
    expect(within(within(s).getByRole('group', { name: 'Atril' })).queryByRole('button', { name: /Actualizar|Quitar/ })).toBeNull()

    // «Actualizar» acts on the install the screen can see: user, or local for this repo.
    await user.click(within(estilo).getByRole('button', { name: 'Actualizar' }))
    expect(plugin).toHaveBeenLastCalledWith({ action: 'update', plugin: 'estilo@acme', scope: 'user', repoId: 'shop-web' })
    expect(await screen.findByText('Hecho.')).toBeTruthy()
    await user.click(within(release).getByRole('button', { name: 'Actualizar' }))
    expect(plugin).toHaveBeenLastCalledWith({ action: 'update', plugin: 'release@acme', scope: 'local', repoId: 'shop-web' })

    // «Quitar» asks first; «Cancelar» runs nothing.
    plugin.mockClear()
    await user.click(within(estilo).getByRole('button', { name: 'Quitar' }))
    const dlg = screen.getByRole('dialog', { name: 'Quitar plugin' })
    expect(dlg.textContent).toContain('¿Quitar estilo@acme? Sus skills dejan de cargarse.')
    await user.click(within(dlg).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(plugin).not.toHaveBeenCalled()
    await user.click(within(release).getByRole('button', { name: 'Quitar' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Quitar plugin' })).getByRole('button', { name: 'Quitar' }))
    expect(plugin).toHaveBeenCalledTimes(1)
    expect(plugin).toHaveBeenCalledWith({ action: 'uninstall', plugin: 'release@acme', scope: 'local', repoId: 'shop-web' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('Hecho.')).toBeTruthy()

    // Without a repo, a `local` install the CLI reports without `projectPath` is not this screen's to manage.
    cleanup()
    const suelto = [item('x', 'plugin', { plugin: 'suelto@acme', writesTo: '/h/.claude/settings.json' })]
    const lone = { installed: [{ pluginId: 'suelto@acme', scope: 'local' }], available: [] }
    mockApi({ repos: [], skills: { '': list(suelto) } }, undefined, { skills: { catalog: vi.fn(async () => ({ catalog: lone })), plugin } })
    render(createElement(App))
    const s3 = await open()
    const bar3 = await within(s3).findByRole('group', { name: 'suelto@acme' })
    await waitFor(() => expect(bar3.textContent).toContain('Instalado en otro ámbito: se gestiona fuera de Atril.'))
    expect(within(bar3).queryByRole('button', { name: 'Quitar' })).toBeNull()
  })

  it('a failed plugin action offers terminal', async () => {
    const user = userEvent.setup()
    const items = [item('formatear', 'plugin', { plugin: 'estilo@acme', description: 'Formatea' })]
    const catalog = { installed: [{ pluginId: 'estilo@acme', scope: 'user' }], available: [{ pluginId: 'otro@acme', name: 'otro', marketplace: 'acme' }] }
    const plugin = vi.fn()
    const marketplace = vi.fn()
    const cat = vi.fn(async () => ({ catalog }))
    const pluginTerminal = vi.fn(async () => ({ ok: true as const }))
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(items) } }, undefined, { skills: { catalog: cat, plugin, marketplace, pluginTerminal } })
    const install = vi.spyOn(window.atril, 'installTool')
    render(createElement(App))
    const s = await open()
    const bar = await within(s).findByRole('group', { name: 'estilo@acme' })
    await within(bar).findByRole('button', { name: 'Actualizar' })

    // A failure: what happened, the CLI's message folded, and the same command in Terminal.
    plugin.mockResolvedValueOnce({ error: 'Este plugin pide aceptar un comando', code: 'failed' })
    await user.click(within(bar).getByRole('button', { name: 'Actualizar' }))
    const problem = await within(s).findByRole('alert')
    expect(problem.textContent).toContain('No he podido completar la operación del plugin.')
    expect(problem.textContent).toContain('Este plugin pide aceptar un comando')
    await user.click(within(problem).getByRole('button', { name: 'Hacerlo en Terminal' }))
    expect(pluginTerminal).toHaveBeenCalledWith({ action: 'update', plugin: 'estilo@acme', scope: 'user', repoId: 'shop-web' })

    // `missing`: the doctor's fix for claude, no Terminal button.
    plugin.mockResolvedValueOnce({ error: 'x', code: 'missing' })
    await user.click(within(bar).getByRole('button', { name: 'Actualizar' }))
    const missing = await within(s).findByRole('alert')
    expect(missing.textContent).toContain('No encuentro Claude Code en este Mac.')
    expect(within(missing).queryByRole('button', { name: 'Hacerlo en Terminal' })).toBeNull()
    await user.click(within(missing).getByRole('button', { name: 'Instalar Claude Code' }))
    expect(install).toHaveBeenCalledWith('claude')

    // A marketplace that fails to add shows the problem on the screen, without Terminal.
    marketplace.mockResolvedValueOnce({ error: 'No es un marketplace', code: 'failed' })
    await user.click(within(s).getByRole('button', { name: 'Añadir plugin' }))
    const dlg = await screen.findByRole('dialog', { name: 'Añadir plugin' })
    await user.type(within(dlg).getByRole('textbox', { name: 'owner/repo o URL' }), 'acme/mal')
    await user.click(within(dlg).getByRole('button', { name: 'Añadir' }))
    const added = await within(s).findByRole('alert')
    expect(added.textContent).toContain('No he podido completar la operación del plugin.')
    expect(added.textContent).toContain('No es un marketplace')
    expect(within(added).queryByRole('button', { name: 'Hacerlo en Terminal' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()

    // A catalog that cannot be read: its own problem in the dialog, «Volver a intentar» loads it again.
    cat.mockResolvedValueOnce({ error: 'boom', code: 'failed' } as never)
    await user.click(within(s).getByRole('button', { name: 'Añadir plugin' }))
    const dlg2 = await screen.findByRole('dialog', { name: 'Añadir plugin' })
    const bad = await within(dlg2).findByRole('alert')
    expect(bad.textContent).toContain('No he podido leer los marketplaces.')
    await user.click(within(bad).getByRole('button', { name: 'Volver a intentar' }))
    expect(await within(dlg2).findByText('otro')).toBeTruthy()
    expect(within(dlg2).queryByRole('alert')).toBeNull()
    await user.keyboard('{Escape}')

    // …or Claude Code missing there.
    cat.mockResolvedValueOnce({ error: 'x', code: 'missing' } as never)
    await user.click(within(s).getByRole('button', { name: 'Añadir plugin' }))
    const dlg3 = await screen.findByRole('dialog', { name: 'Añadir plugin' })
    expect((await within(dlg3).findByRole('alert')).textContent).toContain('No encuentro Claude Code en este Mac.')
  })
})


describe('skills dense list', () => {
  const group = (s: HTMLElement, name: string): HTMLElement => within(s).getByRole('group', { name })
  const head = (s: HTMLElement, name: string): HTMLElement => within(group(s, name)).getAllByRole('button').find((b) => b.hasAttribute('aria-expanded'))!
  const expanded = (s: HTMLElement, name: string): string | null => head(s, name).getAttribute('aria-expanded')

  it("groups fold, plugins start folded, a search opens what matches", async () => {
    mockApi({ repos: [repo('shop-web'), repo('cms')], skills: { 'shop-web': list(ITEMS), cms: list(ITEMS) } })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    await within(s).findByRole('button', { name: /^\/revisar-cambios/ })
    expect(['Personal', 'Proyecto (shop-web)', 'estilo@acme', 'release@acme', 'Atril'].map((g) => expanded(s, g))).toEqual(['true', 'true', 'false', 'false', 'false'])
    expect(cards()).not.toContain('/release:changelog')

    // A header folds and unfolds its group; the fold holds across a repo pick.
    await user.click(head(s, 'Personal'))
    expect(expanded(s, 'Personal')).toBe('false')
    expect(cards()).not.toContain('/revisar-cambios')
    await user.click(head(s, 'release@acme'))
    expect(cards()).toContain('/release:changelog')
    await user.selectOptions(within(s).getByRole('combobox', { name: 'Repo del proyecto' }), 'cms')
    await waitFor(() => expect(window.atril.skills.list).toHaveBeenLastCalledWith('cms'))
    expect(expanded(s, 'Personal')).toBe('false')
    expect(expanded(s, 'release@acme')).toBe('true')

    // Narrowed by a search: groups with a match open, the rest go, headers are disabled.
    const search = within(s).getByRole('searchbox', { name: 'Buscar por nombre o descripción…' })
    await user.type(search, 'formatea')
    expect(cards()).toEqual(['/estilo:formatear'])
    expect(expanded(s, 'estilo@acme')).toBe('true')
    expect(head(s, 'estilo@acme').textContent).toMatch(/1$/)
    expect((head(s, 'estilo@acme') as HTMLButtonElement).disabled).toBe(true)
    expect(within(s).queryByRole('group', { name: 'Personal' })).toBeNull()
    expect(within(s).queryByRole('group', { name: 'release@acme' })).toBeNull()
    expect(within(s).queryByRole('button', { name: 'Nueva skill' })).toBeNull()
    expect(within(group(s, 'Plugins')).getByRole('button', { name: 'Añadir plugin' })).toBeTruthy()
    // With no match at all the «Plugins» line still shows.
    await user.clear(search)
    await user.type(search, 'zzz')
    expect(within(s).getByText('Nada se llama «zzz».')).toBeTruthy()
    expect(within(group(s, 'Plugins')).getByRole('button', { name: 'Añadir plugin' })).toBeTruthy()

    // A folded group with matches opens while narrowed by a filter too.
    await user.clear(search)
    await user.click(seg(s, 'Apagadas'))
    expect(cards().sort()).toEqual(['/estilo:formatear', '/explicar-sql'])
    expect(expanded(s, 'Personal')).toBe('true')
    expect(within(s).queryByRole('button', { name: 'Nueva skill' })).toBeNull()

    // Cleared: each group gets back the fold it had.
    await user.click(seg(s, 'Todas'))
    expect(['Personal', 'estilo@acme', 'release@acme', 'Atril'].map((g) => expanded(s, g))).toEqual(['false', 'false', 'true', 'false'])
    expect(within(s).getAllByRole('button', { name: 'Nueva skill' })).toHaveLength(1)
  })

  it("rows go by most recent use, or by name", async () => {
    const at = (last: string): SkillUse => ({ last, days: Array<number>(30).fill(0) })
    const mine = [
      item('beta', 'personal'),
      item('Alfa', 'personal'),
      item('gamma', 'personal'),
      item('epsilon', 'personal'),
      item('delta', 'personal', { kind: 'command', shadowedBy: 'skill' })
    ]
    let answer: (u: SkillsUsage) => void = () => undefined
    mockApi({ repos: [], skills: { '': list(mine) }, skillsUsage: () => new Promise((r) => (answer = r)) })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    await within(s).findByRole('button', { name: '/beta' })
    const order = (): string[] => within(group(s, 'Personal')).getAllByRole('button', { name: /^\// }).map((b) => b.getAttribute('aria-label') ?? '')
    expect(within(within(s).getByRole('group', { name: 'Orden' })).getByRole('button', { name: 'Recientes' }).getAttribute('aria-pressed')).toBe('true')
    // Before the usage answers: by name, case-insensitive.
    expect(order()).toEqual(['/Alfa', '/beta', '/delta', '/epsilon', '/gamma'])
    await act(async () =>
      answer({
        usage: { gamma: at('2026-11-25T10:00:00.000Z'), epsilon: at('2026-11-25T10:00:00.000Z'), beta: at('2026-11-20T10:00:00.000Z'), delta: at('2026-11-26T10:00:00.000Z') }
      })
    )
    // Newest first, equal by name; a shadowed row counts as unused.
    expect(order()).toEqual(['/epsilon', '/gamma', '/beta', '/Alfa', '/delta'])
    await user.click(within(within(s).getByRole('group', { name: 'Orden' })).getByRole('button', { name: 'Nombre' }))
    expect(order()).toEqual(['/Alfa', '/beta', '/delta', '/epsilon', '/gamma'])

    // A usage that failed sorts by name.
    cleanup()
    mockApi({ repos: [], skills: { '': list(mine) }, skillsUsage: { error: 'EACCES' } })
    render(createElement(App))
    const s2 = await open()
    await within(s2).findByRole('button', { name: '/beta' })
    await act(async () => undefined)
    expect(within(group(s2, 'Personal')).getAllByRole('button', { name: /^\// }).map((b) => b.getAttribute('aria-label'))).toEqual(['/Alfa', '/beta', '/delta', '/epsilon', '/gamma'])
  })

  it("the tiles filter and a second press clears", async () => {
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list(ITEMS) } })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    await within(s).findByRole('button', { name: /^\/revisar-cambios/ })
    const pressed = (el: HTMLElement): string | null => el.getAttribute('aria-pressed')
    const segs = (): (string | null)[] => ['Todas', 'Activas', 'Apagadas'].map((n) => pressed(seg(s, n)))

    await user.click(tileOf(s, 'Activas'))
    expect(pressed(tileOf(s, 'Activas'))).toBe('true')
    expect(segs()).toEqual(['false', 'true', 'false'])
    expect(cards()).toHaveLength(6)
    await user.click(tileOf(s, 'Activas'))
    expect(pressed(tileOf(s, 'Activas'))).toBe('false')
    expect(segs()).toEqual(['true', 'false', 'false'])
    expect(cards()).toHaveLength(ITEMS.length - 3)

    await user.click(seg(s, 'Apagadas'))
    expect(pressed(tileOf(s, 'Apagadas'))).toBe('true')
    await user.click(tileOf(s, 'Apagadas'))
    expect(segs()).toEqual(['true', 'false', 'false'])

    await user.click(tileOf(s, 'Choques'))
    expect(pressed(tileOf(s, 'Choques'))).toBe('true')
    expect(segs()).toEqual(['false', 'false', 'false'])
    expect(cards().sort()).toEqual(['/deploy', '/escribir-docs'])
    await user.click(seg(s, 'Todas'))
    expect(pressed(tileOf(s, 'Choques'))).toBe('false')
    await user.click(tileOf(s, 'Sin usar en 30 días'))
    expect(segs()).toEqual(['false', 'false', 'false'])

    cleanup()
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('sola', 'personal')]) } })
    render(createElement(App))
    const s2 = await open()
    await within(s2).findByRole('button', { name: '/sola' })
    await user.click(tileOf(s2, 'Choques'))
    expect(within(s2).getByText('No tienes ningún choque.')).toBeTruthy()
  })

  it("arrows move between rows and slash goes to search", async () => {
    const read = vi.fn(async () => '---\nname: uno\ndescription: x\n---\n')
    mockApi({ repos: [repo('shop-web')], skills: { 'shop-web': list([item('uno', 'personal'), item('dos', 'personal'), item('tres', 'project')]) } }, undefined, { skills: { read } as never })
    render(createElement(App))
    const s = await open()
    const user = userEvent.setup()
    const row = async (n: string): Promise<HTMLElement> => within(s).findByRole('button', { name: n })
    const search = within(s).getByRole('searchbox', { name: 'Buscar por nombre o descripción…' })

    // From the search box, ↓ goes to the first row; then across groups, stopping at both ends.
    search.focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(await row('/dos'))
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(await row('/dos'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(await row('/uno'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(await row('/tres'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(await row('/tres'))

    // Enter opens the detail.
    await user.keyboard('{Enter}')
    expect(screen.getByRole('complementary', { name: '/tres' })).toBeTruthy()
    await user.keyboard('{Escape}')

    // «/» outside a field goes to search without typing.
    expect(document.activeElement).toBe(await row('/tres'))
    await user.keyboard('/')
    expect(document.activeElement).toBe(search)
    expect((search as HTMLInputElement).value).toBe('')
    // Inside a field it types.
    await user.keyboard('a/b')
    expect((search as HTMLInputElement).value).toBe('a/b')
    await user.clear(search)

    // In the editor's textarea it types too.
    await user.click(await row('/uno'))
    await user.click(within(screen.getByRole('complementary', { name: '/uno' })).getByRole('button', { name: 'Editar' }))
    const box = await screen.findByRole('textbox', { name: 'Texto de uno' })
    await user.type(box, '/')
    expect(document.activeElement).toBe(box)
    expect((box as HTMLTextAreaElement).value.endsWith('/')).toBe(true)

    // With a dialog open, «/» stays out of the list.
    await user.click(within(screen.getByRole('complementary', { name: '/uno' })).getByRole('button', { name: 'Descartar' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Tienes cambios sin guardar. ¿Descartarlos?' })).getByRole('button', { name: 'Seguir editando' }))
    await user.click(within(s).getAllByRole('button', { name: 'Nueva skill' })[0]!)
    const dlg = screen.getByRole('dialog')
    within(dlg).getAllByRole('button')[0]!.focus()
    await user.keyboard('/')
    expect(document.activeElement).not.toBe(search)
  })

  it("a row is one 36 px line", () => {
    const css = readFileSync(join(__dirname, '../styles.css'), 'utf8')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1]!.trim(), body: m[2]! }))
    const row = rules.filter((r) => r.sel === '.skr')
    expect(row).toHaveLength(1)
    expect(row[0]!.body).toMatch(/(^|;|\s)height:\s*36px/)
    const others = rules.filter((r) => r.sel !== '.skr' && r.sel.split(',').some((x) => /\.skr(?![\w-])/.test(x)))
    expect(others.filter((r) => /(^|;|\s)(min-|max-)?height:/.test(r.body)).map((r) => r.sel)).toEqual([])
    const desc = rules.find((r) => r.sel === '.skr-d')
    expect(desc?.body).toMatch(/white-space:\s*nowrap/)
    expect(desc?.body).toMatch(/text-overflow:\s*ellipsis/)
  })
})
