import { contextBridge, ipcRenderer } from 'electron'
import type { AtrilApi } from './api'

const api: AtrilApi = {
  doctor: () => ipcRenderer.invoke('atril:doctor'),
  repos: {
    list: () => ipcRenderer.invoke('atril:repos:list'),
    add: () => ipcRenderer.invoke('atril:repos:add'),
    addWithId: (path, id) => ipcRenderer.invoke('atril:repos:addWithId', path, id),
    setOverride: (id, mode) => ipcRenderer.invoke('atril:repos:setOverride', id, mode)
  },
  workspaces: {
    list: () => ipcRenderer.invoke('atril:ws:list'),
    open: (repoId, branch, agent) => ipcRenderer.invoke('atril:ws:open', repoId, branch, agent),
    remove: (id) => ipcRenderer.invoke('atril:ws:remove', id)
  },
  jira: { inbox: () => ipcRenderer.invoke('atril:jira:inbox') },
  term: {
    attach: (id, cols, rows) => ipcRenderer.invoke('atril:term:attach', id, cols, rows),
    input: (id, data) => ipcRenderer.send('atril:term:input', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('atril:term:resize', id, cols, rows),
    detach: (id) => ipcRenderer.send('atril:term:detach', id),
    onData: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, data: string): void => cb(id, data)
      ipcRenderer.on('atril:term:data', h)
      return () => ipcRenderer.removeListener('atril:term:data', h)
    }
  },
  snapshotWorkspace: () => ipcRenderer.invoke('atril:snapshot-ws')
}

contextBridge.exposeInMainWorld('atril', api)
