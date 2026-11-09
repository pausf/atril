import { useEffect, useRef, useState } from 'react'
import type { DoctorReport, JiraIssue, NextItem, WorkspaceView } from '../preload/api'
import { FlowPanel } from './flow/FlowPanel'
import { Footer } from './components/Footer'
import { Rail, type Screen } from './components/Rail'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Workspace } from './components/Workspace'
import { Ajustes } from './settings/Ajustes'
import { Inbox, useInbox } from './inbox/Inbox'
import { MrScreen } from './mr/MrScreen'
import { Avisos, useAvisos, type AvisoTarget } from './avisos/Avisos'
import { useMrs } from './mr/useMrs'
import { StartDialog } from './inbox/StartDialog'
import { OwnTaskDialog } from './inbox/OwnTaskDialog'
import { NextUpStrip } from './components/NextUpStrip'
import { startOrAsk, useNextUp } from './nextup'
import { NavigationContext } from './settings/navigation'
import { Appearance } from './components/Appearance'
import { Language } from './settings/Language'
import { focusRegion } from './focus'
import { Tour } from './tour/Tour'
import { Palette } from './palette/Palette'
import { paletteItems } from './palette/items'
import { UiProvider, useT, useUi } from './ui'

export function App() {
  return (
    <UiProvider>
      <Shell />
    </UiProvider>
  )
}

function Shell() {
  const { ui, markTutorialSeen } = useUi()
  const t = useT()
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStart, setTourStart] = useState(-1)
  const unseen = ui !== null && !ui.tutorialSeen
  useEffect(() => {
    if (unseen) setTourOpen(true)
  }, [unseen])
  const closeTour = (): void => {
    setTourOpen(false)
    setScreen('work')
    markTutorialSeen()
  }
  const [report, setReport] = useState<DoctorReport | null>(null)

  useEffect(() => {
    window.atril
      .doctor()
      .then(setReport)
      .catch((err: unknown) =>
        setReport([{ tool: 'doctor', ok: false, problem: t('no se pudo comprobar: {detail}', { detail: String(err) }), install: '' }])
      )
  }, [])

  const [workspaces, setWorkspaces] = useState<WorkspaceView[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('work')
  const inbox = useInbox()
  const next = useNextUp()
  const mrs = useMrs()
  const avisos = useAvisos()
  const [openUrl, setOpenUrl] = useState<string | null>(null)
  const [starting, setStarting] = useState<JiraIssue | null>(null)
  const [dialog, setDialog] = useState<'task' | 'work' | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  /** The palette's starting query; null while it is closed. */
  const [palette, setPalette] = useState<string | null>(null)
  const quickBusy = useRef(false)

  useEffect(() => {
    void window.atril.snapshotView().then((v) => {
      if (v === 'settings' || v === 'tasks' || v === 'work' || v === 'mr' || v === 'avisos') setScreen(v)
      if (v === 'mr-score' || v === 'mr-thread' || v === 'mr-lens') setScreen('mr')
      if (v === 'tasks-board') setScreen('tasks')
      if (v === 'settings-board' || v === 'create-repo') setScreen('settings')
      if (v === 'tasks-own') {
        setScreen('tasks')
        setDialog('task')
      }
      // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=palette opens it with a query typed for a photo.
      if (v === 'palette') setPalette('listado')
      if (v === 'start') {
        setScreen('tasks')
        // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=start opens the dialog on a fake issue so it can be photographed without Jira.
        setStarting({ key: 'PF-4870', summary: 'Filtro de laboratorios en el listado', type: 'Story', status: 'To Do', statusId: '2', project: 'PF', components: [], group: 'todo' }) // i18n-ignore
      }
      const at = /^tour(\d+)$/.exec(v ?? '')
      if (at) setTourStart(Number(at[1]))
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

  // A notification click must show the workspace, not just select it behind another screen (W38).
  useEffect(
    () =>
      window.atril.status.onOpen((id) => {
        setSelected(id)
        setScreen('work')
      }),
    []
  )

  useEffect(() => window.atril.menu.setState(selected, workspaces.length), [selected, workspaces.length])
  // N2: ⌘↩ only where the list is on screen or one click away.
  useEffect(() => window.atril.menu.setNext((screen === 'work' || screen === 'tasks') && next.length > 0), [screen, next.length])

  const openWorkspace = (id: string): void => {
    setSelected(id)
    setScreen('work')
  }

  const go = (s: Screen): void => {
    setOpenUrl(null)
    setScreen(s)
  }

  // V6: only what the latest listing (or the workspace list) still holds can be opened.
  const openAviso = (to: AvisoTarget): string | null => {
    if (to.kind === 'workspace') {
      if (!workspaces.some((w) => w.id === to.id)) return t('Ese trabajo ya no está')
      openWorkspace(to.id)
      return null
    }
    const r = mrs.result
    if (!r || ![...r.mine, ...r.review, ...r.following].some((m) => m.url === to.url)) return t('Esta MR ya no está en la lista')
    setOpenUrl(to.url)
    setScreen('mr')
    return null
  }

  const openNext = (item: NextItem | undefined): void => {
    if (item?.kind === 'agent') openWorkspace(item.id)
    else if (item) {
      const issue = inbox.issues.find((i) => i.key === item.key)
      // Not loaded here yet: Tareas refetches on mount, so the task shows up there.
      if (issue) setStarting(issue)
      else setScreen('tasks')
    }
  }

  useEffect(
    () =>
      window.atril.menu.onAction((a) => {
        if (a.kind === 'next') return openNext(next[0])
        if (a.kind === 'select') {
          const ws = workspaces[a.index]
          if (ws) setSelected(ws.id)
          return
        }
        // W54: ⌘K does nothing while any dialog, the palette included, is open.
        if (a.kind === 'palette') {
          if (!document.querySelector('[aria-modal="true"]')) setPalette('')
          return
        }
        if (a.kind === 'tutorial') setTourOpen(true)
        else focusRegion(a.target)
      }),
    [workspaces, next, inbox.issues]
  )

  // Start already created the workspace in main: only the list and the inbox links are stale.
  const started = async (ws: WorkspaceView): Promise<void> => {
    setWorkspaces(await window.atril.workspaces.list())
    setSelected(ws.id)
  }

  const beginStart = async (issue: JiraIssue, optionClick: boolean): Promise<void> => {
    if (quickBusy.current) return
    quickBusy.current = true
    setStartError(null)
    try {
      const r = await startOrAsk(issue, optionClick)
      if (r.kind === 'dialog') return setStarting(issue)
      if (r.kind === 'error') return setStartError(r.error)
      await started(r.workspace)
      void inbox.refresh()
      if (r.transitionError) setStartError(t('El trabajo está en marcha, pero {detail}', { detail: `${r.transitionError.charAt(0).toLowerCase()}${r.transitionError.slice(1)}` }))
      else openWorkspace(r.workspace.id)
    } catch (e) {
      setStartError(String(e))
    } finally {
      quickBusy.current = false
    }
  }

  const remove = async (id: string): Promise<string | null> => {
    const r = await window.atril.workspaces.remove(id)
    if ('error' in r) return r.error
    if (selected === id) setSelected(null)
    setWorkspaces(await window.atril.workspaces.list())
    return null
  }

  const problems = (report ?? []).filter((r) => !r.ok)

  const items = () =>
    paletteItems({
      t,
      workspaces,
      mrs: mrs.result,
      issues: inbox.issues,
      go,
      openWorkspace,
      openMr: (url) => {
        setOpenUrl(url)
        setScreen('mr')
      },
      // Tareas' own button: Abrir trabajo when it already has one, Empezar otherwise (I20/I21).
      startTask: (issue) => {
        if (issue.workspaceId) return openWorkspace(issue.workspaceId)
        setScreen('tasks')
        void beginStart(issue, false)
      },
      newWork: () => setDialog('work'),
      newTask: () => setDialog('task'),
      refreshMrs: () => void mrs.refresh(),
      markAllRead: () => avisos.markRead('all'),
      tutorial: () => setTourOpen(true)
    })

  return (
    <div className="win">
      <NavigationContext.Provider value={{ openSettings: () => setScreen('settings') }}>
        <TopBar problems={problems} screen={screen} />
        <div className="shell">
          <Rail screen={screen} onChange={go} reviews={mrs.result?.review.length ?? 0} unread={avisos.unread} />
          {/* Hidden, not unmounted: the terminals must survive a visit to Ajustes. */}
          <div className="work" hidden={screen !== 'work'}>
            <NextUpStrip items={next} workspaces={workspaces} issues={inbox.issues} onOpen={openNext} />
            <div className="body">
              <Sidebar
                workspaces={workspaces}
                selected={selected}
                onSelect={setSelected}
                onRemove={remove}
                onNewWork={() => setDialog('work')}
                inbox={inbox}
                onOpenTasks={() => setScreen('tasks')}
              />
              <Workspace ws={workspaces.find((w) => w.id === selected)} />
              <FlowPanel workspaceId={selected} auto={workspaces.find((w) => w.id === selected)?.auto === true} />
            </div>
          </div>
          {screen === 'tasks' && <Inbox inbox={inbox} onStart={(i, alt) => void beginStart(i, alt)} startError={startError} onOpenWorkspace={openWorkspace} onNewTask={() => setDialog('task')} />}
          {screen === 'mr' && <MrScreen mrs={mrs} openUrl={openUrl} />}
          {screen === 'avisos' && <Avisos avisos={avisos} open={openAviso} />}
          {screen === 'settings' && (
            <Ajustes>
              <Appearance />
              <Language />
            </Ajustes>
          )}
        </div>
      </NavigationContext.Provider>
      {starting && (
        <StartDialog
          issue={starting}
          onClose={() => setStarting(null)}
          onStarted={async (ws) => {
            await started(ws)
            void inbox.refresh()
          }}
          onOpenWorkspace={(id) => {
            setStarting(null)
            openWorkspace(id)
          }}
        />
      )}
      {dialog && (
        <OwnTaskDialog
          textOptional={dialog === 'work'}
          onClose={() => setDialog(null)}
          onOpenSettings={() => {
            setDialog(null)
            setScreen('settings')
          }}
          onStarted={async (ws) => {
            await started(ws)
            setDialog(null)
            openWorkspace(ws.id)
          }}
        />
      )}
      {palette !== null && <Palette items={items()} initialQuery={palette} onClose={() => setPalette(null)} />}
      {tourOpen && <Tour startAt={tourStart} screen={screen} goTo={setScreen} onClose={closeTour} />}
      <Footer />
    </div>
  )
}
