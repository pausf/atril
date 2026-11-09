import { app, BrowserWindow, dialog, ipcMain, Notification, safeStorage, shell } from 'electron'
import { MODELS, writeHooksFile } from './agent'
import { createActivity } from './activity'
import { createStatus } from './status'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createSecretStore } from './credentials/store'
import { jiraSettings } from './credentials/jira'
import { searchBoards } from './credentials/boards'
import type { JiraCreds } from './credentials/check'
import { doctor } from './doctor'
import type { Mode } from '../preload/api'
import { readInbox } from './jira/inbox'
import { inboxGroups } from './jira/board'
import { proposeStart, start } from './jira/start'
import type { InboxGroup, JiraIssue, Model, StartIssue, StartRequest } from '../preload/api'
import { listRepos, registerRepo, setOverride } from './repos'
import * as pty from './pty'
import { run } from './run'
import { createUsage } from './usage'
import { listWorkspaces, openWorktree, removeWorkspace } from './workspaces'
import { createFlowHub } from './flow/watch'
import { installMenu } from './menu'
import { patchUi, readUi } from './ui'
import { splitPane } from './tmux'
import type { Agent } from '../preload/api'

// Dev-only evidence hooks (screenshots for review). A packaged app ignores them all, so no
// environment variable can swap real data for fake data in front of the person.
const SNAPSHOT = app.isPackaged ? undefined : process.env['ATRIL_SNAPSHOT']

function fakeIssues(): JiraIssue[] {
  const groups = ['todo', 'doing', 'review'] as const
  const status = { todo: 'Por empezar', doing: 'En curso', review: 'Code Review' }
  return Array.from({ length: 24 }, (_, i) => {
    const group = groups[i < 10 ? 0 : i < 18 ? 1 : 2]
    return {
      key: `APP-${4800 + i}`,
      summary: i % 3 === 0 ? 'Filtro de laboratorios en el listado de categoría con paginación y orden por precio' : 'Corregir el cálculo del envío',
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
  const cols: Array<[string, number, number]> = [['Backlog', 0, 4], ['To Do', 4, 10], ['In Progress', 10, 18], ['Code Review', 18, 21], ['Testing', 21, 23], ['Ready to Deploy', 23, 24]]
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

app.whenReady().then(() => {
  // Packaged builds take build/icon.icns from the bundle; in dev the Dock needs telling.
  if (!app.isPackaged) app.dock?.setIcon(join(__dirname, '../../build/icon.png'))
  ipcMain.handle('atril:doctor', () => doctor(run))
  ipcMain.handle('atril:repos:list', () => listRepos(run))
  ipcMain.handle('atril:repos:add', async () => {
    const picked = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    const path = picked.filePaths[0]
    if (picked.canceled || !path) return null
    return { ...(await registerRepo(path, run)), path }
  })
  ipcMain.handle('atril:repos:addWithId', (_e, path: string, id: string) => registerRepo(path, run, { id }))
  ipcMain.handle('atril:repos:setOverride', async (_e, id: string, mode: Mode | null) => {
    await setOverride(id, mode)
    return listRepos(run)
  })
  const secretStore = createSecretStore({
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (b) => safeStorage.decryptString(b)
  })
  const jiraCreds = jiraSettings(secretStore)
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=settings-board photographs the Jira card with a picked board.
  ipcMain.handle('atril:settings:jira:status', () =>
    SNAPSHOT && process.env['ATRIL_SNAPSHOT_VIEW'] === 'settings-board'
      ? { saved: true, account: 'Pau Sánchez', site: 'https://shop.atlassian.net', board: { id: 7, name: 'TEAM' } }
      : jiraCreds.status()
  )
  ipcMain.handle('atril:settings:jira:save', (_e, creds: { site: string; email: string; token: string }) =>
    jiraCreds.save({ site: String(creds.site), email: String(creds.email), token: String(creds.token) })
  )
  ipcMain.handle('atril:settings:jira:delete', () => jiraCreds.delete())
  ipcMain.handle('atril:settings:jira:searchBoards', async (_e, query: unknown) => {
    const creds = await savedJira()
    return creds ? searchBoards(creds, String(query).trim(), fetch) : { error: 'Conecta Jira en Ajustes.' }
  })
  ipcMain.handle('atril:settings:jira:pickBoard', (_e, board: { id: unknown; name: unknown } | null) =>
    jiraCreds.pickBoard(board && { id: Number(board.id), name: String(board.name) })
  )
  ipcMain.handle('atril:settings:openTokenPage', () =>
    shell.openExternal('https://id.atlassian.com/manage-profile/security/api-tokens')
  )
  const savedJira = async (): Promise<JiraCreds | null> => {
    const c = await secretStore.readSecret('jira').catch(() => null)
    return c?.['site'] && c['email'] && c['token'] ? (c as unknown as JiraCreds) : null
  }
  ipcMain.handle('atril:jira:inbox', async () => {
    // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=tasks|tasks-board|tour|tourN (N = step) photographs a believable list without Jira.
    const view = process.env['ATRIL_SNAPSHOT_VIEW'] ?? ''
    if (SNAPSHOT && /^(tasks|tour)/.test(view)) {
      const issues = fakeIssues()
      return view === 'tasks-board'
        ? { issues, groups: fakeBoardGroups() }
        : { issues, ...(await inboxGroups({ site: '', email: '', token: '' }, null, issues)) }
    }
    const creds = await savedJira()
    return readInbox(creds, fetch, await listWorkspaces(run), (await secretStore.hasSecret('jira')).board)
  })
  ipcMain.handle('atril:jira:proposeStart', (_e, issue: StartIssue, repoId?: string, model?: Model) =>
    proposeStart(issue, { repoId, model }, run)
  )
  ipcMain.handle('atril:jira:start', async (_e, req: StartRequest) => start(req, { run, creds: await savedJira() }))
  const flow = createFlowHub({
    run,
    find: async (id) => (await listWorkspaces(run)).find((w) => w.id === id),
    emit: (id, stage) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:flow:changed', id, stage))
  })
  ipcMain.handle('atril:flow:get', (_e, id: string | null) => flow.select(id))
  ipcMain.handle('atril:ws:list', () => listWorkspaces(run))
  ipcMain.handle('atril:ws:open', (_e, repoId: string, branch: string, agent: Agent, model?: Model) =>
    openWorktree({ repoId, branch, agent, ...(model && MODELS.includes(model) && { model }) }, run)
  )
  ipcMain.handle('atril:ws:remove', async (e, id: string) => {
    pty.detach(id)
    flow.forget(id)
    return removeWorkspace(id, run)
  })
  ipcMain.handle('atril:term:attach', async (e, id: string, cols: number, rows: number) => {
    const ws = (await listWorkspaces(run)).find((w) => w.id === id)
    if (!ws?.alive) return
    pty.attach(id, ws.path, cols, rows, (d) => {
      if (!e.sender.isDestroyed()) e.sender.send('atril:term:data', id, d)
    })
  })
  ipcMain.on('atril:term:input', (_e, id: string, data: string) => pty.input(id, data))
  ipcMain.on('atril:term:resize', (_e, id: string, c: number, r: number) => pty.resize(id, c, r))
  ipcMain.on('atril:term:detach', (_e, id: string) => pty.detach(id))
  ipcMain.handle('atril:snapshot-view', () => (SNAPSHOT ? (process.env['ATRIL_SNAPSHOT_VIEW'] ?? null) : null))
  ipcMain.handle('atril:ui:get', async () => {
    const ui = await readUi()
    // ponytail: dev snapshots force the theme and skip the tutorial unless the view is the tour.
    if (!SNAPSHOT) return ui
    const theme = process.env['ATRIL_SNAPSHOT_THEME']
    return {
      ...ui,
      ...(theme === 'light' || theme === 'dark' ? { theme } : {}),
      tutorialSeen: !process.env['ATRIL_SNAPSHOT_VIEW']?.startsWith('tour')
    }
  })
  ipcMain.handle('atril:ui:set', (_e, patch: unknown) => patchUi(patch))
  ipcMain.handle('atril:snapshot-ws', () => Boolean(SNAPSHOT))
  const menu = { selected: null as string | null, count: 0 }
  const refreshMenu = (): void =>
    installMenu({
      ...menu,
      split: (dir) => {
        const id = menu.selected
        if (!id) return
        void listWorkspaces(run).then((all) => {
          const ws = all.find((w) => w.id === id)
          if (ws?.alive) void splitPane(id, dir, ws.path, run).catch(() => undefined)
        })
      },
      send: (a) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:menu:action', a))
    })
  ipcMain.on('atril:menu:state', (_e, selected: string | null, count: number) => {
    menu.selected = selected
    menu.count = count
    refreshMenu()
  })
  refreshMenu()
  createWindow()

  const shown = new Set<Notification>()
  const status = createStatus({
    run,
    onChange: (id, state) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:status:change', id, state)),
    notify: (ws, body) => {
      const n = new Notification({ title: 'Atril', subtitle: ws.branch, body })
      n.on('click', () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (!win) return
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
        win.webContents.send('atril:status:open', ws.id)
      })
      // A Notification nobody references can be collected before it is clicked.
      shown.add(n)
      n.on('close', () => shown.delete(n))
      n.show()
    }
  })
  const usage = createUsage({
    run,
    emit: (u) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:usage:changed', u))
  })
  ipcMain.handle('atril:usage:get', () => usage.get())
  usage.start()
  const activity = createActivity({
    run,
    emit: (id, lines) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('atril:activity:changed', id, lines))
  })
  ipcMain.handle('atril:activity:get', (_e, id: string) => activity.get(String(id)))
  ipcMain.handle('atril:activity:latest', () => activity.latest())
  void activity.start()
  ipcMain.handle('atril:status:list', () => status.states())
  void writeHooksFile().then(() => status.start())
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', pty.detachAll)
app.on('window-all-closed', () => app.quit())
