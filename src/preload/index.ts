import { contextBridge, ipcRenderer } from 'electron'
import type { ActivityLine, AgentState, AtrilApi, FlowStage, MenuAction, NextItem, UsageResult } from './api'

const api: AtrilApi = {
  menu: {
    setState: (selected, count) => ipcRenderer.send('atril:menu:state', selected, count),
    setNext: (enabled) => ipcRenderer.send('atril:menu:next', enabled),
    onAction: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, a: MenuAction): void => cb(a)
      ipcRenderer.on('atril:menu:action', h)
      return () => ipcRenderer.removeListener('atril:menu:action', h)
    }
  },
  ui: {
    get: () => ipcRenderer.invoke('atril:ui:get'),
    set: (patch) => ipcRenderer.invoke('atril:ui:set', patch)
  },
  usage: {
    get: () => ipcRenderer.invoke('atril:usage:get'),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, u: UsageResult): void => cb(u)
      ipcRenderer.on('atril:usage:changed', h)
      return () => ipcRenderer.removeListener('atril:usage:changed', h)
    }
  },
  flow: {
    get: (id) => ipcRenderer.invoke('atril:flow:get', id),
    docs: (id) => ipcRenderer.invoke('atril:flow:docs', id),
    save: (id, change, name, text, mtimeMs) => ipcRenderer.invoke('atril:flow:save', id, change, name, text, mtimeMs),
    changes: (id) => ipcRenderer.invoke('atril:flow:changes', id),
    diff: (id, path) => ipcRenderer.invoke('atril:flow:diff', id, path),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, stage: FlowStage): void => cb(id, stage)
      ipcRenderer.on('atril:flow:changed', h)
      return () => ipcRenderer.removeListener('atril:flow:changed', h)
    }
  },
  activity: {
    get: (id) => ipcRenderer.invoke('atril:activity:get', id),
    latest: () => ipcRenderer.invoke('atril:activity:latest'),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, lines: ActivityLine[]): void => cb(id, lines)
      ipcRenderer.on('atril:activity:changed', h)
      return () => ipcRenderer.removeListener('atril:activity:changed', h)
    }
  },
  doctor: () => ipcRenderer.invoke('atril:doctor'),
  repos: {
    list: () => ipcRenderer.invoke('atril:repos:list'),
    add: () => ipcRenderer.invoke('atril:repos:add'),
    addWithId: (path, id) => ipcRenderer.invoke('atril:repos:addWithId', path, id),
    setOverride: (id, mode) => ipcRenderer.invoke('atril:repos:setOverride', id, mode)
  },
  workspaces: {
    list: () => ipcRenderer.invoke('atril:ws:list'),
    open: (repoId, branch, agent, model, task) => ipcRenderer.invoke('atril:ws:open', repoId, branch, agent, model, task),
    remove: (id) => ipcRenderer.invoke('atril:ws:remove', id)
  },
  jira: {
    inbox: () => ipcRenderer.invoke('atril:jira:inbox'),
    proposeStart: (issue, repoId, model) => ipcRenderer.invoke('atril:jira:proposeStart', issue, repoId, model),
    start: (req) => ipcRenderer.invoke('atril:jira:start', req)
  },
  settings: {
    jira: {
      status: () => ipcRenderer.invoke('atril:settings:jira:status'),
      save: (creds) => ipcRenderer.invoke('atril:settings:jira:save', creds),
      delete: () => ipcRenderer.invoke('atril:settings:jira:delete'),
      searchBoards: (query) => ipcRenderer.invoke('atril:settings:jira:searchBoards', query),
      pickBoard: (board) => ipcRenderer.invoke('atril:settings:jira:pickBoard', board)
    },
    openTokenPage: () => ipcRenderer.invoke('atril:settings:openTokenPage'),
    forge: {
      status: (forge) => ipcRenderer.invoke('atril:settings:forge:status', forge),
      save: (forge, creds) => ipcRenderer.invoke('atril:settings:forge:save', forge, creds),
      delete: (forge) => ipcRenderer.invoke('atril:settings:forge:delete', forge),
      openTokenPage: (forge, site) => ipcRenderer.invoke('atril:settings:forge:openTokenPage', forge, site)
    }
  },
  status: {
    list: () => ipcRenderer.invoke('atril:status:list'),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, state: AgentState): void => cb(id, state)
      ipcRenderer.on('atril:status:change', h)
      return () => ipcRenderer.removeListener('atril:status:change', h)
    },
    onOpen: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string): void => cb(id)
      ipcRenderer.on('atril:status:open', h)
      return () => ipcRenderer.removeListener('atril:status:open', h)
    }
  },
  nextup: {
    get: () => ipcRenderer.invoke('atril:nextup:get'),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, items: NextItem[]): void => cb(items)
      ipcRenderer.on('atril:nextup:changed', h)
      return () => ipcRenderer.removeListener('atril:nextup:changed', h)
    }
  },
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
  snapshotWorkspace: () => ipcRenderer.invoke('atril:snapshot-ws'),
  snapshotView: () => ipcRenderer.invoke('atril:snapshot-view')
}

contextBridge.exposeInMainWorld('atril', api)
