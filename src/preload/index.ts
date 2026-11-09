import { contextBridge, ipcRenderer } from 'electron'
import type { AtrilApi } from './api'

const api: AtrilApi = {
  doctor: () => ipcRenderer.invoke('atril:doctor'),
  repos: {
    list: () => ipcRenderer.invoke('atril:repos:list'),
    add: () => ipcRenderer.invoke('atril:repos:add'),
    addWithId: (path, id) => ipcRenderer.invoke('atril:repos:addWithId', path, id),
    setOverride: (id, mode) => ipcRenderer.invoke('atril:repos:setOverride', id, mode)
  }
}

contextBridge.exposeInMainWorld('atril', api)
