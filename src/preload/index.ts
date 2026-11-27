import { contextBridge, ipcRenderer } from 'electron'
import type { ActivityLine, SubagentEntry, AgentState, Aviso, AtrilApi, NotifyTarget, FlowStage, HistoryEntry, MenuAction, MrScoreState, NextItem, UsageResult, WorkCost } from './api'

const api: AtrilApi = {
  menu: {
    setState: (selected, count) => ipcRenderer.send('atril:menu:state', selected, count),
    setNext: (enabled) => ipcRenderer.send('atril:menu:next', enabled),
    setFocus: (on, available) => ipcRenderer.send('atril:menu:focus', on, available),
    setOverview: (available) => ipcRenderer.send('atril:menu:overview', available),
    setBig: (available) => ipcRenderer.send('atril:menu:big', available),
    onAction: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, a: MenuAction): void => cb(a)
      ipcRenderer.on('atril:menu:action', h)
      return () => ipcRenderer.removeListener('atril:menu:action', h)
    }
  },
  crash: {
    report: (r) => ipcRenderer.send('atril:crash:report', r),
    openLast: () => ipcRenderer.invoke('atril:crash:openLast')
  },
  ui: {
    get: () => ipcRenderer.invoke('atril:ui:get'),
    set: (patch) => ipcRenderer.invoke('atril:ui:set', patch)
  },
  usage: {
    get: () => ipcRenderer.invoke('atril:usage:get'),
    fix: () => ipcRenderer.invoke('atril:usage:fix'),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, u: UsageResult): void => cb(u)
      ipcRenderer.on('atril:usage:changed', h)
      return () => ipcRenderer.removeListener('atril:usage:changed', h)
    }
  },
  forge: {
    create: (req, clone) => ipcRenderer.invoke('atril:forge:create', req, clone),
    open: (url) => ipcRenderer.invoke('atril:forge:open', url),
    pickFolder: () => ipcRenderer.invoke('atril:forge:pickFolder')
  },
  mr: {
    list: () => ipcRenderer.invoke('atril:mr:list'),
    open: (url) => ipcRenderer.invoke('atril:mr:open', url),
    score: (url) => ipcRenderer.invoke('atril:mr:score', url),
    scoreOf: (urls) => ipcRenderer.invoke('atril:mr:scoreOf', urls),
    threads: (url) => ipcRenderer.invoke('atril:mr:threads', url),
    reply: (url, threadId, body) => ipcRenderer.invoke('atril:mr:reply', url, threadId, body),
    review: (url) => ipcRenderer.invoke('atril:mr:review', url),
    draftsOf: (url) => ipcRenderer.invoke('atril:mr:draftsOf', url),
    publishDraft: (url, id) => ipcRenderer.invoke('atril:mr:publishDraft', url, id),
    sendDraft: (url, id) => ipcRenderer.invoke('atril:mr:sendDraft', url, id),
    ciAgent: (url) => ipcRenderer.invoke('atril:mr:ciAgent', url),
    fixCi: (url) => ipcRenderer.invoke('atril:mr:fixCi', url),
    discardDraft: (url, id) => ipcRenderer.invoke('atril:mr:discardDraft', url, id),
    page: (url) => ipcRenderer.invoke('atril:mr:page', url),
    merge: (url, confirmed) => ipcRenderer.invoke('atril:mr:merge', url, confirmed),
    workFor: (url) => ipcRenderer.invoke('atril:mr:workFor', url),
    openWork: (url) => ipcRenderer.invoke('atril:mr:openWork', url),
    onScoreChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, url: string, state: MrScoreState): void => cb(url, state)
      ipcRenderer.on('atril:mr:score-changed', h)
      return () => ipcRenderer.removeListener('atril:mr:score-changed', h)
    }
  },
  notify: {
    get: () => ipcRenderer.invoke('atril:notify:get'),
    set: (patch) => ipcRenderer.invoke('atril:notify:set', patch),
    test: (type) => ipcRenderer.invoke('atril:notify:test', type),
    permission: () => ipcRenderer.invoke('atril:notify:permission'),
    openSystem: () => ipcRenderer.invoke('atril:notify:openSystem'),
    onOpen: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, target: NotifyTarget): void => cb(target)
      ipcRenderer.on('atril:notify:open', h)
      return () => ipcRenderer.removeListener('atril:notify:open', h)
    }
  },
  avisos: {
    list: () => ipcRenderer.invoke('atril:avisos:list'),
    markRead: (ids) => ipcRenderer.invoke('atril:avisos:markRead', ids),
    seen: (id) => ipcRenderer.invoke('atril:avisos:seen', id),
    closable: (id) => ipcRenderer.invoke('atril:avisos:closable', id),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, items: Aviso[]): void => cb(items)
      ipcRenderer.on('atril:avisos:changed', h)
      return () => ipcRenderer.removeListener('atril:avisos:changed', h)
    }
  },
  libretto: {
    state: (repoId) => ipcRenderer.invoke('atril:libretto:state', repoId),
    queue: (repoId, text) => ipcRenderer.invoke('atril:libretto:queue', repoId, text),
    start: (repoId, name) => ipcRenderer.invoke('atril:libretto:start', repoId, name),
    repos: () => ipcRenderer.invoke('atril:libretto:repos'),
    edit: (repoId, name, text) => ipcRenderer.invoke('atril:libretto:edit', repoId, name, text),
    drop: (repoId, name) => ipcRenderer.invoke('atril:libretto:drop', repoId, name),
    jira: (repoId, name) => ipcRenderer.invoke('atril:libretto:jira', repoId, name)
  },
  flow: {
    get: (id) => ipcRenderer.invoke('atril:flow:get', id),
    docs: (id) => ipcRenderer.invoke('atril:flow:docs', id),
    save: (id, change, name, text, mtimeMs) => ipcRenderer.invoke('atril:flow:save', id, change, name, text, mtimeMs),
    boxes: (id) => ipcRenderer.invoke('atril:flow:boxes', id),
    boxDiff: (id, index, path) => ipcRenderer.invoke('atril:flow:boxdiff', id, index, path),
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
  subagents: {
    get: (id) => ipcRenderer.invoke('atril:subagents:get', id),
    log: (id, agentId) => ipcRenderer.invoke('atril:subagents:log', id, agentId),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, entries: SubagentEntry[]): void => cb(id, entries)
      ipcRenderer.on('atril:subagents:changed', h)
      return () => ipcRenderer.removeListener('atril:subagents:changed', h)
    }
  },
  history: {
    list: () => ipcRenderer.invoke('atril:history:list'),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, entries: HistoryEntry[]): void => cb(entries)
      ipcRenderer.on('atril:history:changed', h)
      return () => ipcRenderer.removeListener('atril:history:changed', h)
    }
  },
  radar: {
    get: () => ipcRenderer.invoke('atril:radar:get')
  },
  cost: {
    get: (id) => ipcRenderer.invoke('atril:cost:get', id),
    onChange: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, cost: WorkCost | null): void => cb(id, cost)
      ipcRenderer.on('atril:cost:changed', h)
      return () => ipcRenderer.removeListener('atril:cost:changed', h)
    }
  },
  qa: {
    status: (id) => ipcRenderer.invoke('atril:qa:status', id),
    launch: (id, key) => ipcRenderer.invoke('atril:qa:launch', id, key),
    stop: (id) => ipcRenderer.invoke('atril:qa:stop', id),
    report: (id) => ipcRenderer.invoke('atril:qa:report', id),
    retest: (id, criterion) => ipcRenderer.invoke('atril:qa:retest', id, criterion),
    bug: (id, req) => ipcRenderer.invoke('atril:qa:bug', id, req),
    choose: (id, key) => ipcRenderer.invoke('atril:qa:choose', id, key),
    manual: (id, req) => ipcRenderer.invoke('atril:qa:manual', id, req),
    unmanual: (id, key) => ipcRenderer.invoke('atril:qa:unmanual', id, key),
    fix: (id, fix) => ipcRenderer.invoke('atril:qa:fix', id, fix),
    mrFor: (id) => ipcRenderer.invoke('atril:qa:mrFor', id),
    preparePublish: (id) => ipcRenderer.invoke('atril:qa:preparePublish', id),
    publish: (id, token) => ipcRenderer.invoke('atril:qa:publish', id, token)
  },
  doctor: () => ipcRenderer.invoke('atril:doctor'),
  installTool: (tool) => ipcRenderer.invoke('atril:doctor:install', tool),
  harness: {
    get: (repoId) => ipcRenderer.invoke('atril:harness:get', repoId),
    doc: (id) => ipcRenderer.invoke('atril:harness:doc', id)
  },
  repos: {
    list: () => ipcRenderer.invoke('atril:repos:list'),
    add: () => ipcRenderer.invoke('atril:repos:add'),
    addWithId: (path, id) => ipcRenderer.invoke('atril:repos:addWithId', path, id),
    addPath: (text) => ipcRenderer.invoke('atril:repos:addPath', text),
    setOverride: (id, mode) => ipcRenderer.invoke('atril:repos:setOverride', id, mode),
    remove: (id) => ipcRenderer.invoke('atril:repos:remove', id),
    relocate: (id) => ipcRenderer.invoke('atril:repos:relocate', id)
  },
  workspaces: {
    list: () => ipcRenderer.invoke('atril:ws:list'),
    open: (repoId, branch, agent, model, task, auto, worktree, effort) => ipcRenderer.invoke('atril:ws:open', repoId, branch, agent, model, task, auto, worktree, effort),
    remove: (id) => ipcRenderer.invoke('atril:ws:remove', id),
    forget: (id) => ipcRenderer.invoke('atril:ws:forget', id),
    reopen: (id, more) => ipcRenderer.invoke('atril:ws:reopen', id, more),
    terminal: (target) => ipcRenderer.invoke('atril:ws:terminal', target)
  },
  jira: {
    inbox: () => ipcRenderer.invoke('atril:jira:inbox'),
    proposeStart: (issue, repoId, model, auto, effort) => ipcRenderer.invoke('atril:jira:proposeStart', issue, repoId, model, auto, effort),
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
    wait: (id) => ipcRenderer.invoke('atril:status:wait', id),
    compose: (id, text) => ipcRenderer.invoke('atril:status:compose', id, text),
    answer: (id, choice) => ipcRenderer.invoke('atril:status:answer', id, choice),
    pause: (id) => ipcRenderer.invoke('atril:status:pause', id),
    resume: (id) => ipcRenderer.invoke('atril:status:resume', id),
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
    resize: (id, cols, rows) => ipcRenderer.send('atril:term:resize', id, cols, rows),
    detach: (id) => ipcRenderer.send('atril:term:detach', id),
    onData: (cb) => {
      const h = (_e: Electron.IpcRendererEvent, id: string, data: string): void => cb(id, data)
      ipcRenderer.on('atril:term:data', h)
      return () => ipcRenderer.removeListener('atril:term:data', h)
    }
  },
  refine: { ask: (text) => ipcRenderer.invoke('atril:refine:ask', text) },
  skills: {
    list: (repoId) => ipcRenderer.invoke('atril:skills:list', repoId),
    usage: () => ipcRenderer.invoke('atril:skills:usage'),
    set: (req) => ipcRenderer.invoke('atril:skills:set', req),
    reveal: (ref) => ipcRenderer.invoke('atril:skills:reveal', ref),
    read: (ref) => ipcRenderer.invoke('atril:skills:read', ref),
    save: (req) => ipcRenderer.invoke('atril:skills:save', req),
    create: (req) => ipcRenderer.invoke('atril:skills:create', req),
    catalog: (repoId) => ipcRenderer.invoke('atril:skills:catalog', repoId),
    plugin: (req) => ipcRenderer.invoke('atril:skills:plugin', req),
    marketplace: (req) => ipcRenderer.invoke('atril:skills:marketplace', req),
    pluginTerminal: (req) => ipcRenderer.invoke('atril:skills:plugin-terminal', req)
  },
  revealState: (file) => ipcRenderer.invoke('atril:state:reveal', file),
  snapshotWorkspace: () => ipcRenderer.invoke('atril:snapshot-ws'),
  snapshotView: () => ipcRenderer.invoke('atril:snapshot-view')
}

contextBridge.exposeInMainWorld('atril', api)
