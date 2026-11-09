import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { doctor } from './doctor'
import type { Mode } from '../preload/api'
import { listRepos, registerRepo, setOverride } from './repos'
import { run } from './run'

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
  const snapshot = process.env['ATRIL_SNAPSHOT']
  if (snapshot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await win.webContents.capturePage()
        await writeFile(snapshot, image.toPNG())
        app.quit()
      }, 1500)
    })
  }
}

app.whenReady().then(() => {
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
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
