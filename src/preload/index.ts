import { contextBridge, ipcRenderer } from 'electron'
import type { AtrilApi } from './api'

const api: AtrilApi = {
  doctor: () => ipcRenderer.invoke('atril:doctor')
}

contextBridge.exposeInMainWorld('atril', api)
