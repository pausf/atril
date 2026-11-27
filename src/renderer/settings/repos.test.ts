// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddRepoResult, PathProblem, RepoView, StateProblem } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const repos: RepoView[] = [
  { id: 'web', path: '/w', mode: 'worktree', reason: 'worktree: no signal found', health: 'ok' },
  { id: 'cms', path: '/c', mode: 'in-place', reason: 'web/.env no está versionado', health: 'ok' }
]
const rail = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Pantallas' })).getByRole('button', { name })

async function openCard() {
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(rail(/Ajustes/))
  const card = await screen.findByRole('region', { name: 'Repos' })
  return { user, card }
}

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('repos card', () => {
  it('repos card lists and sets the mode', async () => {
    const api = mockApi({ repos: [...repos, { id: 'gone', path: '/g', mode: 'worktree', reason: '', health: 'missing' }] })
    const { user, card } = await openCard()
    expect(within(card).getByText('/w')).toBeTruthy()
    const mode = within(card).getByLabelText('Modo de web') as HTMLSelectElement
    expect(Array.from(mode.options).map((o) => o.textContent)).toEqual(['Auto · worktree', 'Worktree', 'In-place'])
    expect(mode.value).toBe('auto')

    await user.selectOptions(mode, 'in-place')
    expect(api.reposApi.setOverride).toHaveBeenLastCalledWith('web', 'in-place')
    await vi.waitFor(() => expect((within(card).getByLabelText('Modo de web') as HTMLSelectElement).value).toBe('in-place'))
    await user.selectOptions(within(card).getByLabelText('Modo de web'), 'auto')
    expect(api.reposApi.setOverride).toHaveBeenLastCalledWith('web', null)

    // The in-place one says why.
    expect(within(card).getByText('web/.env no está versionado')).toBeTruthy()
    expect(within(card).queryByText('worktree: no signal found')).toBeNull()
    // Only a healthy repo has a mode to choose.
    expect(within(card).getByText('/g')).toBeTruthy()
    expect(within(card).queryByLabelText('Modo de gone')).toBeNull()
  })

  it('any repo can be removed and a refusal can be dismissed', async () => {
    const api = mockApi({ repos, removeRepo: { cms: { error: 'cms tiene trabajos abiertos: ciérralos antes.' } } })
    const { user, card } = await openCard()
    const row = (id: string) => within(card).getByText(id).closest('li') as HTMLElement

    await user.click(within(row('cms')).getByRole('button', { name: 'Quitar el repo' }))
    expect(api.reposApi.remove).toHaveBeenCalledWith('cms')
    const alert = await within(row('cms')).findByRole('alert')
    expect(alert.textContent).toContain('cms tiene trabajos abiertos: ciérralos antes.')
    await user.click(within(alert).getByRole('button', { name: 'Cerrar aviso' }))
    expect(within(card).queryByRole('alert')).toBeNull()

    await user.click(within(row('web')).getByRole('button', { name: 'Quitar el repo' }))
    await vi.waitFor(() => expect(within(card).queryByText('/w')).toBeNull())
    expect(within(card).getByText('/c')).toBeTruthy()
  })

  it('a broken repo can be found again', async () => {
    const broken: RepoView[] = [
      { id: 'gone', path: '/g', mode: 'worktree', reason: '', health: 'missing' },
      { id: 'plain', path: '/p', mode: 'worktree', reason: '', health: 'not-git' }
    ]
    const api = mockApi({ repos: broken, relocateRepo: { plain: { error: 'Esa carpeta ya es el repo gone.' } } })
    const { user, card } = await openCard()
    const row = (id: string) => within(card).getByText(id).closest('li') as HTMLElement

    expect(await within(row('gone')).findByText('Carpeta no encontrada')).toBeTruthy()
    expect(within(row('plain')).getByText('No es un repo de git')).toBeTruthy()
    expect(within(card).queryByRole('combobox')).toBeNull()

    await user.click(within(row('plain')).getByRole('button', { name: 'Buscar la carpeta…' }))
    expect(api.reposApi.relocate).toHaveBeenCalledWith('plain')
    expect((await within(row('plain')).findByRole('alert')).textContent).toContain('Esa carpeta ya es el repo gone.')

    await user.click(within(row('gone')).getByRole('button', { name: 'Buscar la carpeta…' }))
    expect(api.reposApi.relocate).toHaveBeenLastCalledWith('gone')
    await vi.waitFor(() => expect(within(card).getByLabelText('Modo de gone')).toBeTruthy())
    expect(within(row('gone')).queryByText('Carpeta no encontrada')).toBeNull()
  })

  it('adding a repo asks for a free id', async () => {
    const api = mockApi({ repos, addRepo: { error: 'id-taken', suggested: 'web-2', path: '/x' } })
    const { user, card } = await openCard()
    await user.click(within(card).getByRole('button', { name: /Añadir repo/ }))
    const id = await within(card).findByLabelText('Ya hay otro repo con ese nombre. Elige otro id.')
    expect((id as HTMLInputElement).value).toBe('web-2')
    await user.clear(id)
    await user.type(id, 'shop')
    await user.click(within(card).getByRole('button', { name: 'Usar este id' }))
    expect(api.reposApi.addWithId).toHaveBeenCalledWith('/x', 'shop')
  })

  it('a folder that is not git is refused', async () => {
    const api = mockApi({ repos, addRepo: { error: 'not-a-git-repo', path: '/x' } })
    const { user, card } = await openCard()
    await user.click(within(card).getByRole('button', { name: /Añadir repo/ }))
    expect(await within(card).findByText('Esa carpeta no es un repositorio git.')).toBeTruthy()
    expect(api.reposApi.addWithId).not.toHaveBeenCalled()
  })

  describe('adding by a typed path', () => {
    const field = (card: HTMLElement) => within(card).getByLabelText('Ruta de un repo de git') as HTMLInputElement
    const addBtn = (card: HTMLElement) => within(card).getByRole('button', { name: 'Añadir esta ruta' }) as HTMLButtonElement
    const view = (id: string, path: string): RepoView => ({ id, path, mode: 'worktree', reason: '', health: 'ok' })
    const refused = (what: string, fix: PathProblem['fix'] = 'pick'): PathProblem => ({ error: 'bad-path', what, detail: '/nope', fix })
    const damaged: StateProblem = { error: 'No puedo leer repos.json: está dañado.', detail: 'Unexpected end of JSON input', fix: 'reveal', file: 'repos' }

    it('a repo can be added by typing its path', async () => {
      const list = [...repos]
      const api = mockApi({
        repos: list,
        addRepo: { error: 'not-a-git-repo', path: '/x' },
        addPath: async (text) => {
          const repo = view(`r${list.length}`, `/home/me/${text.replace(/\W+/g, '')}`)
          list.push(repo)
          return { repo, path: repo.path }
        }
      })
      const { user, card } = await openCard()
      expect(field(card).placeholder).toBe('~/code/my-repo')
      expect(addBtn(card).disabled).toBe(true)
      await user.type(field(card), '   ')
      expect(addBtn(card).disabled).toBe(true)
      await user.clear(field(card))

      // The picker's own error line does not take the field away.
      await user.click(within(card).getByRole('button', { name: /Añadir repo/ }))
      expect(await within(card).findByText('Esa carpeta no es un repositorio git.')).toBeTruthy()
      await user.type(field(card), '~/code/new')
      expect(addBtn(card).disabled).toBe(false)
      await user.click(addBtn(card))
      expect(api.reposApi.addPath).toHaveBeenLastCalledWith('~/code/new')
      expect(await within(card).findByText('/home/me/codenew')).toBeTruthy()
      expect(field(card).value).toBe('')

      await user.type(field(card), '~/other{Enter}')
      expect(api.reposApi.addPath).toHaveBeenLastCalledWith('~/other')
      expect(await within(card).findByText('/home/me/other')).toBeTruthy()

      // A damaged repos.json takes the field and the button away with the other buttons.
      cleanup()
      mockApi({ reposProblem: damaged })
      const again = await openCard()
      await within(again.card).findByText(damaged.error)
      expect(within(again.card).queryByLabelText('Ruta de un repo de git')).toBeNull()
      expect(within(again.card).queryByRole('button', { name: 'Añadir esta ruta' })).toBeNull()
    })

    it('a typed path that cannot be added says what happened and offers one fix', async () => {
      const answers: Array<AddRepoResult & { path: string } | PathProblem> = []
      const api = mockApi({ repos, addRepo: { error: 'not-a-git-repo', path: '/x' }, addPath: async () => answers.shift()! })
      const install = vi.spyOn(window.atril, 'installTool')
      const { user, card } = await openCard()
      const type = async (text: string) => {
        await user.clear(field(card))
        await user.type(field(card), text)
        await user.click(addBtn(card))
      }

      // What happened, what it stops, one button, the detail folded.
      answers.push(refused('No hay ninguna carpeta en /nope.'))
      await type('/nope')
      const alert = await within(card).findByRole('alert')
      expect(within(alert).getByText('No hay ninguna carpeta en /nope.')).toBeTruthy()
      expect(within(alert).getByText('No se ha añadido nada.')).toBeTruthy()
      expect(within(alert).getAllByRole('button').map((b) => b.textContent)).toEqual(['Elegir una carpeta…'])
      expect(within(alert).getByText('Ver detalle').closest('details')?.open).toBe(false)
      expect(within(alert).getByText('/nope')).toBeTruthy()
      expect(field(card).value).toBe('/nope')

      // Typing removes it.
      await user.type(field(card), 'x')
      expect(within(card).queryByRole('alert')).toBeNull()

      // «Elegir una carpeta…» is the picker, and starting it removes the problem.
      answers.push(refused('No hay ninguna carpeta en /nope.'))
      await type('/nope')
      await user.click(within(await within(card).findByRole('alert')).getByRole('button', { name: 'Elegir una carpeta…' }))
      expect(api.reposApi.add).toHaveBeenCalledTimes(1)
      expect(within(card).queryByRole('alert')).toBeNull()

      // The git fix runs the git install.
      answers.push(refused('git no funciona en este Mac.', 'git'))
      await type('/nope')
      await user.click(await within(await within(card).findByRole('alert')).findByRole('button', { name: 'Instalar herramientas de Xcode' }))
      expect(install).toHaveBeenCalledWith('git')

      // Starting an add by the typed path removes the picker's own error line, and a repo coming back removes the problem.
      await user.click(within(card).getByRole('button', { name: /Añadir repo/ }))
      expect(await within(card).findByText('Esa carpeta no es un repositorio git.')).toBeTruthy()
      answers.push(refused('{path} sigue sin ser una carpeta.'))
      await user.click(addBtn(card))
      await within(card).findByText('{path} sigue sin ser una carpeta.')
      expect(within(card).queryByText('Esa carpeta no es un repositorio git.')).toBeNull()
      answers.push({ repo: view('ok', '/home/me/ok'), path: '/home/me/ok' })
      await user.click(addBtn(card))
      await vi.waitFor(() => expect(within(card).queryByRole('alert')).toBeNull())
    })

    it('an answer for text edited after it was sent is dropped', async () => {
      let release!: (p: PathProblem) => void
      const held = new Promise<PathProblem>((resolve) => (release = resolve))
      mockApi({ repos, addPath: () => held })
      const { user, card } = await openCard()
      await user.type(field(card), 'a')
      await user.click(addBtn(card))
      await user.type(field(card), 'b')
      release(refused('No hay ninguna carpeta en /nope.'))
      await held
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(within(card).queryByRole('alert')).toBeNull()
      expect(field(card).value).toBe('ab')
    })

    it('a typed path whose id is taken asks for another and registers the resolved path', async () => {
      const api = mockApi({ repos, addPath: async () => ({ error: 'id-taken', suggested: 'shop-2', path: '/resolved/shop' }) })
      const { user, card } = await openCard()
      await user.type(field(card), '~/shop')
      await user.click(addBtn(card))
      const id = await within(card).findByLabelText('Ya hay otro repo con ese nombre. Elige otro id.')
      expect((id as HTMLInputElement).value).toBe('shop-2')
      // The field and its button stay beside the id prompt.
      expect(addBtn(card)).toBeTruthy()
      await user.clear(id)
      await user.type(id, 'mine')
      await user.click(within(card).getByRole('button', { name: 'Usar este id' }))
      expect(api.reposApi.addWithId).toHaveBeenCalledWith('/resolved/shop', 'mine')
      await vi.waitFor(() => expect(field(card).value).toBe(''))
    })

    it('a typed path while repos.json is damaged shows the damaged-file problem', async () => {
      mockApi({ repos, addPath: async () => ({ ...damaged, path: '/x' }) })
      const { user, card } = await openCard()
      await user.type(field(card), '/x')
      await user.click(addBtn(card))
      const alert = await within(card).findByRole('alert')
      expect(within(alert).getByText(damaged.error)).toBeTruthy()
      expect(within(alert).getByRole('button', { name: 'Mostrar en Finder' })).toBeTruthy()
      expect(within(alert).getByText('Ver detalle').closest('details')?.open).toBe(false)
      expect(within(card).queryByLabelText('Ruta de un repo de git')).toBeNull()
      expect(within(card).queryByRole('button', { name: 'Añadir esta ruta' })).toBeNull()
    })
  })

  describe('carried files', () => {
    const row = (card: HTMLElement, id: string) => within(card).getByText(id).closest('li') as HTMLElement
    const boxes = (panel: HTMLElement) =>
      within(panel).queryAllByRole('checkbox').map((b) => `${(b as HTMLInputElement).checked ? 'x' : ' '} ${b.closest('label')!.textContent!.trim()}`)

    it('the carried files of a repo are picked from suggestions or typed', async () => {
      const api = mockApi({ repos: [{ ...repos[0]!, carry: ['web/config.local'] }, repos[1]!], carrySuggest: { web: ['.env', 'web/config.local', 'z.local'], cms: [] } })
      const { user, card } = await openCard()
      const button = within(row(card, 'web')).getByRole('button', { name: 'Archivos que se copian de web' })
      expect(button.getAttribute('aria-expanded')).toBe('false')
      await user.click(button)
      expect(button.getAttribute('aria-expanded')).toBe('true')
      expect(api.reposApi.carrySuggest).toHaveBeenCalledWith('web')
      const panel = await within(row(card, 'web')).findByRole('group', { name: 'Archivos que se copian de web' })
      await vi.waitFor(() => expect(boxes(panel)).toEqual(['  .env', 'x web/config.local', '  z.local']))

      await user.click(within(panel).getByRole('checkbox', { name: '.env' }))
      expect(api.reposApi.setCarry).toHaveBeenLastCalledWith('web', ['web/config.local', '.env'])
      await vi.waitFor(() => expect(boxes(panel)).toEqual(['x .env', 'x web/config.local', '  z.local']))
      await user.click(within(panel).getByRole('checkbox', { name: 'web/config.local' }))
      expect(api.reposApi.setCarry).toHaveBeenLastCalledWith('web', ['.env'])
      // A suggestion stays, unticked.
      await vi.waitFor(() => expect(boxes(panel)).toEqual(['x .env', '  web/config.local', '  z.local']))

      const field = within(panel).getByLabelText('Añadir un archivo')
      await user.type(field, 'secrets/app.yml{Enter}')
      expect(api.reposApi.setCarry).toHaveBeenLastCalledWith('web', ['.env', 'secrets/app.yml'])
      await vi.waitFor(() => expect(boxes(panel)).toEqual(['x .env', 'x secrets/app.yml', '  web/config.local', '  z.local']))
      expect((field as HTMLInputElement).value).toBe('')
      await user.type(field, 'b.local')
      await user.click(within(panel).getByRole('button', { name: 'Añadir' }))
      expect(api.reposApi.setCarry).toHaveBeenLastCalledWith('web', ['.env', 'secrets/app.yml', 'b.local'])

      // A typed entry unticked leaves the panel: it is no suggestion.
      await vi.waitFor(() => expect(within(panel).getByRole('checkbox', { name: 'secrets/app.yml' })).toBeTruthy())
      await user.click(within(panel).getByRole('checkbox', { name: 'secrets/app.yml' }))
      await vi.waitFor(() => expect(boxes(panel)).toEqual(['x .env', 'x b.local', '  web/config.local', '  z.local']))

      // Nothing saved, nothing suggested.
      await user.click(within(row(card, 'cms')).getByRole('button', { name: 'Archivos que se copian de cms' }))
      expect(await within(row(card, 'cms')).findByText('No hay archivos ignorados aquí. Escribe uno para copiarlo.')).toBeTruthy()
    })

    it('a refused carry list or suggestion failure says nothing was saved', async () => {
      const api = mockApi({
        repos: [{ ...repos[0]!, carry: ['.env'] }, repos[1]!],
        carrySuggest: { web: ['.env'], cms: { error: 'git no ha podido listar los archivos ignorados de cms.', detail: 'fatal: boom' } },
        setCarry: { error: '../x no es la ruta de un archivo dentro del repo.' }
      })
      const { user, card } = await openCard()
      await user.click(within(row(card, 'web')).getByRole('button', { name: 'Archivos que se copian de web' }))
      const panel = await within(row(card, 'web')).findByRole('group', { name: 'Archivos que se copian de web' })
      const field = within(panel).getByLabelText('Añadir un archivo')
      await user.type(field, '../x{Enter}')
      expect(api.reposApi.setCarry).toHaveBeenLastCalledWith('web', ['.env', '../x'])
      const alert = await within(panel).findByRole('alert')
      expect(alert.textContent).toContain('../x no es la ruta de un archivo dentro del repo.')
      expect(alert.textContent).toContain('No se ha guardado nada.')
      expect(within(alert).getAllByRole('button').map((b) => b.textContent)).toEqual(['Cerrar aviso'])
      expect(alert.querySelector('details')).toBeNull()
      expect((field as HTMLInputElement).value).toBe('../x')
      expect(boxes(panel)).toEqual(['x .env'])
      await user.click(within(alert).getByRole('button', { name: 'Cerrar aviso' }))
      expect(within(panel).queryByRole('alert')).toBeNull()

      await user.click(within(row(card, 'cms')).getByRole('button', { name: 'Archivos que se copian de cms' }))
      const cms = await within(row(card, 'cms')).findByRole('group', { name: 'Archivos que se copian de cms' })
      const failed = await within(cms).findByRole('alert')
      expect(failed.textContent).toContain('git no ha podido listar los archivos ignorados de cms.')
      expect(failed.textContent).toContain('No se muestran las sugerencias.')
      expect(failed.querySelector('details code')?.textContent).toBe('fatal: boom')

      // A damaged repos.json: the card's own problem, as the mode select shows it.
      vi.mocked(api.reposApi.setCarry).mockResolvedValueOnce({ problem: { error: 'No puedo leer repos.json: está dañado.', detail: 'x', fix: 'reveal', file: 'repos' } })
      await user.click(within(panel).getByRole('checkbox', { name: '.env' }))
      expect(await within(card).findByText('No puedo leer repos.json: está dañado.')).toBeTruthy()
    })
  })
})

