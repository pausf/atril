import { useEffect, useState } from 'react'
import type { Agent, DoctorReport, Model, WorkspaceView } from '../preload/api'
import { FlowPanel } from './flow/FlowPanel'
import { Footer } from './components/Footer'
import { Rail, type Screen } from './components/Rail'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Workspace } from './components/Workspace'
import { Ajustes } from './settings/Ajustes'
import { Inbox, useInbox } from './inbox/Inbox'
import { NavigationContext } from './settings/navigation'

export function App() {
  const [report, setReport] = useState<DoctorReport | null>(null)

  useEffect(() => {
    window.atril
      .doctor()
      .then(setReport)
      .catch((err: unknown) =>
        setReport([{ tool: 'doctor', ok: false, problem: `no se pudo comprobar: ${String(err)}`, install: '' }])
      )
  }, [])

  const [workspaces, setWorkspaces] = useState<WorkspaceView[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('work')
  const inbox = useInbox()

  useEffect(() => {
    void window.atril.snapshotView().then((v) => {
      if (v === 'settings' || v === 'tasks') setScreen(v)
      if (v === 'start') setScreen('tasks')
    })
  }, [])

  useEffect(() => {
    void (async () => {
      const list = await window.atril.workspaces.list()
      setWorkspaces(list)
      // Dev snapshot: show the first workspace without a click.
      if (list[0] && (await window.atril.snapshotWorkspace())) setSelected(list[0].id)
    })()
  }, [])

  useEffect(() => window.atril.status.onOpen(setSelected), [])

  useEffect(() => window.atril.menu.setState(selected, workspaces.length), [selected, workspaces.length])
  useEffect(
    () =>
      window.atril.menu.onAction((a) => {
        if (a.kind === 'select') {
          const ws = workspaces[a.index]
          if (ws) setSelected(ws.id)
          return
        }
        document.querySelector<HTMLElement>(a.target === 'sidebar' ? '.col.left' : '.col.right')
          ?.querySelector<HTMLElement>('button, input, [tabindex]')
          ?.focus()
      }),
    [workspaces]
  )

  const openWorkspace = (id: string): void => {
    setSelected(id)
    setScreen('work')
  }

  // Start already created the workspace in main: only the list and the inbox links are stale.
  const started = async (ws: WorkspaceView): Promise<void> => {
    setWorkspaces(await window.atril.workspaces.list())
    setSelected(ws.id)
  }

  const create = async (repoId: string, branch: string, agent: Agent, model: Model): Promise<string | null> => {
    const r = await window.atril.workspaces.open(repoId, branch, agent, model)
    if ('error' in r) return r.error
    setWorkspaces(await window.atril.workspaces.list())
    setSelected(r.workspace.id)
    return null
  }

  const remove = async (id: string): Promise<string | null> => {
    const r = await window.atril.workspaces.remove(id)
    if ('error' in r) return r.error
    if (selected === id) setSelected(null)
    setWorkspaces(await window.atril.workspaces.list())
    return null
  }

  const problems = (report ?? []).filter((r) => !r.ok)

  return (
    <div className="win">
      <NavigationContext.Provider value={{ openSettings: () => setScreen('settings') }}>
        <TopBar problems={problems} screen={screen} />
        <div className="shell">
          <Rail screen={screen} onChange={setScreen} />
          {/* Hidden, not unmounted: the terminals must survive a visit to Ajustes. */}
          <div className="body" hidden={screen !== 'work'}>
            <Sidebar
              workspaces={workspaces}
              selected={selected}
              onSelect={setSelected}
              onRemove={remove}
              onCreate={create}
              inbox={inbox}
              onOpenTasks={() => setScreen('tasks')}
            />
            <Workspace ws={workspaces.find((w) => w.id === selected)} />
            <FlowPanel workspaceId={selected} />
          </div>
          {screen === 'tasks' && <Inbox inbox={inbox} onStarted={started} onOpenWorkspace={openWorkspace} />}
          {screen === 'settings' && <Ajustes />}
        </div>
      </NavigationContext.Provider>
      <Footer />
    </div>
  )
}
