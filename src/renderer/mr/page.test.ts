// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { Aviso, MrDraft, MrDrafts, MrDraftsResult, MrItem, MrLists, MrPageFile, MrScore, MrThread, WorkspaceView } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme } from '../mockApi'

const GH = 'https://github.com/acme/web/pull/1'
const GL = 'https://git.example.com/grp/shop/-/merge_requests/7'
const at = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString()
const mr = (url: string, o: Partial<MrItem> = {}): MrItem => ({ forge: 'github', url, title: `Título de ${url}`, project: 'acme/web', author: 'ana', updatedAt: at(1), ...o })
const lists = (o: Partial<MrLists> = {}): MrLists => ({ connected: ['github', 'gitlab'], mine: [], review: [], following: [], more: { mine: [], review: [], following: [] }, errors: [], ...o })
const c = (id: string, author: string, h: number, body = `texto ${id}`) => ({ id, author, at: at(h), body })

const MINE = mr(GH, { title: 'Envío con IVA', author: 'pau', branch: 'feat/envio', target: 'main' })
const REVIEW = mr(GL, { forge: 'gitlab', title: 'Nuevo filtro', project: 'grp/shop', author: 'ana', branch: 'feat/filtro', target: 'develop' })
const draft = (id: string, o: Partial<MrDraft> = {}): MrDraft => ({ id, lens: 'security', severity: 'high', text: `borrador ${id}`, state: 'open', ...o })
const th = (id: string, o: Partial<MrThread> = {}): MrThread => ({ id, forge: 'github', comments: [c(`c${id}`, 'eva', 2, `hilo ${id}`)], yourTurn: false, ...o })
const FILES: MrPageFile[] = [
  {
    path: 'src/envio.ts',
    oldPath: 'src/envio.ts',
    added: 2,
    removed: 1,
    lines: [
      { kind: 'context', old: 10, new: 10, text: 'keep' },
      { kind: 'removed', old: 11, text: 'gone' },
      { kind: 'added', new: 11, text: 'nuevo' },
      { kind: 'context', old: 12, new: 12, text: 'tail' },
      { kind: 'added', new: 40, text: 'lejos' }
    ]
  },
  { path: 'src/ui.ts', oldPath: 'src/ui.ts', added: 1, removed: 0, lines: [{ kind: 'added', new: 1, text: 'ui' }] },
  { path: 'big.json', oldPath: 'big.json', added: 900, removed: 0, lines: [], cut: true },
  { path: 'huge.bin', oldPath: 'huge.bin', added: 0, removed: 0, lines: [], tooLarge: true }
]
const GENERAL: MrThread = { id: 'general', forge: 'github', comments: [c('20', 'leo', 3, 'Esto es <b>IVA</b> fijo: **¿y Canarias?**')], yourTurn: true }

beforeEach(() => {
  mockSystemTheme(false)
  // Trabajo mounts the opened workspace's terminal, which watches its size.
  vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  cleanup()
})

const workspace = (id: string, branch: string): WorkspaceView => ({ id, repoId: 'r1', branch, mode: 'worktree', path: `/wt/${id}`, baseCommit: 'abc', agent: 'claude', session: `atril-${id}`, paneId: '%1', alive: true })
const page = (title: string) => screen.findByRole('region', { name: title })
const row = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) })

async function toMr(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /^MR/ }))
}

describe('the mr page', () => {
  it('a row opens the mr page beside the inbox', async () => {
    const aviso: Aviso = { id: 'n1', kind: 'review', at: Date.now(), read: false, title: 'Nuevo filtro', url: GL, forge: 'gitlab' }
    const api = mockApi({ mrs: lists({ mine: [MINE], review: [REVIEW] }), threads: { [GH]: { threads: [GENERAL], more: false } }, avisos: [aviso] })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)
    await user.click(await screen.findByRole('button', { name: /^Envío con IVA/ }))

    // M43: no modal; the inbox stays on the left with the row marked, the page in the centre.
    const view = await page('Envío con IVA')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(row('Envío con IVA').getAttribute('aria-current')).toBe('true')
    expect(row('Nuevo filtro').getAttribute('aria-current')).toBeNull()
    expect(within(view).getByRole('button', { name: '‹ Tus MR' })).toBeTruthy()
    expect(within(view).getByText('GitHub · acme/web · Tuya · feat/envio → main')).toBeTruthy()
    expect(within(view).getByRole('heading', { name: 'Envío con IVA' })).toBeTruthy()
    // The side column holds its four cards in order.
    const side = screen.getByRole('complementary', { name: 'Esta MR' })
    expect(within(side).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Puntuación', 'Contra su spec', 'Revisores', 'CI'])
    expect(api.mrApi.page).toHaveBeenCalledWith(GH)

    // M5: the row opened the page, not the browser; «Abrir en GitHub ↗» does.
    expect(api.mrApi.open).not.toHaveBeenCalled()
    await user.click(within(view).getByRole('button', { name: 'Abrir en GitHub ↗' }))
    expect(api.mrApi.open).toHaveBeenCalledWith(GH)

    // M23: comments show as text, markup literally.
    await user.click(within(view).getByRole('tab', { name: /^Conversación/ }))
    expect(await within(view).findByText('Esto es <b>IVA</b> fijo: **¿y Canarias?**')).toBeTruthy()
    expect(view.querySelector('b')).toBeNull()

    // Another row leaves this page for that one; the line says whose it is.
    await user.click(row('Nuevo filtro'))
    const other = await page('Nuevo filtro')
    expect(within(other).getByText('GitLab · grp/shop · De ana · feat/filtro → develop')).toBeTruthy()
    expect(row('Nuevo filtro').getAttribute('aria-current')).toBe('true')
    expect(row('Envío con IVA').getAttribute('aria-current')).toBeNull()

    // «‹ Tus MR» goes back to the inbox.
    await user.click(within(other).getByRole('button', { name: '‹ Tus MR' }))
    expect(screen.queryByRole('region', { name: 'Nuevo filtro' })).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Esta MR' })).toBeNull()

    // Escape leaves too; with a reply written it asks first, and stays when told no.
    await user.click(row('Envío con IVA'))
    await page('Envío con IVA')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Envío con IVA' })).toBeNull()
    expect(confirm).not.toHaveBeenCalled()
    await user.click(row('Envío con IVA'))
    const again = await page('Envío con IVA')
    await user.click(within(again).getByRole('tab', { name: /^Conversación/ }))
    await user.type(await within(again).findByRole('textbox', { name: 'Responder' }), 'a medias')
    await user.keyboard('{Escape}')
    expect(confirm).toHaveBeenLastCalledWith('Tienes una respuesta sin enviar. ¿Salir y descartarla?')
    expect(screen.getByRole('region', { name: 'Envío con IVA' })).toBeTruthy()
    // The same question before another row, then before «‹ Tus MR».
    await user.click(row('Nuevo filtro'))
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('region', { name: 'Envío con IVA' })).toBeTruthy()
    confirm.mockReturnValue(true)
    await user.click(within(again).getByRole('button', { name: '‹ Tus MR' }))
    expect(confirm).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('region', { name: 'Envío con IVA' })).toBeNull()

    // An Avisos notice opens its MR's page (V6).
    await user.click(screen.getByRole('button', { name: /^Avisos/ }))
    await user.click(within(screen.getByRole('list', { name: 'Avisos' })).getByRole('button', { name: /Nuevo filtro/ }))
    expect(await page('Nuevo filtro')).toBeTruthy()
    expect(row('Nuevo filtro').getAttribute('aria-current')).toBe('true')
  })

  it('threads and drafts sit on their lines', async () => {
    const threads = [
      th('t1', { file: 'src/envio.ts', line: 11, yourTurn: true, code: '+nuevo' }),
      th('t2', { file: 'src/envio.ts', line: 11, side: 'old' }),
      th('t3', { file: 'src/ui.ts' }),
      th('t4', { file: 'src/envio.ts', line: 99, code: '+perdida' }),
      th('t5', { file: 'src/envio.ts', line: 11, outdated: true }),
      th('t6', { file: 'otro.ts', line: 3 }),
      { ...GENERAL, yourTurn: false }
    ]
    const drafts = [
      draft('d1', { file: 'src/envio.ts', line: 12 }),
      draft('d2', { file: 'src/envio.ts', line: 11, state: 'published' }),
      draft('d3', { file: 'src/envio.ts', line: 77 }),
      draft('d4', { file: 'big.json', line: 1 }),
      draft('d5', { file: 'huge.bin', line: 1, state: 'sent' }),
      draft('d6')
    ]
    mockApi({ mrs: lists({ mine: [MINE] }), pages: { [GH]: { files: FILES, reviewers: [] } }, threads: { [GH]: { threads, more: false } }, drafts: { [GH]: { head: 'h1', stale: false, canSend: false, drafts } } })
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)
    await user.click(await screen.findByRole('button', { name: /^Envío con IVA/ }))
    const view = await page('Envío con IVA')

    // M47: each file with its lines, both numbers and the sign.
    const line = async (text: string) => (await within(view).findByText(text)).closest('.mr-ln') as HTMLElement
    const nuevo = await line('nuevo')
    expect(nuevo.textContent).toBe('11+nuevo')
    expect((await line('gone')).textContent).toBe('11−gone')
    expect((await line('keep')).textContent).toBe('1010 keep')
    // What follows a line until the next one: its threads, then its drafts.
    const after = (el: HTMLElement): string[] => {
      const out: string[] = []
      for (let n = el.nextElementSibling; n && !n.classList.contains('mr-ln'); n = n.nextElementSibling) out.push(n.textContent ?? '')
      return out
    }
    expect(after(nuevo)).toEqual([expect.stringContaining('hilo t1'), expect.stringContaining('borrador d2')])
    expect(after(nuevo)[0]).toContain('Te toca responder')
    expect(after(await line('gone'))).toEqual([expect.stringContaining('hilo t2')])
    expect(after(await line('tail'))).toEqual([expect.stringContaining('borrador d1')])
    // The thread on its line keeps its reply box; the published draft says so with nothing to press, the open one offers its line.
    const t1 = nuevo.nextElementSibling as HTMLElement
    expect(within(t1).getByRole('textbox', { name: 'Responder' })).toBeTruthy()
    expect(within(t1).getByRole('button', { name: 'Enviar' })).toBeTruthy()
    // Under its own line, the forge's copy of that line is not repeated.
    expect(t1.querySelector('.mr-code')).toBeNull()
    expect(within(nuevo.nextElementSibling!.nextElementSibling as HTMLElement).getByText('Publicado')).toBeTruthy()
    expect(within((await line('tail')).nextElementSibling as HTMLElement).getByRole('button', { name: 'Publicar en esta línea' })).toBeTruthy()
    // A file thread under its file's header.
    const ui = within(view).getByRole('region', { name: 'src/ui.ts' })
    expect(ui.querySelector('.mr-file-h')!.nextElementSibling!.textContent).toContain('hilo t3')
    // A draft with no line above the files, with «Publicar».
    const top = within(view).getByText('borrador d6').closest('.mr-draft') as HTMLElement
    expect(top.compareDocumentPosition(within(view).getByRole('region', { name: 'src/envio.ts' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(top).getByRole('button', { name: 'Publicar' })).toBeTruthy()
    // Cut and unsent files say why they show no lines.
    expect(within(within(view).getByRole('region', { name: 'big.json' })).getByText('Demasiado grande para enseñarlo aquí: ábrela en GitHub')).toBeTruthy()
    expect(within(within(view).getByRole('region', { name: 'huge.bin' })).getByText('GitLab no manda este archivo: es demasiado grande')).toBeTruthy()
    // Código shows none of the rest.
    for (const gone of ['hilo t4', 'hilo t5', 'hilo t6', 'borrador d3', 'borrador d4', 'borrador d5']) expect(within(view).queryByText(gone)).toBeNull()

    // M24: each tab counts the threads it shows, and its own «te toca» only above zero.
    expect(within(view).getByRole('tab', { name: 'Código 3 · te toca 1' })).toBeTruthy()
    await user.click(within(view).getByRole('tab', { name: 'Conversación 4' }))
    const talk = within(view).getByRole('tabpanel')
    const note = 'Esa línea ya no está en el diff'
    const article = (text: string) => within(talk).getByText(text).closest('article') as HTMLElement
    expect(within(article('hilo t4')).getByText(note)).toBeTruthy()
    expect(article('hilo t4').querySelector('.mr-code')?.textContent).toBe('+perdida')
    expect(within(article('hilo t5')).getByText(note)).toBeTruthy()
    expect(within(article('hilo t6')).queryByText(note)).toBeNull()
    expect(within(talk).getByText('Esto es <b>IVA</b> fijo: **¿y Canarias?**')).toBeTruthy()
    for (const d of ['borrador d3', 'borrador d4', 'borrador d5']) expect(within(talk).getByText(d)).toBeTruthy()
    for (const gone of ['hilo t1', 'hilo t2', 'hilo t3', 'borrador d1', 'borrador d2', 'borrador d6']) expect(within(talk).queryByText(gone)).toBeNull()
    // No header tag counts your turn any more.
    expect(within(view).queryByText(/^Te toca responder: /)).toBeNull()
  })

  it('the header holds only short buttons', async () => {
    const FOLLOW = 'https://github.com/acme/web/pull/3'
    mockApi({
      mrs: lists({ mine: [{ ...MINE, ci: 'fail' }], review: [REVIEW], following: [mr(FOLLOW, { title: 'Ajena' })] }),
      work: { [GH]: { kind: 'continue' }, [GL]: { kind: 'review' }, [FOLLOW]: { kind: 'none', reason: 'Añade el repo de acme/web en Ajustes' } },
      ciAgents: { [GH]: 'feat/envio' },
      threads: { [GH]: { threads: [GENERAL], more: false } }
    })
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)
    const head = (view: HTMLElement) => within(view.querySelector('.mr-page-head') as HTMLElement).getAllByRole('button').map((b) => b.textContent)

    // M44: Mías with continue: «Seguir en Atril», «Revisar ▾», «Abrir en GitHub ↗» and nothing else.
    await user.click(await screen.findByRole('button', { name: /^Envío con IVA/ }))
    let view = await page('Envío con IVA')
    await within(view).findByRole('button', { name: 'Seguir en Atril' })
    expect(head(view)).toEqual(['Seguir en Atril', 'Revisar ▾', 'Abrir en GitHub ↗'])
    // The long texts are gone from the header, and the CI fix lives in its card.
    for (const name of ['Revisar con Libretto', 'Revisar en Atril', 'Arreglar CI con Claude']) expect(within(view).queryByRole('button', { name })).toBeNull()
    expect(within(view).queryByText(/^Te toca responder: /)).toBeNull()
    expect(await within(screen.getByRole('complementary', { name: 'Esta MR' })).findByRole('button', { name: 'Arreglar CI con Claude' })).toBeTruthy()

    // Me toca revisar: the review goes in the menu as «A fondo», not as a header button.
    await user.click(row('Nuevo filtro'))
    view = await page('Nuevo filtro')
    await waitFor(() => expect(head(view)).toEqual(['Revisar ▾', 'Abrir en GitLab ↗']))

    // M33's none: the reason under the header with its link to Ajustes → Repos; Sigo without A fondo has no «Revisar ▾».
    await user.click(row('Ajena'))
    view = await page('Ajena')
    const note = await within(view).findByText('Añade el repo de acme/web en Ajustes')
    expect(note.closest('.mr-page-head')).toBeNull()
    expect(head(view)).toEqual(['Abrir en GitHub ↗'])
    await user.click(within(view).getByRole('button', { name: 'Ajustes → Repos' }))
    expect(await screen.findByRole('heading', { name: 'Repos' })).toBeTruthy()
  })

  it('revisar offers the levels each list allows', async () => {
    const FOLLOW = 'https://github.com/acme/web/pull/3'
    const SEEN = 'https://github.com/acme/web/pull/4'
    const OLD = 'https://github.com/acme/web/pull/5'
    const NONE = 'https://github.com/acme/web/pull/6'
    const reviewed: MrDrafts = { head: 'h1', stale: false, canSend: false, drafts: [draft('x')] }
    let answer!: (r: MrDraftsResult) => void
    const api = mockApi({
      mrs: lists({ mine: [MINE, mr(SEEN, { title: 'Ya comentada', author: 'pau' })], review: [REVIEW, mr(OLD, { title: 'Vieja' })], following: [mr(FOLLOW, { title: 'Ajena' }), mr(NONE, { title: 'Sin nada' })] }),
      work: { [GH]: { kind: 'continue' }, [GL]: { kind: 'review' }, [FOLLOW]: { kind: 'existing', workspaceId: 'rev1' }, [OLD]: { kind: 'review' }, [NONE]: { kind: 'none', reason: 'Añade el repo' } },
      workspaces: [{ ...workspace('rev1', 'feat/ajena'), mode: 'review' }],
      drafts: { [SEEN]: reviewed, [OLD]: { ...reviewed, stale: true } },
      openWork: { [GL]: { workspace: { ...workspace('rev2', 'feat/filtro'), mode: 'review' } } }
    })
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)
    const items = () => screen.getAllByRole('menuitem').map((i) => i.textContent)

    // Mías: Puntuar and Comentar with their subtitles; no A fondo. The keyboard opens, moves and closes it.
    await user.click(await screen.findByRole('button', { name: /^Envío con IVA/ }))
    let view = await page('Envío con IVA')
    const button = await within(view).findByRole('button', { name: 'Revisar ▾' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(items()).toEqual(['Puntuarnota y riesgo con sus razones', 'Comentarborradores por lente, en su línea'])
    expect(document.activeElement?.textContent).toMatch(/^Puntuar/)
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toMatch(/^Comentar/)
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toMatch(/^Puntuar/)
    // Escape closes the menu only (M43's layers) and gives focus back to the button.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)
    expect(screen.getByRole('region', { name: 'Envío con IVA' })).toBeTruthy()
    await user.keyboard(' ')
    expect(screen.getByRole('menu')).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menu')).toBeTruthy()

    // Puntuar runs M11; the status beside the button follows the score.
    await user.keyboard('{Enter}')
    expect(api.mrApi.score).toHaveBeenCalledWith(GH)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(within(view).getByRole('status').textContent).toBe('En cola')
    act(() => api.pushScore(GH, { state: 'running' }))
    expect(within(view).getByRole('status').textContent).toBe('Puntuando…')
    // Comentar runs M25; with both pending, the status is the review's.
    vi.mocked(api.mrApi.review).mockImplementationOnce(() => new Promise<MrDraftsResult>((r) => (answer = r)))
    await user.click(button)
    await user.click(screen.getByRole('menuitem', { name: /^Comentar/ }))
    expect(api.mrApi.review).toHaveBeenCalledWith(GH)
    expect(within(view).getByRole('status').textContent).toBe('Revisando…')
    await act(async () => answer({ head: 'h1', stale: false, canSend: false, drafts: [draft('n1', { text: 'Hallazgo nuevo' })] }))
    expect(await within(view).findByText('Hallazgo nuevo')).toBeTruthy()
    expect(within(view).getByRole('status').textContent).toBe('Puntuando…')

    // M26: drafts for this head disable Comentar with its reason; it still counts, so the button shows.
    await user.click(row('Ya comentada'))
    view = await page('Ya comentada')
    await user.click(await within(view).findByRole('button', { name: 'Revisar ▾' }))
    const done = await screen.findByRole('menuitem', { name: /^Comentar/ })
    await waitFor(() => expect(done.getAttribute('aria-disabled')).toBe('true'))
    expect(done.textContent).toContain('Ya comentada en este commit')
    await user.click(done)
    expect(api.mrApi.review).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')

    // An older head: «Comentar de nuevo».
    await user.click(row('Vieja'))
    view = await page('Vieja')
    await user.click(await within(view).findByRole('button', { name: 'Revisar ▾' }))
    expect(await screen.findByRole('menuitem', { name: /^Comentar de nuevo/ })).toBeTruthy()
    await user.keyboard('{Escape}')

    // Me toca revisar with M33's review: the three levels; A fondo runs M34 and ends on Trabajo.
    await user.click(row('Nuevo filtro'))
    view = await page('Nuevo filtro')
    await user.click(await within(view).findByRole('button', { name: 'Revisar ▾' }))
    await waitFor(() => expect(items()).toEqual(['Puntuarnota y riesgo con sus razones', 'Comentarborradores por lente, en su línea', 'A fondoen tu repo, con sus tests']))
    await user.click(screen.getByRole('menuitem', { name: /^A fondo/ }))
    expect(api.mrApi.openWork).toHaveBeenCalledWith(GL)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trabajo' }).getAttribute('aria-current')).toBe('page'))

    // Sigo with an existing review session: only «Ir a la revisión», which opens nothing new.
    await toMr(user)
    await user.click(await screen.findByRole('button', { name: /^Ajena/ }))
    view = await page('Ajena')
    await user.click(await within(view).findByRole('button', { name: 'Revisar ▾' }))
    expect(items()).toEqual(['Ir a la revisiónen tu repo, con sus tests'])
    await user.click(screen.getByRole('menuitem', { name: /^Ir a la revisión/ }))
    expect(api.mrApi.openWork).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trabajo' }).getAttribute('aria-current')).toBe('page'))

    // Sigo with nothing available: no button.
    await toMr(user)
    await user.click(await screen.findByRole('button', { name: /^Sin nada/ }))
    view = await page('Sin nada')
    await within(view).findByText('Añade el repo')
    expect(within(view).queryByRole('button', { name: 'Revisar ▾' })).toBeNull()
  })

  it('the side holds score, contract, reviewers and ci', async () => {
    const FOLLOW = 'https://github.com/acme/web/pull/3'
    const SCORE: MrScore = { head: 'c1', metrics: { added: 120, removed: 30, files: 6, tests: true, size: 'M' }, ai: { difficulty: 4, risk: 2, what: 'Adds <b>holidays</b>.', why: 'Touches dates.', where: ['src/calendar.ts'] }, lang: 'en', at: at(0), cut: { seen: 117, total: 300 } }
    const api = mockApi({
      mrs: lists({ mine: [{ ...MINE, head: 'c1', ci: 'pass', conflict: true }], review: [{ ...REVIEW, head: 'c9', ci: 'fail' }], following: [mr(FOLLOW, { title: 'Ajena', ci: 'running' })] }),
      scores: { [GH]: { state: 'done', score: SCORE }, [GL]: { state: 'done', score: SCORE } },
      pages: {
        [GH]: { files: [], reviewers: [{ name: 'leo', state: 'approved' }, { name: 'ana', state: 'changes' }, { name: 'max', state: 'commented' }, { name: 'ivo', state: 'pending' }], contract: 'add-x' },
        [GL]: { files: FILES, reviewers: { error: 'GitLab no te deja ver esto con ese token.', detail: 'HTTP 403', fix: 'settings' } },
        [FOLLOW]: { files: [], reviewers: [] }
      },
      ciAgents: { [GL]: 'feat/filtro' }
    })
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)
    const side = () => screen.getByRole('complementary', { name: 'Esta MR' })
    const card = (name: string) => within(side()).getByRole('heading', { name }).closest('section') as HTMLElement

    // Puntuación: the measures first, then Claude's, what, why and where, and what Claude did not see.
    await user.click(await screen.findByRole('button', { name: /^Envío con IVA/ }))
    await page('Envío con IVA')
    await waitFor(() => expect(card('Puntuación').textContent).toContain('Dificultad 4 de 5'))
    const text = card('Puntuación').textContent!
    const order = ['Tamaño M', '+120 −30', '6 archivos', 'Cambia tests', 'Dificultad 4 de 5', 'Riesgo 2 de 5', 'Adds <b>holidays</b>.', 'Touches dates.', 'src/calendar.ts']
    const pos = order.map((x) => text.indexOf(x))
    expect(pos.every((i) => i >= 0), JSON.stringify(pos)).toBe(true)
    expect([...pos].sort((a, b) => a - b)).toEqual(pos)
    expect(text).toContain('Claude vio 117 de 300 KB')
    expect(text).not.toContain('De un commit anterior')
    // Contra su spec, Revisores, CI with «En conflicto».
    expect(card('Contra su spec').textContent).toContain('Contrato de Libretto: add-x')
    expect(card('Contra su spec').textContent).toContain('Sus criterios se comprueban con «A fondo».')
    expect(within(card('Revisores')).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['leo · aprobó', 'ana · pidió cambios', 'max · comentó', 'ivo · pendiente'])
    expect(card('CI').textContent).toContain('Pasa')
    expect(card('CI').textContent).toContain('En conflicto')
    expect(within(card('CI')).queryByRole('button', { name: 'Arreglar CI con Claude' })).toBeNull()

    // A stale score offers to score again; no contract says so; a failed reviewers request fails its card only.
    await user.click(row('Nuevo filtro'))
    await page('Nuevo filtro')
    await waitFor(() => expect(card('Puntuación').textContent).toContain('De un commit anterior'))
    await user.click(within(card('Puntuación')).getByRole('button', { name: 'Puntuar de nuevo' }))
    expect(api.mrApi.score).toHaveBeenCalledWith(GL)
    expect(card('Contra su spec').textContent).toContain('Sin contrato de Libretto en esta MR.')
    const problem = await within(card('Revisores')).findByRole('alert')
    expect(problem.textContent).toContain('GitLab no te deja ver esto con ese token.')
    expect(within(problem).getByRole('button', { name: 'Abrir Ajustes' })).toBeTruthy()
    expect(await screen.findByText('src/envio.ts')).toBeTruthy()
    expect(card('CI').textContent).toContain('Falla')
    expect(await within(card('CI')).findByRole('button', { name: 'Arreglar CI con Claude' })).toBeTruthy()

    // Sigo is never scored; no reviewers yet.
    await user.click(row('Ajena'))
    await page('Ajena')
    await waitFor(() => expect(card('Puntuación').textContent).toContain('Las MR de Sigo no se puntúan.'))
    expect(card('Revisores').textContent).toContain('Aún sin revisores')
    expect(card('CI').textContent).toContain('En curso')

    // Not scored yet: «Sin puntuar» with Puntuar.
    await user.click(row('Envío con IVA'))
    act(() => api.pushScore(GH, { state: 'none' }))
    await waitFor(() => expect(card('Puntuación').textContent).toContain('Sin puntuar'))
    await user.click(within(card('Puntuación')).getByRole('button', { name: 'Puntuar' }))
    expect(api.mrApi.score).toHaveBeenLastCalledWith(GH)
  })

  it('a conflicting mr says so on its row and its page', async () => {
    mockApi({ mrs: lists({ mine: [{ ...MINE, conflict: true, mergeable: undefined }], review: [REVIEW] }) })
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)
    expect(within(await screen.findByRole('button', { name: /^Envío con IVA/ })).getByText('En conflicto')).toBeTruthy()
    expect(within(row('Nuevo filtro')).queryByText('En conflicto')).toBeNull()
    await user.click(row('Envío con IVA'))
    const view = await page('Envío con IVA')
    expect(within(view).getByText('En conflicto con main')).toBeTruthy()
    expect(within(view).queryByRole('button', { name: 'Fusionar' })).toBeNull()
  })

  it('a page that cannot load says why and offers to try again', async () => {
    let calls = 0
    const api = mockApi({
      mrs: lists({ mine: [MINE], review: [REVIEW] }),
      pages: {
        [GH]: async () => (++calls === 1 ? { error: 'GitHub está fallando ahora mismo.', detail: 'HTTP 502', fix: 'retry' } : { files: [{ path: 'src/envio.ts', oldPath: 'src/envio.ts', added: 1, removed: 0, lines: [{ kind: 'added', new: 1, text: 'x' }] }], reviewers: [] }),
        [GL]: async () => Promise.reject(new Error('ipc broke'))
      }
    })
    const user = userEvent.setup()
    render(createElement(App))
    await toMr(user)

    // M51: the page's own sentence, «Volver a comprobar», the code folded; the button asks again.
    await user.click(await screen.findByRole('button', { name: /^Envío con IVA/ }))
    const view = await page('Envío con IVA')
    const problem = await within(view).findByRole('alert')
    expect(problem.textContent).toContain('GitHub está fallando ahora mismo.')
    expect(within(problem).getByText('HTTP 502')).toBeTruthy()
    await user.click(within(problem).getByRole('button', { name: 'Volver a comprobar' }))
    expect(api.mrApi.page).toHaveBeenCalledTimes(2)
    expect(await within(view).findByText('src/envio.ts')).toBeTruthy()
    expect(within(view).queryByRole('alert')).toBeNull()

    // A rejected call says Atril could not open it.
    await user.click(row('Nuevo filtro'))
    const broken = await page('Nuevo filtro')
    expect((await within(broken).findByRole('alert')).textContent).toContain('Atril no ha podido abrir esta MR.')
    expect(within(broken).getByRole('button', { name: 'Volver a comprobar' })).toBeTruthy()

    // When a new listing drops the open MR, its page says so and «Volver a comprobar» lists again; no row is current.
    const list = api.mrApi.list as unknown as Mock<() => Promise<MrLists>>
    list.mockResolvedValue(lists({ mine: [MINE] }))
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    const gone = await screen.findByText('Esta MR ya no está en la lista')
    expect(screen.queryByRole('button', { current: true })).toBeNull()
    const before = list.mock.calls.length
    await user.click(within(gone.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Volver a comprobar' }))
    await waitFor(() => expect(list.mock.calls.length).toBe(before + 1))
  })
})
