import { app, BrowserWindow, dialog, ipcMain, Notification, safeStorage, shell } from 'electron'
import { effortError, MODELS, writeHooksFile } from './agent'
import { createActivity } from './activity'
import { createSubagents } from './subagents'
import { createCost } from './cost'
import { readHistory } from './history'
import { launchQa, qaStatus, stopQa } from './qa'
import { createQaDone, qaBug, qaReport, qaRetest } from './qa-report'
import { runFix } from './qa-fix'
import { addManual, chooseTarget, removeManual } from './qa-targets'
import { createAvisos, NOTIFY_DEFAULTS, patchNotifySettings, readNotifySettings, workName } from './avisos'
import { agentState, answerAgent, createStatus, optionCount, pauseAgent, replyFromNotice, replyToAgent, resumeAgent, waitOf, composeAgent } from './status'
import { getLang, setLang, t } from './lang'
import { resolveLang } from '../preload/i18n'
import { readDocs, saveDoc } from './flow/document'
import { FORGES, forgeSettings, type ForgeId } from './credentials/forge'
import { cloneAndRegister, createRepo } from './forge/create'
import { createForgeGuards } from './forge/guards'
import { listMrs } from './forge/mrs'
import { createLenses } from './forge/lenses'
import { createOpenMr, remoteNaming, type MrEntry } from './forge/openmr'
import { createOutcome } from './forge/outcome'
import { createQueue, createScorer } from './forge/scores'
import { createThreads } from './forge/threads'
import { createPage, parseDiff } from './forge/page'
import { createMerge } from './forge/merge'
import { createQaPublish } from './qa-publish'
import { boxDiff, boxRanges, forgetPlans } from './flow/boxes'
import { closeQuiet } from './flow/quiet'
import { createClashWatch, radar } from './radar'
import { changeFolders } from './flow/stage'
import { nextUp } from './nextup'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createSecretStore } from './credentials/store'
import { jiraSettings } from './credentials/jira'
import { searchBoards } from './credentials/boards'
import type { JiraCreds } from './credentials/check'
import { doctor, inTerminal, installTool } from './doctor'
import type { Aviso, NotifyPatch, NotifyPermission, NotifyType, CreateRepoRequest, Mode, MrDrafts, MrDraftsResult, MrItem, MrLists, MrPage, MrScoreState, MrThreads, SubagentEntry, SubagentLine, UiState } from '../preload/api'
import { readInbox } from './jira/inbox'
import { inboxGroups } from './jira/board'
import { proposeStart, start } from './jira/start'
import type { Effort, InboxGroup, InboxResult, JiraIssue, Model, NextItem, QaBugRequest, StartIssue, StartRequest } from '../preload/api'
import { listRepos, readRepos, registerRepo, relocateRepo, removeRepo, setOverride } from './repos'
import { orProblem, revealState } from './state'
import { dropIdea, editIdea, ideaToJira, librettoCounts, librettoState, queueIdea, startQueued } from './libretto'
import * as pty from './pty'
import { loginPath } from './login-path'
import { run } from './run'
import { createMrPoll } from './mrpoll'
import { createQuotaWatch, createUsage } from './usage'
import { listWorkspaces, listWorkspacesOrNone, readRecordsOrNone, openWorktree, removeWorkspace, flowWorkspace, forgetWorkspace, reopenWorkspace, terminalAt } from './workspaces'
import { createFlowHub } from './flow/watch'
import { installMenu } from './menu'
import { createNotifier, parseNcprefs } from './notify'
import { patchUi, readUi } from './ui'
import type { Agent, AgentState, QuickAnswer, QuickChoice } from '../preload/api'

// Dev-only evidence hooks (screenshots for review). A packaged app ignores them all, so no
// environment variable can swap real data for fake data in front of the person.
const SNAPSHOT = app.isPackaged ? undefined : process.env['ATRIL_SNAPSHOT']
// ponytail: dev-only, ATRIL_CDP_PORT lets a session drive the real window with Playwright (connectOverCDP).
if (!app.isPackaged && process.env['ATRIL_CDP_PORT']) app.commandLine.appendSwitch('remote-debugging-port', process.env['ATRIL_CDP_PORT'])

function fakeMrs(): MrLists {
  const ago = (h: number): string => new Date(Date.now() - h * 3600_000).toISOString()
  const gh = (n: number, title: string, project: string, author: string, ci: MrItem['ci'], added: number, removed: number, files: number, h: number): MrItem => ({ forge: 'github', url: `https://github.com/${project}/pull/${n}`, title, project, author, ci, added, removed, files, updatedAt: ago(h), head: `h${n}` })
  const gl = (n: number, title: string, project: string, author: string, ci: MrItem['ci'], files: number, h: number): MrItem => ({ forge: 'gitlab', url: `https://gitlab.com/${project}/-/merge_requests/${n}`, title, project, author, ci, files, updatedAt: ago(h), head: `h${n}` })
  return {
    connected: ['github', 'gitlab'],
    mine: [gh(41, 'Calendario de festivos por provincia', 'pausf/shop-web', 'pausf', 'running', 286, 12, 6, 2), gl(17, 'Cola de reintentos para pagos', 'acme/payments-service', 'pausf', 'pass', 9, 30)], // i18n-ignore
    review: [gh(88, 'Filtros persistentes en el listado del vendedor', 'acme/cms-admin', 'marta', 'fail', 140, 52, 9, 5), gl(203, 'Índices para el listado de ofertas', 'acme/sourcing-service', 'jordi', 'pass', 3, 26)], // i18n-ignore
    following: [gh(12, 'Quitar el flag antiguo del carrusel', 'acme/shop-web', 'laia', 'none', 18, 64, 3, 70)], // i18n-ignore
    more: { mine: [], review: [], following: [] },
    errors: []
  }
}

// ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=avisos photographs a believable feed without any forge.
function fakeAvisos(): Aviso[] {
  const at = (m: number): number => Date.now() - m * 60_000
  const [mine, other] = fakeMrs().mine
  const [review, failing] = fakeMrs().review
  const [followed] = fakeMrs().following
  return [
    { id: 'a1', kind: 'review', at: at(4), read: false, title: review!.title, url: review!.url, forge: review!.forge },
    { id: 'a2', kind: 'agent', at: at(12), read: false, title: 'feat/festivos-provincia', workspaceId: 'none' }, // i18n-ignore
    { id: 'a3', kind: 'comment', at: at(35), read: false, title: mine!.title, url: mine!.url, forge: mine!.forge },
    { id: 'a4', kind: 'ci', at: at(90), read: true, title: failing!.title, url: failing!.url, forge: failing!.forge },
    { id: 'a5', kind: 'following', at: at(180), read: true, title: followed!.title, url: followed!.url, forge: followed!.forge },
    { id: 'a6', kind: 'opened', at: at(600), read: true, title: other!.title, url: other!.url, forge: other!.forge },
    { id: 'a7', kind: 'gone', at: at(1500), read: true, title: 'Migrar el cron de stock a colas', url: 'https://github.com/acme/shop-web/pull/7', forge: 'github' } // i18n-ignore
  ]
}

function fakeScores(): Record<string, MrScoreState> {
  const [mine] = fakeMrs().mine
  const [review] = fakeMrs().review
  const at = new Date().toISOString()
  return {
    [mine!.url]: {
      state: 'done',
      score: {
        head: mine!.head,
        lang: 'es',
        at,
        metrics: { added: 286, removed: 12, files: 6, tests: true, size: 'M' },
        ai: {
          difficulty: 3,
          risk: 2,
          what: 'Añade un calendario de festivos por provincia y lo usa para calcular la fecha prometida de entrega.', // i18n-ignore
          why: 'La lógica es acotada y viene con tests, pero toca la fecha que ve el cliente y depende de datos externos del BOE.', // i18n-ignore
          where: ['src/Delivery/PromiseDate.php: el salto de festivos', 'La importación del BOE: qué pasa si cambia el formato'] // i18n-ignore
        }
      }
    },
    [review!.url]: {
      state: 'done',
      score: { head: 'old0000', lang: 'es', at, metrics: { added: 140, removed: 52, files: 9, tests: false, size: 'M' }, ai: { difficulty: 4, risk: 4, what: 'Guarda los filtros del listado del vendedor entre visitas.', why: 'Toca estado compartido y no trae tests.', where: ['El almacenamiento de filtros'] } } // i18n-ignore
    }
  }
}

function fakeThreads(): MrThreads {
  const at = (h: number): string => new Date(Date.now() - h * 3600_000).toISOString()
  return {
    more: false,
    threads: [
      {
        id: '1',
        forge: 'github',
        file: 'src/Delivery/PromiseDate.php',
        line: 48,
        code: '+        if ($this->holidays->isHoliday($date, $province)) {',
        comments: [
          { id: '1', author: 'marta', at: at(20), body: '¿Qué pasa si la provincia no viene en el pedido? Aquí petaría con null.' }, // i18n-ignore
          { id: '2', author: 'pausf', at: at(6), body: 'Buena pregunta: cae al calendario nacional. Lo cubro con un test.' }, // i18n-ignore
          { id: '3', author: 'marta', at: at(1), body: 'Perfecto. ¿Puedes añadir también el caso de Ceuta y Melilla?' } // i18n-ignore
        ],
        yourTurn: true
      },
      {
        id: 'general',
        forge: 'github',
        comments: [{ id: '9', author: 'jordi', at: at(3), body: 'Lo he probado en preview y la fecha sale bien para Madrid y Barcelona. 👍' }], // i18n-ignore
        yourTurn: true
      }
    ]
  }
}

// ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=subagents|subagent-log photographs two running subagents and one finished.
function fakeSubagents(): SubagentEntry[] {
  const at = Math.floor(Date.now() / 1000)
  return [
    { id: 's1', type: 'explorer', description: 'Leer cómo se calcula la fecha de entrega', startedAt: at - 200, endedAt: at - 155 }, // i18n-ignore
    { id: 's2', type: 'general-purpose', description: 'Migrar el calendario de festivos a la nueva tabla', startedAt: at - 80 }, // i18n-ignore
    { id: 's3', type: 'Plan', startedAt: at - 12 }
  ]
}

// ponytail: dev-only, every fake subagent answers the same believable log.
function fakeSubagentLog(): SubagentLine[] {
  return [
    { kind: 'prompt', text: 'Migra el calendario de festivos de shop-web a la tabla holidays.\nMantén la API de HolidayCalendar.' }, // i18n-ignore
    { kind: 'thinking', text: '' },
    { kind: 'text', text: 'Primero miro dónde se lee el calendario.' }, // i18n-ignore
    { kind: 'tool', text: 'Grep(HolidayCalendar)' },
    { kind: 'result', text: 'src/Delivery/PromiseDate.php\nsrc/Delivery/HolidayCalendar.php\ntests/Delivery/PromiseDateTest.php', more: 2 },
    { kind: 'tool', text: 'Read(src/Delivery/HolidayCalendar.php)' },
    { kind: 'result', text: '<?php\nnamespace Shop\\Delivery;\nfinal class HolidayCalendar', more: 41 },
    { kind: 'text', text: 'Lee un YAML por provincia. Lo cambio por un repositorio sobre holidays.' }, // i18n-ignore
    { kind: 'tool', text: 'Edit(src/Delivery/HolidayCalendar.php)' },
    { kind: 'result', text: 'The file src/Delivery/HolidayCalendar.php has been updated.' },
    { kind: 'tool', text: 'Bash(vendor/bin/phpunit tests/Delivery)' },
    { kind: 'thinking', text: '' }
  ]
}

// ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-lens photographs the Libretto drafts: open, published, sent.
function fakeDrafts(): MrDrafts {
  return {
    head: 'h41',
    stale: false,
    canSend: true,
    drafts: [
      { id: 'd1', lens: 'security', severity: 'high', file: 'src/Delivery/PromiseDate.php', line: 48, text: 'La provincia llega del pedido sin validar y se usa como clave del calendario: un valor inesperado rompe el cálculo.', state: 'open' }, // i18n-ignore
      { id: 'd2', lens: 'tests', severity: 'medium', text: 'No hay ningún test del salto de festivos en domingo.', state: 'open' }, // i18n-ignore
      { id: 'd3', lens: 'reliability', severity: 'low', file: 'src/Delivery/Import.php', line: 12, text: 'Si el BOE cambia el formato, la importación falla en silencio.', state: 'published' }, // i18n-ignore
      { id: 'd4', lens: 'design', severity: 'low', file: 'src/Delivery/PromiseDate.php', text: 'El calendario nacional y el provincial podrían compartir una sola interfaz.', state: 'sent' } // i18n-ignore
    ]
  }
}

// ponytail: dev-only, the MR page photos show a believable diff with the threads and drafts above on their lines.
function fakePage(): MrPage {
  const promise = parseDiff(
    [
      'diff --git a/src/Delivery/PromiseDate.php b/src/Delivery/PromiseDate.php',
      '--- a/src/Delivery/PromiseDate.php',
      '+++ b/src/Delivery/PromiseDate.php',
      '@@ -44,7 +44,9 @@ final class PromiseDate',
      '     public function for(Order $order): \\DateTimeImmutable',
      '     {',
      '         $date = $this->clock->today();',
      '-        if ($this->holidays->isHoliday($date)) {',
      '+        $province = $order->province();',
      '+        if ($this->holidays->isHoliday($date, $province)) {',
      '             $date = $date->modify(\'+1 day\');',
      '         }',
      '         return $date;',
      'diff --git a/src/Delivery/Import.php b/src/Delivery/Import.php',
      '--- a/src/Delivery/Import.php',
      '+++ b/src/Delivery/Import.php',
      '@@ -10,3 +10,4 @@',
      '     $rows = $this->boe->fetch();',
      '+    $rows = array_filter($rows);',
      '     foreach ($rows as $row) {',
      '+        $this->store($row);',
      'diff --git a/.agents/changes/festivos-provincia/proposal.md b/.agents/changes/festivos-provincia/proposal.md',
      '--- /dev/null',
      '+++ b/.agents/changes/festivos-provincia/proposal.md',
      '@@ -0,0 +1,2 @@',
      '+# festivos-provincia',
      '+'
    ].join('\n')
  )
  return { files: promise, reviewers: [{ name: 'marta', state: 'changes' }, { name: 'jordi', state: 'approved' }, { name: 'laia', state: 'pending' }], contract: 'festivos-provincia' }
}

function fakeIssues(): JiraIssue[] {
  const groups = ['todo', 'doing', 'review'] as const
  const status = { todo: 'Por empezar', doing: 'En curso', review: 'Code Review' } // i18n-ignore
  return Array.from({ length: 24 }, (_, i) => {
    const group = groups[i < 10 ? 0 : i < 18 ? 1 : 2]
    return {
      key: `APP-${4800 + i}`,
      summary: i % 3 === 0 ? 'Filtro de laboratorios en el listado de categoría con paginación y orden por precio' : 'Corregir el cálculo del envío', // i18n-ignore
      type: i % 4 === 1 ? 'Bug' : 'Story',
      status: status[group],
      statusId: String(i),
      project: 'APP',
      components: [],
      group
    }
  })
}

// ponytail: dev-only fake board for ATRIL_SNAPSHOT_VIEW=tasks-board; status ids are the fake issue indexes.
function fakeBoardGroups(): InboxGroup[] {
  const cols: Array<[string, number, number]> = [['Backlog', 0, 4], ['To Do', 4, 10], ['In Progress', 10, 18], ['Code Review', 18, 21], ['Testing', 21, 23], ['Ready to Deploy', 23, 24]] // i18n-ignore
  return cols.map(([title, from, to], n) => ({ id: `col-${n}`, title, folded: false, keys: Array.from({ length: to - from }, (_, k) => `APP-${4800 + from + k}`) }))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 640,
    title: 'Atril',
    backgroundColor: '#fbfbfd',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 18 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // No navigation away and no new windows: the app never loads remote content.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e) => e.preventDefault())

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  // ponytail: dev-only hook so a session can see the render. ATRIL_SNAPSHOT=/abs/path.png
  // captures the page once doctor has rendered, writes the PNG and quits.
  const snapshot = SNAPSHOT
  if (snapshot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await win.webContents.capturePage()
        await writeFile(snapshot, image.toPNG())
        app.quit()
      }, Number(process.env['ATRIL_SNAPSHOT_DELAY_MS']) || 4000)
    })
  }
}

app.whenReady().then(async () => {
  // W128: before the doctor or any agent spawns anything.
  process.env['PATH'] = await loginPath(run)
  // Packaged builds take build/icon.icns from the bundle; in dev the Dock needs telling.
  if (!app.isPackaged) app.dock?.setIcon(join(__dirname, '../../build/icon.png'))
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=doctor photographs two missing tools with the list open.
  ipcMain.handle('atril:doctor', () =>
    SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW'] === 'doctor'
      ? doctor(async (cmd) => (cmd === 'tmux' || cmd === 'jira' ? { code: 127, stdout: '', stderr: `${cmd}: command not found` } : { code: 0, stdout: `${cmd} 1.0`, stderr: '' }))
      : doctor(run)
  )
  ipcMain.handle('atril:doctor:install', (_e, tool: unknown) => installTool(tool, run))
  ipcMain.handle('atril:repos:list', () => listRepos(run))
  ipcMain.handle('atril:repos:add', async () => {
    const picked = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    const path = picked.filePaths[0]
    if (picked.canceled || !path) return null
    return { ...(await registerRepo(path, run)), path }
  })
  ipcMain.handle('atril:repos:addWithId', (_e, path: string, id: string) => registerRepo(path, run, { id }))
  ipcMain.handle('atril:repos:setOverride', async (_e, id: string, mode: Mode | null) => {
    const problem = await setOverride(id, mode)
    return problem ? { problem } : listRepos(run)
  })
  // The window sends an id only: main opens the picker (W158).
  ipcMain.handle('atril:repos:remove', (_e, id: unknown) => removeRepo(String(id)))
  ipcMain.handle('atril:repos:relocate', (_e, id: unknown) =>
    relocateRepo(
      String(id),
      async () => {
        const picked = await dialog.showOpenDialog({ properties: ['openDirectory'] })
        return picked.canceled ? null : (picked.filePaths[0] ?? null)
      },
      run
    )
  )
  ipcMain.handle('atril:state:reveal', (_e, file: unknown) => revealState(file, (path) => shell.showItemInFolder(path)))
  const secretStore = createSecretStore({
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (b) => safeStorage.decryptString(b)
  })
  const jiraCreds = jiraSettings(secretStore)
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=settings-board photographs the Jira card with a picked board.
  ipcMain.handle('atril:settings:jira:status', () =>
    SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW'] === 'settings-board'
      ? { saved: true, account: 'Pau Sánchez', site: 'https://shop.atlassian.net', board: { id: 7, name: 'TEAM' } } // i18n-ignore
      : jiraCreds.status()
  )
  ipcMain.handle('atril:settings:jira:save', (_e, creds: { site: string; email: string; token: string }) =>
    jiraCreds.save({ site: String(creds.site), email: String(creds.email), token: String(creds.token) })
  )
  ipcMain.handle('atril:settings:jira:delete', () => jiraCreds.delete())
  ipcMain.handle('atril:settings:jira:searchBoards', async (_e, query: unknown) => {
    const creds = await savedJira()
    return creds ? searchBoards(creds, String(query).trim(), fetch) : { error: t('Conecta Jira en Ajustes.') }
  })
  ipcMain.handle('atril:settings:jira:pickBoard', (_e, board: { id: unknown; name: unknown } | null) =>
    jiraCreds.pickBoard(board && { id: Number(board.id), name: String(board.name) })
  )
  ipcMain.handle('atril:settings:openTokenPage', () =>
    shell.openExternal('https://id.atlassian.com/manage-profile/security/api-tokens')
  )
  const forges = forgeSettings(secretStore)
  const isForge = (f: unknown): f is ForgeId => FORGES.includes(f as ForgeId)
  ipcMain.handle('atril:settings:forge:status', (_e, f: unknown) => (isForge(f) ? forges.status(f) : { saved: false }))
  ipcMain.handle('atril:settings:forge:save', (_e, f: unknown, creds: { site?: unknown; token?: unknown }) =>
    isForge(f) && typeof creds?.token === 'string' && creds.token.trim() !== ''
      ? forges.save(f, { token: creds.token, ...(typeof creds.site === 'string' && { site: creds.site }) })
      : { error: t('Falta el token.') }
  )
  const guards = createForgeGuards()
  ipcMain.handle('atril:forge:create', async (_e, req: Partial<CreateRepoRequest> | null, clone?: unknown) => {
    if (!req || !isForge(req.forge) || typeof req.name !== 'string') return { error: t('Nombre de repo no válido') }
    const created = await createRepo(secretStore, {
      forge: req.forge,
      name: req.name,
      description: typeof req.description === 'string' ? req.description : '',
      public: req.public === true,
      confirmPublic: req.confirmPublic === true
    })
    if ('error' in created) return created
    guards.created(created.url)
    if (typeof clone !== 'string' || !guards.cloneFolder(clone)) return created
    return { ...created, ...(await cloneAndRegister(created, clone, run)) }
  })
  ipcMain.handle('atril:forge:open', (_e, url: unknown) => {
    if (typeof url === 'string' && guards.openable(url)) return shell.openExternal(url)
  })
  let latestMrs = new Map<string, MrEntry>()
  const openMr = createOpenMr({ latest: (url) => latestMrs.get(url), run })
  ipcMain.handle('atril:mr:workFor', (_e, url: unknown) =>
    // ponytail: dev-only, the mr-lens photo shows «Seguir en Atril» without a registered repo.
    SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW'] === 'mr-lens' ? { kind: 'continue' } : openMr.workFor(typeof url === 'string' ? url : '')
  )
  ipcMain.handle('atril:mr:openWork', (_e, url: unknown) => openMr.open(url).finally(() => void pushNext()))
  let lastMrs: { at: number; lists: MrLists } | null = null
  const listAllMrs = async (): Promise<MrLists> => {
    // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr|avisos|palette photographs believable lists without any forge.
    const fake = SNAPSHOT && /^(mr|avisos|palette)/.test(process.env['ATRIL_SNAPSHOT_VIEW'] ?? '')
    const r = fake ? fakeMrs() : await listMrs(secretStore, fetch, guards.scorable, guards.threadable)
    guards.listed([...r.mine, ...r.review, ...r.following].map((m) => m.url))
    // Each list holds an MR once and Mías comes first, so the first list an URL is seen in is its own.
    latestMrs = new Map()
    for (const list of ['mine', 'review', 'following'] as const)
      for (const m of r[list]) if (!latestMrs.has(m.url)) latestMrs.set(m.url, { list, forge: m.forge, project: m.project, ...(m.branch && { branch: m.branch }) })
    // Avisos come from comparing listings; a failure there must never break the listing itself.
    // Fake photo listings never reach the real feed.
    if (!fake) tell(avisos.onListing(r))
    lastMrs = { at: Date.now(), lists: r }
    return r
  }
  ipcMain.handle('atril:mr:list', listAllMrs)
  // M41: merge only what the latest listing has in Mías as mergeable, with its known head and API path.
  const merger = createMerge({
    store: secretStore,
    entry: (url) => {
      const row = lastMrs?.lists.mine.find((m) => m.url === url)
      const tgt = guards.scoreTarget(url)
      return row && tgt ? { list: 'mine', forge: row.forge, ref: tgt.ref, ...(row.head && { head: row.head }), ...(row.mergeable && { mergeable: true }) } : undefined
    },
    relist: listAllMrs
  })
  ipcMain.handle('atril:mr:merge', (_e, url: unknown, confirmed: unknown) => merger.merge(typeof url === 'string' ? url : '', confirmed === true))
  // W185: MR notices keep coming with the window closed.
  const mrPoll = createMrPoll({ last: () => lastMrs, list: listAllMrs, connected: async () => (await Promise.all(FORGES.map((f) => secretStore.hasSecret(f)))).some((s) => s.saved) })
  if (!SNAPSHOT) mrPoll.start()
  const fakeFeed = SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW'] === 'avisos'
  // W187, V15: the non-review work on that MR's branch whose repo's remote names the MR's project.
  const closable = async (a: Aviso): Promise<string | undefined> => {
    if (!a.branch || !a.project || !a.url) return undefined
    const host = new URL(a.url).hostname
    const repos = await readRepos()
    for (const rec of await readRecordsOrNone()) {
      const repo = rec.mode !== 'review' && rec.branch === a.branch ? repos.find((r) => r.id === rec.repoId) : undefined
      if (repo && (await remoteNaming(run, repo.path, a.project, host))) return rec.id
    }
    return undefined
  }
  const avisos = createAvisos((items) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:avisos:changed', items)), { outcome: createOutcome(secretStore) })
  // W177, W186–W194: what reaches the Mac, and what a click or an action on it does.
  const notifier = createNotifier({
    make: (o) => {
      // ponytail: dev-only, the Mac banner cannot be seen through CDP; the dev log says what it carried.
      if (!app.isPackaged) console.log('[notify]', JSON.stringify(o))
      return new Notification(o)
    },
    settings: readNotifySettings,
    context: () => ({ focusOn: menu.focusOn, windowFocused: BrowserWindow.getAllWindows()[0]?.isFocused() === true }),
    markRead: (ids) => void avisos.markRead(ids).catch(() => undefined),
    front: (target) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) return
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
      if (target?.kind === 'workspace') win.webContents.send('atril:status:open', target.id)
      else if (target) win.webContents.send('atril:notify:open', target)
    },
    openExternal: (url) => {
      if (/^https:\/\//.test(url)) void shell.openExternal(url)
    },
    reply: (a, text) => (a.workspaceId ? replyFromNotice(a.workspaceId, text, run) : Promise.resolve('gone')),
    options: async (a) => {
      const rec = (await readRecordsOrNone()).find((r) => r.id === a.workspaceId)
      return rec ? optionCount(rec.session) : 0
    },
    reopen: async (id) => {
      const r = await reopenWorkspace(id, {}, run).finally(() => void pushNext())
      return 'error' in r ? { error: r.error } : {}
    },
    closable
  })
  const tell = (p: Promise<Aviso[]>): void => void p.then((added) => notifier.notify(added)).catch(() => undefined)
  // W192: what macOS says of Atril's notifications; any doubt is «no lo sé».
  const permission = async (): Promise<NotifyPermission> => {
    const r = await run('defaults', ['export', 'com.apple.ncprefs', '-'], { timeoutMs: 5000 })
    return r.code === 0 ? parseNcprefs(r.stdout, app.isPackaged ? 'dev.atril.app' : 'com.github.Electron') : 'unknown'
  }
  ipcMain.handle('atril:notify:get', () => readNotifySettings())
  ipcMain.handle('atril:notify:set', (_e, patch: unknown) =>
    patchNotifySettings(patch as NotifyPatch).catch((err: unknown) => ({
      error: t('No he podido guardar tus avisos: siguen como estaban.'),
      detail: (err as { code?: unknown })?.code ? String((err as { code: unknown }).code) : err instanceof Error ? err.name : 'Error'
    }))
  )
  ipcMain.handle('atril:notify:test', (_e, type: unknown) => (typeof type === 'string' && type in NOTIFY_DEFAULTS ? notifier.test(type as NotifyType, permission) : permission()))
  ipcMain.handle('atril:notify:permission', permission)
  ipcMain.handle('atril:notify:openSystem', () => shell.openExternal('x-apple.systempreferences:com.apple.Notifications-Settings.extension'))
  ipcMain.handle('atril:avisos:list', () => (fakeFeed ? fakeAvisos() : avisos.list()))
  ipcMain.handle('atril:avisos:markRead', (_e, ids: unknown) =>
    avisos.markRead(ids === 'all' ? 'all' : Array.isArray(ids) ? ids.filter((i): i is string => typeof i === 'string') : [])
  )
  // V15: the same match as the Mac's «Cerrar su trabajo».
  ipcMain.handle('atril:avisos:closable', async (_e, id: unknown) => {
    const a = (await avisos.list()).find((n) => n.id === id && (n.kind === 'merged' || n.kind === 'closed'))
    return (a && (await closable(a))) ?? null
  })
  ipcMain.handle('atril:avisos:seen', (_e, id: unknown) => avisos.seen(String(id)))
  ipcMain.handle('atril:mr:open', (_e, url: unknown) => {
    if (typeof url === 'string' && guards.openable(url)) return shell.openExternal(url)
  })
  // One claude at a time across scores and lens reviews (M25).
  const queue = createQueue()
  const scorer = createScorer({
    store: secretStore,
    run,
    queue,
    target: guards.scoreTarget,
    emit: (url, state) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:mr:score-changed', url, state))
  })
  ipcMain.handle('atril:mr:score', (_e, url: unknown): Promise<MrScoreState> =>
    scorer.score(typeof url === 'string' ? url : '')
  )
  ipcMain.handle('atril:mr:scoreOf', (_e, urls: unknown) =>
    // ponytail: dev-only, the MR photos show one fresh score and one from an earlier commit.
    SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW']?.startsWith('mr')
      ? fakeScores()
      : scorer.stateOf(Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string') : [])
  )
  const threads = createThreads({ store: secretStore, target: guards.threadTarget })
  const mrPage = createPage({ store: secretStore, target: guards.threadTarget })
  ipcMain.handle('atril:mr:page', (_e, url: unknown): Promise<MrPage> =>
    // ponytail: dev-only, the MR photos read a fake page; their fake listing never reaches main's targets.
    SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW']?.startsWith('mr') ? Promise.resolve(fakePage()) : mrPage.read(typeof url === 'string' ? url : '')
  )
  ipcMain.handle('atril:mr:threads', (_e, url: unknown): Promise<MrThreads> =>
    // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-thread|mr-lens photographs two believable threads.
    SNAPSHOT && /^mr-(thread|lens)$/.test(process.env['ATRIL_SNAPSHOT_VIEW'] ?? '') ? Promise.resolve(fakeThreads()) : threads.read(typeof url === 'string' ? url : '')
  )
  // W174: the QA screen's MR, from the last listing when it is under a minute old.
  const qaPublish = createQaPublish({ run, last: () => lastMrs, list: listAllMrs, post: (url, body) => threads.reply(url, 'general', body) })
  ipcMain.handle('atril:qa:mrFor', (_e, id: unknown) => qaPublish.mrFor(String(id)))
  ipcMain.handle('atril:qa:publish', (_e, id: unknown) => qaPublish.publish(String(id)))
  ipcMain.handle('atril:mr:reply', (_e, url: unknown, threadId: unknown, body: unknown) =>
    typeof url === 'string' && typeof threadId === 'string' && typeof body === 'string' ? threads.reply(url, threadId, body) : { error: t('Escribe una respuesta') }
  )
  const lenses = createLenses({
    store: secretStore,
    run,
    queue,
    target: guards.scoreTarget,
    listed: (url) => guards.threadTarget(url) !== undefined,
    post: (url, body) => threads.reply(url, 'general', body),
    send: (id, text) => replyToAgent(id, text, run),
    workspaces: () => listWorkspaces(run)
  })
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=mr-lens photographs believable drafts without Claude or a forge.
  const fakeLens = SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW'] === 'mr-lens'
  const text = (v: unknown): string => (typeof v === 'string' ? v : '')
  const refused = (): MrDraftsResult => ({ error: t('Ese borrador ya no está abierto') })
  ipcMain.handle('atril:mr:review', (_e, url: unknown): Promise<MrDraftsResult> => (fakeLens ? Promise.resolve(fakeDrafts()) : lenses.review(text(url))))
  ipcMain.handle('atril:mr:draftsOf', (_e, url: unknown): Promise<MrDraftsResult> => (fakeLens ? Promise.resolve(fakeDrafts()) : lenses.draftsOf(text(url))))
  ipcMain.handle('atril:mr:publishDraft', (_e, url: unknown, id: unknown) => (fakeLens ? refused() : lenses.publish(text(url), text(id))))
  ipcMain.handle('atril:mr:sendDraft', (_e, url: unknown, id: unknown) => (fakeLens ? refused() : lenses.send(text(url), text(id))))
  ipcMain.handle('atril:mr:ciAgent', (_e, url: unknown) => lenses.ciAgent(text(url)))
  ipcMain.handle('atril:mr:fixCi', (_e, url: unknown) => lenses.fixCi(text(url)))
  ipcMain.handle('atril:mr:discardDraft', (_e, url: unknown, id: unknown) => (fakeLens ? refused() : lenses.discard(text(url), text(id))))
  ipcMain.handle('atril:forge:pickFolder', async () => {
    const picked = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    const folder = picked.canceled ? null : (picked.filePaths[0] ?? null)
    if (folder) guards.picked(folder)
    return folder
  })
  ipcMain.handle('atril:settings:forge:delete', (_e, f: unknown) => (isForge(f) ? forges.delete(f) : undefined))
  ipcMain.handle('atril:settings:forge:openTokenPage', async (_e, f: unknown, site: unknown) => {
    if (f === 'github') return shell.openExternal('https://github.com/settings/tokens/new?scopes=repo&description=Atril')
    const base = typeof site === 'string' && /^https:\/\//.test(site) ? new URL(site).origin : 'https://gitlab.com'
    if (f === 'gitlab') return shell.openExternal(`${base}/-/user_settings/personal_access_tokens?name=Atril&scopes=api`)
  })
  const savedJira = async (): Promise<JiraCreds | null> => {
    const c = await secretStore.readSecret('jira').catch(() => null)
    return c?.['site'] && c['email'] && c['token'] ? (c as unknown as JiraCreds) : null
  }
  let lastInbox: InboxResult | null = null
  let lastNext: NextItem[] = []
  // Defined below, once the status watcher exists; every path that changes its inputs calls it.
  let pushNext = async (): Promise<void> => {}
  ipcMain.handle('atril:jira:inbox', async () => {
    const result = await readInboxResult()
    lastInbox = result
    void pushNext()
    return result
  })
  const readInboxResult = async (): Promise<InboxResult> => {
    // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=tasks|tasks-board|tour|tourN (N = step)|palette photographs a believable list without Jira.
    const view = process.env['ATRIL_SNAPSHOT_VIEW'] ?? ''
    if (SNAPSHOT && /^(tasks|tour|palette)/.test(view)) {
      const issues = fakeIssues()
      return view === 'tasks-board'
        ? { issues, groups: fakeBoardGroups() }
        : { issues, ...(await inboxGroups({ site: '', email: '', token: '' }, null, issues)) }
    }
    const creds = await savedJira()
    return readInbox(creds, fetch, await listWorkspacesOrNone(run), (await secretStore.hasSecret('jira')).board)
  }
  ipcMain.handle('atril:jira:proposeStart', (_e, issue: StartIssue, repoId?: string, model?: Model, auto?: unknown, effort?: Effort) =>
    proposeStart(issue, { repoId, model, auto: auto === true, effort }, run)
  )
  ipcMain.handle('atril:jira:start', async (_e, req: StartRequest) => {
    const r = await start(req, { run, creds: await savedJira() })
    void pushNext()
    return r
  })
  const flow = createFlowHub({
    run,
    find: (id) => flowWorkspace(id, run),
    emit: (id, stage) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:flow:changed', id, stage))
  })
  const repoPath = async (id: unknown): Promise<string | undefined> => (await readRepos()).find((r) => r.id === id)?.path
  const noRepo = (id: unknown): { error: string } => ({ error: t('No hay ningún repo «{id}»', { id: String(id) }) })
  ipcMain.handle('atril:libretto:state', async (_e, id: unknown) => {
    const path = await repoPath(id)
    return path === undefined ? noRepo(id) : librettoState(path, run)
  })
  ipcMain.handle('atril:libretto:queue', async (_e, id: unknown, text: unknown) => {
    const path = await repoPath(id)
    if (path === undefined) return noRepo(id)
    return typeof text === 'string' ? queueIdea(path, text, run) : { error: t('Escribe la idea antes de encolarla.') }
  })
  ipcMain.handle('atril:libretto:start', (_e, id: unknown, name: unknown) => startQueued(String(id), name as string, run))
  ipcMain.handle('atril:libretto:repos', async () =>
    Object.fromEntries(await Promise.all((await readRepos()).map(async (r) => [r.id, await librettoCounts(r.path, run)] as const)))
  )
  ipcMain.handle('atril:libretto:edit', async (_e, id: unknown, name: unknown, text: unknown) => {
    const path = await repoPath(id)
    return path === undefined ? noRepo(id) : editIdea(path, name as string, text as string, run)
  })
  ipcMain.handle('atril:libretto:drop', async (_e, id: unknown, name: unknown) => {
    const path = await repoPath(id)
    return path === undefined ? noRepo(id) : dropIdea(path, name as string, run)
  })
  ipcMain.handle('atril:libretto:jira', async (_e, id: unknown, name: unknown) => {
    const path = await repoPath(id)
    if (path === undefined) return noRepo(id)
    const board = (await secretStore.hasSecret('jira')).board ?? null
    const r = await ideaToJira(path, name as string, { run, creds: await savedJira(), board })
    void pushNext()
    return r
  })
  ipcMain.handle('atril:flow:get', (_e, id: string | null) => flow.select(id))
  ipcMain.handle('atril:flow:docs', async (_e, id: string) => {
    const ws = await flowWorkspace(id, run)
    return ws ? readDocs(ws.path) : null
  })
  // The newest change folder is the one the panel shows (stageOf).
  const currentChange = async (ws: { path: string }): Promise<string | undefined> => (await changeFolders(join(ws.path, '.agents', 'changes')))[0]
  ipcMain.handle('atril:flow:boxes', async (_e, id: string) => {
    const ws = await flowWorkspace(id, run)
    return ws ? boxRanges(ws.path, ws.baseCommit, await currentChange(ws), run) : { boxes: [], total: 0 }
  })
  ipcMain.handle('atril:flow:boxdiff', async (_e, id: string, index: unknown, path: unknown) => {
    const ws = await flowWorkspace(id, run)
    return ws && Number.isInteger(index) && typeof path === 'string' ? boxDiff(ws.path, ws.baseCommit, await currentChange(ws), index as number, path, run) : ''
  })
  ipcMain.handle('atril:flow:save', async (_e, id: string, change: unknown, name: unknown, text: unknown, mtimeMs: unknown) => {
    const ws = await flowWorkspace(id, run)
    if (!ws || typeof change !== 'string' || typeof name !== 'string' || typeof text !== 'string' || typeof mtimeMs !== 'number') {
      return { error: t('Ese archivo no se puede editar desde Atril') }
    }
    return saveDoc(ws.path, await agentState(ws, run), change, name, text, mtimeMs)
  })
  // W84: only a press reaches launch; nothing here starts a QA on its own.
  ipcMain.handle('atril:qa:status', (_e, id: unknown) => qaStatus(String(id), run))
  // W181: a launch arms one «QA terminada»; the report is looked at only while something is armed.
  const qaDone = createQaDone((id, p, f) => {
    void readRecordsOrNone().then((recs) => {
      const rec = recs.find((r) => r.id === id)
      if (rec) tell(avisos.onAgent(rec, 'qa', undefined, { p, f }))
    })
  })
  setInterval(() => {
    if (qaDone.armed()) void qaDone.check().catch(() => undefined)
  }, 3000)
  ipcMain.handle('atril:qa:launch', async (_e, id: unknown, key: unknown) => {
    const at = Date.now()
    const r = await launchQa(String(id), run, undefined, typeof key === 'string' ? key : undefined)
    if ('ok' in r) qaDone.arm(String(id), at)
    return r
  })
  ipcMain.handle('atril:qa:stop', (_e, id: unknown) => stopQa(String(id), run))
  ipcMain.handle('atril:qa:report', (_e, id: unknown) => qaReport(String(id), run))
  ipcMain.handle('atril:qa:choose', (_e, id: unknown, key: unknown) => chooseTarget(String(id), key))
  ipcMain.handle('atril:qa:manual', (_e, id: unknown, req: unknown) => addManual(String(id), req))
  ipcMain.handle('atril:qa:unmanual', (_e, id: unknown, key: unknown) => removeManual(String(id), key))
  ipcMain.handle('atril:qa:fix', (_e, id: unknown, fix: unknown) => runFix(String(id), fix, { run, open: (url) => shell.openExternal(url) }))
  ipcMain.handle('atril:qa:retest', (_e, id: unknown, criterion: unknown) => qaRetest(String(id), typeof criterion === 'string' ? criterion : null, run))
  ipcMain.handle('atril:qa:bug', async (_e, id: unknown, req: QaBugRequest) =>
    qaBug(String(id), req, { run, creds: await savedJira(), board: (await secretStore.hasSecret('jira')).board ?? null })
  )
  // W145: a damaged list is shown as such, never as a rejection or an empty list.
  ipcMain.handle('atril:ws:list', async () => {
    const listed = await orProblem(() => listWorkspaces(run))
    return Array.isArray(listed) ? listed : { problem: listed }
  })
  ipcMain.handle('atril:ws:open', async (_e, repoId: string, branch: string, agent: Agent, model?: Model, task?: unknown, auto?: unknown, worktree?: unknown, effort?: Effort) => {
    const badEffort = effortError(effort)
    if (badEffort) return { error: badEffort }
    return openWorktree(
      {
        repoId,
        branch,
        agent,
        ...(model && MODELS.includes(model) && { model }),
        ...(effort && { effort }),
        ...(task !== undefined && { task: task as string }),
        ...(auto === true && { auto: true }),
        ...(worktree === true && { worktree: true })
      },
      run
    ).finally(() => void pushNext())
  })
  // F44, F48: a closed or forgotten work keeps no cached box plans, no watcher and no saved answer.
  const dropPlans = async (id: string): Promise<void> => {
    const ws = (await listWorkspacesOrNone(run)).find((w) => w.id === id)
    if (!ws) return
    forgetPlans(ws.path)
    closeQuiet(ws.path)
  }
  // W178: between «Cerrar» and its record's removal, a stopped agent is not news.
  const closingIds = new Set<string>()
  ipcMain.handle('atril:ws:remove', async (e, id: string) => {
    closingIds.add(id)
    pty.detach(id)
    flow.forget(id)
    await dropPlans(id)
    const r = await removeWorkspace(id, run).finally(() => {
      closingIds.delete(id)
      void pushNext()
    })
    // W96: a removal that got through has appended its line.
    if ('ok' in r) void readHistory().then((h) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:history:changed', h)))
    return r
  })
  ipcMain.handle('atril:ws:forget', async (_e, id: unknown) => {
    pty.detach(String(id))
    flow.forget(String(id))
    await dropPlans(String(id))
    return forgetWorkspace(String(id), run).finally(() => void pushNext())
  })
  // The window sends the id and whether to go one effort up; main builds the command (W141).
  ipcMain.handle('atril:ws:reopen', (_e, id: unknown, more: unknown) => reopenWorkspace(String(id), { more: more === true }, run).finally(() => void pushNext()))
  ipcMain.handle('atril:ws:terminal', (_e, target: unknown) => terminalAt(target as { id: string }, run))
  ipcMain.handle('atril:history:list', () => readHistory())
  ipcMain.handle('atril:term:attach', async (e, id: string, cols: number, rows: number) => {
    // W160: a damaged list (W144) reads as no works, so this never rejects.
    const ws = (await listWorkspacesOrNone(run)).find((w) => w.id === id)
    if (!ws?.alive) return { ok: false }
    const r = pty.attach(id, ws.path, cols, rows, (d) => {
      if (!e.sender.isDestroyed()) e.sender.send('atril:term:data', id, d)
    })
    return 'ok' in r ? r : { error: t('No he podido abrir la terminal de {branch}.', { branch: ws.branch }), detail: r.error }
  })
  ipcMain.on('atril:term:resize', (_e, id: string, c: number, r: number) => pty.resize(id, c, r))
  ipcMain.on('atril:term:detach', (_e, id: string) => pty.detach(id))
  ipcMain.handle('atril:snapshot-view', () => (SNAPSHOT ? (process.env['ATRIL_SNAPSHOT_VIEW'] ?? null) : null))
  // W48: main resolves Sistema once; the window takes `lang` from here.
  const applyLang = (ui: UiState): UiState => {
    setLang(resolveLang(ui.language, app.getPreferredSystemLanguages()[0]))
    return { ...ui, lang: getLang() }
  }
  applyLang(await readUi())
  ipcMain.handle('atril:ui:get', async () => {
    const before = getLang()
    const ui = applyLang(await readUi())
    // Sistema can resolve differently after a macOS language change: the menu follows too.
    if (getLang() !== before) refreshMenu()
    // ponytail: dev snapshots force the theme and skip the tutorial unless the view is the tour.
    if (!SNAPSHOT) return ui
    const theme = process.env['ATRIL_SNAPSHOT_THEME']
    return {
      ...ui,
      ...(theme === 'light' || theme === 'dark' ? { theme } : {}),
      tutorialSeen: !process.env['ATRIL_SNAPSHOT_VIEW']?.startsWith('tour')
    }
  })
  ipcMain.handle('atril:ui:set', async (_e, patch: unknown) => {
    const before = getLang()
    const ui = applyLang(await patchUi(patch))
    if (getLang() !== before) refreshMenu()
    return ui
  })
  ipcMain.handle('atril:snapshot-ws', () => Boolean(SNAPSHOT))
  const menu = { selected: null as string | null, count: 0, nextEnabled: false, focusOn: false, focusAvailable: false, overviewAvailable: false, bigAvailable: false }
  // Filled once status exists; the menu is first built before it.
  let states = (): Record<string, AgentState> => ({})
  let togglePause: (id: string) => void = () => undefined
  const refreshMenu = (): void =>
    installMenu({
      ...menu,
      selectedState: menu.selected ? states()[menu.selected] : undefined,
      togglePause: () => {
        if (menu.selected) togglePause(menu.selected)
      },
      send: (a) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:menu:action', a))
    })
  ipcMain.on('atril:menu:next', (_e, enabled: boolean) => {
    menu.nextEnabled = enabled === true
    refreshMenu()
  })
  ipcMain.on('atril:menu:focus', (_e, on: boolean, available: boolean) => {
    menu.focusOn = on === true
    menu.focusAvailable = available === true
    refreshMenu()
  })
  ipcMain.on('atril:menu:overview', (_e, available: boolean) => {
    menu.overviewAvailable = available === true
    refreshMenu()
  })
  ipcMain.on('atril:menu:big', (_e, available: boolean) => {
    menu.bigAvailable = available === true
    refreshMenu()
  })
  ipcMain.on('atril:menu:state', (_e, selected: string | null, count: number) => {
    menu.selected = selected
    menu.count = count
    refreshMenu()
  })
  refreshMenu()
  createWindow()

  const status = createStatus({
    run,
    onChange: (id, state) => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:status:change', id, state))
      // V11: leaving needs-you means its questions were answered.
      if (state !== 'needs-you') void avisos.expire(id).catch(() => undefined)
      if (id === menu.selected) refreshMenu()
      void pushNext()
    },
    notify: (ws, kind, text) => tell(avisos.onAgent(ws, kind, text)),
    stopped: (list) =>
      void Promise.all(list.map((w) => avisos.onAgent(w, 'stopped')))
        .then((added) => notifier.stopped(added.flat()))
        .catch(() => undefined),
    idle: (ws, m) => tell(avisos.onAgent(ws, 'idle', undefined, { m })),
    idleMinutes: async () => (await readNotifySettings()).idleMinutes,
    closing: (id) => closingIds.has(id),
    left: (id) => void avisos.expire(id).catch(() => undefined)
  })
  pushNext = async (): Promise<void> => {
    lastNext = nextUp(status.snapshot(), lastInbox, await listWorkspacesOrNone(run))
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:nextup:changed', lastNext))
  }
  ipcMain.handle('atril:nextup:get', async () => {
    await pushNext()
    return lastNext
  })
  const quota = createQuotaWatch()
  const usage = createUsage({
    run,
    emit: (u) => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:usage:changed', u))
      for (const c of quota(u)) tell(avisos.onQuota({ window: c.window, pct: c.pct, resetsAt: c.resetsAt }))
    }
  })
  // ponytail: dev-only, a snapshot never reads the person's real quota (each launch was a call to api.anthropic.com).
  const fakeUsage = { fiveHour: { pct: 34, resetsAt: null }, sevenDay: { pct: 41, resetsAt: '2026-11-12T11:00:00Z' } }
  ipcMain.handle('atril:usage:get', () => (SNAPSHOT ? fakeUsage : usage.get()))
  ipcMain.handle('atril:usage:fix', () => inTerminal('claude', run))
  if (!SNAPSHOT) usage.start()
  const activity = createActivity({
    run,
    emit: (id, lines) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:activity:changed', id, lines))
  })
  ipcMain.handle('atril:activity:get', (_e, id: string) => activity.get(String(id)))
  ipcMain.handle('atril:activity:latest', () => activity.latest())
  void activity.start()
  const subagents = createSubagents({
    emit: (id, entries) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:subagents:changed', id, entries))
  })
  const fakeSubs = SNAPSHOT && /^(subagents|subagent-log)$/.test(process.env['ATRIL_SNAPSHOT_VIEW'] ?? '')
  ipcMain.handle('atril:subagents:get', (_e, id: string) => (fakeSubs ? fakeSubagents() : subagents.get(String(id))))
  ipcMain.handle('atril:subagents:log', (_e, id: string, agentId: string) => (fakeSubs ? fakeSubagentLog() : subagents.log(String(id), String(agentId))))
  void subagents.start()
  const cost = createCost({
    emit: (id, c) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:cost:changed', id, c))
  })
  ipcMain.handle('atril:cost:get', (_e, id: unknown) => cost.get(String(id)))
  cost.start()
  // W182: the window asks every 10 s; a file two works newly share is one notice per pair.
  const clashes = createClashWatch()
  ipcMain.handle('atril:radar:get', async () => {
    const answer = await radar(run)
    const news = clashes(answer)
    if (news.length) {
      const recs = await readRecordsOrNone()
      for (const c of news) {
        const a = recs.find((r) => r.id === c.a)
        const b = recs.find((r) => r.id === c.b)
        if (a && b) tell(avisos.onAgent(a, 'radar', undefined, { b: workName(b), file: c.file, more: c.more }))
      }
    }
    return answer
  })
  ipcMain.handle('atril:status:list', () => status.states())
  ipcMain.handle('atril:status:wait', async (_e, id: unknown) => {
    const ws = (await listWorkspacesOrNone(run)).find((w) => w.id === id)
    return ws ? waitOf(ws.session) : null
  })
  ipcMain.handle('atril:status:compose', (_e, id: unknown, text: unknown) => composeAgent(String(id), typeof text === 'string' ? text : '', run))
  // answerAgent checks the shape itself: the window's value is never trusted.
  ipcMain.handle('atril:status:answer', (_e, id: unknown, choice: unknown) => answerAgent(String(id), choice as QuickChoice, run))
  // The mark is not watched: refresh at once so the row says «en pausa» without waiting for the poll.
  const paused = async (r: Promise<QuickAnswer>): Promise<QuickAnswer> => r.finally(() => void status.refresh())
  ipcMain.handle('atril:status:pause', (_e, id: unknown) => paused(pauseAgent(String(id), run)))
  ipcMain.handle('atril:status:resume', (_e, id: unknown) => paused(resumeAgent(String(id), run)))
  states = () => status.states()
  togglePause = (id) => void paused((status.states()[id] === 'paused' ? resumeAgent : pauseAgent)(id, run))
  void writeHooksFile().then(() => status.start())
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', pty.detachAll)
app.on('window-all-closed', () => app.quit())
