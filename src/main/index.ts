import { app, BrowserWindow, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { doctor } from './doctor'
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
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
