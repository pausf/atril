// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HarnessItem, HarnessResult, RepoView } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'
import { UiProvider } from '../ui'
import { HarnessCard } from './HarnessCard'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })
const shop: RepoView = { id: 'shop-web', path: '/tmp/shop-web', mode: 'worktree', reason: '', health: 'ok' }

const item = (id: HarnessItem['id'], group: HarnessItem['group'], ok: boolean, more: Partial<HarnessItem> = {}): HarnessItem => ({ id, group, ok, ...more })
// Five found, five missing; docs for memory, skills, hooks, permissions, precommit and prepush as main answers.
const sample: HarnessItem[] = [
  item('memory', 'context', true, { detail: 'CLAUDE.md', n: 142, doc: true }),
  item('skills', 'context', false, { doc: true }),
  item('lint', 'verification', true, { detail: 'lint' }),
  item('typecheck', 'verification', false),
  item('test', 'verification', true, { detail: 'test' }),
  item('precommit', 'verification', false, { doc: true }),
  item('ci', 'verification', false),
  item('hooks', 'guardrails', true, { doc: true }),
  item('permissions', 'guardrails', false, { doc: true }),
  item('prepush', 'guardrails', true, { detail: '.githooks', doc: true })
]
const ofItems = (items: HarnessItem[]): HarnessResult => ({ items })

async function openSettings() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Ajustes/))
  return { user, repos: await screen.findByRole('region', { name: 'Repos' }) }
}
const toggle = (repos: HTMLElement, id = 'shop-web') => within(repos).findByRole('button', { name: `Harness de ${id}` })
const deferred = <T,>() => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('the Harness card', () => {
  // W286
  it('the Harness card lists found and missing items and offers a doc for each gap', async () => {
    mockApi({ repos: [shop], harness: { 'shop-web': ofItems(sample) } })
    const { user, repos } = await openSettings()
    expect(within(repos).queryByText(/Harness · /)).toBeNull() // nothing is read until it is opened
    expect(window.atril.harness.get).not.toHaveBeenCalled()

    await user.click(await toggle(repos))
    expect(await within(repos).findByText('Harness · 5 de 10')).toBeTruthy()
    expect(window.atril.harness.get).toHaveBeenCalledWith('shop-web')
    for (const group of ['Contexto', 'Verificación', 'Salvaguardas']) expect(within(repos).getByRole('heading', { name: group })).toBeTruthy()

    // a tick or a gap is written as text, never colour alone
    expect(within(repos).getAllByText('Encontrado')).toHaveLength(5)
    expect(within(repos).getAllByText('Falta')).toHaveLength(5)
    expect(within(repos).getByText('CLAUDE.md · 142 líneas')).toBeTruthy()
    expect(within(repos).getByText(/La lee el agente al empezar cada sesión/)).toBeTruthy() // the why line

    // one button per gap that has a doc, none for found items or gaps without one
    const buttons = within(repos).getAllByRole('button', { name: /^Cómo montarlo: / })
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Cómo montarlo: Skills', 'Cómo montarlo: Hook de pre-commit', 'Cómo montarlo: Reglas de permisos'])
    await user.click(buttons[0]!)
    expect(window.atril.harness.doc).toHaveBeenCalledWith('skills')
    expect(window.atril.harness.doc).toHaveBeenCalledTimes(1)

    // closing and opening reads again
    await user.click(await toggle(repos))
    expect(within(repos).queryByText('Harness · 5 de 10')).toBeNull()
    await user.click(await toggle(repos))
    expect(await within(repos).findByText('Harness · 5 de 10')).toBeTruthy()
    expect(window.atril.harness.get).toHaveBeenCalledTimes(2)
  })

  // W288
  it('the Harness card writes counts, singular, size and unreadable files in words', async () => {
    mockApi({
      repos: [shop],
      harness: {
        'shop-web': ofItems([
          item('memory', 'context', true, { detail: 'AGENTS.md', big: true, doc: true }),
          item('skills', 'context', true, { n: 1, doc: true }),
          item('hooks', 'guardrails', false, { detail: 'unreadable', doc: true })
        ])
      }
    })
    const { user, repos } = await openSettings()
    await user.click(await toggle(repos))
    expect(await within(repos).findByText('AGENTS.md · más de 1 MB')).toBeTruthy()
    expect(within(repos).getByText('1 skill')).toBeTruthy()
    expect(within(repos).getByText('No se pudo leer el archivo')).toBeTruthy()
  })

  // W290
  it('the Harness card shows a Problem when the read fails or answers an error', async () => {
    let n = 0
    mockApi({
      repos: [shop],
      harness: async () => {
        n += 1
        if (n === 1) throw new Error('disk gone')
        if (n === 2) return { error: 'missing' }
        return ofItems(sample)
      }
    })
    const { user, repos } = await openSettings()
    await user.click(await toggle(repos)) // read 1 rejects
    const problem = await within(repos).findByRole('alert')
    expect(within(problem).getByText(/disk gone/)).toBeTruthy() // under «Ver detalle»
    await user.click(within(problem).getByRole('button', { name: 'Volver a comprobar' })) // read 2 answers { error }
    await waitFor(() => expect(n).toBe(2))
    expect(await within(repos).findByRole('alert')).toBeTruthy()
    await user.click(within(repos).getByRole('button', { name: 'Volver a comprobar' })) // read 3 works
    expect(await within(repos).findByText('Harness · 5 de 10')).toBeTruthy()
    expect(within(repos).queryByRole('alert')).toBeNull()
  })

  // W289
  it('the Harness card ignores the reply of an older read of the same card', async () => {
    const a = deferred<HarnessResult>()
    mockApi({
      repos: [shop],
      harness: (id) => (id === 'a' ? a.promise : Promise.resolve(ofItems([item('memory', 'context', false, { doc: true })])))
    })
    const view = render(createElement(UiProvider, null, createElement(HarnessCard, { repoId: 'a' })))
    view.rerender(createElement(UiProvider, null, createElement(HarnessCard, { repoId: 'b' })))
    expect(await screen.findByText('Harness · 0 de 1')).toBeTruthy()
    a.resolve(ofItems(sample)) // the first read of the same card answers after the second
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByText('Harness · 0 de 1')).toBeTruthy()
    expect(screen.queryByText('Harness · 5 de 10')).toBeNull()
  })

  // W287
  it('a broken repo row has no Harness button', async () => {
    mockApi({
      repos: [shop, { ...shop, id: 'old-api', path: '/tmp/old-api', health: 'missing' }, { ...shop, id: 'notes', path: '/tmp/notes', health: 'not-git' }],
      harness: { 'shop-web': ofItems(sample) }
    })
    const { repos } = await openSettings()
    expect(await toggle(repos)).toBeTruthy()
    expect(within(repos).getByText('old-api')).toBeTruthy()
    expect(within(repos).queryByRole('button', { name: /^Harness de old-api/ })).toBeNull()
    expect(within(repos).queryByRole('button', { name: /^Harness de notes/ })).toBeNull()
  })
})
