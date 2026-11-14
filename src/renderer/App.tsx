import { useEffect, useMemo, useRef, useState } from 'react'
import type { DoctorReport, JiraIssue, NextItem, RemoveResult, StateProblem, WorkspaceView } from '../preload/api'
import { FlowPanel } from './flow/FlowPanel'
import { BigCode } from './flow/BigCode'
import { useBoxes, useFlow } from './flow/useFlow'
import { Footer } from './components/Footer'
import { Rail, type Screen } from './components/Rail'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Workspace } from './components/Workspace'
import { Setup } from './components/Setup'
import { Ajustes } from './settings/Ajustes'
import { Inbox, useInbox } from './inbox/Inbox'
import { MrScreen } from './mr/MrScreen'
import { Libretto } from './libretto/Libretto'
import { QaScreen } from './qa/QaScreen'
import type { QaPending } from './qa/pending'
import { Avisos, useAvisos, type AvisoTarget } from './avisos/Avisos'
import { useMrs } from './mr/useMrs'
import { StartDialog } from './inbox/StartDialog'
import { OwnTaskDialog } from './inbox/OwnTaskDialog'
import { NextUpStrip } from './components/NextUpStrip'
import { FocusBar } from './components/FocusBar'
import { AgentsOverview } from './components/AgentsOverview'
import { ViewSwitch } from './components/ViewSwitch'
import { FocusButton } from './components/FocusButton'
import { startOrAsk, useNextUp } from './nextup'
import { NavigationContext } from './settings/navigation'
import { Language } from './settings/Language'
import { Notifications } from './settings/Notifications'
import { focusRegion } from './focus'
import { Tour } from './tour/Tour'
import { Palette } from './palette/Palette'
import { paletteItems } from './palette/items'
import { UiProvider, useT, useUi } from './ui'
import { requestFix } from './mr/FixCi'
import { askClose } from './components/WorkspaceList'

export function App() {
  return (
    <UiProvider>
      <Shell />
    </UiProvider>
  )
}

function Shell() {
  const { ui, markTutorialSeen, dismissSetup, setLibrettoRepo } = useUi()
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
  const problems = useMemo(() => (report ?? []).filter((r) => !r.ok), [report])
  const missing = problems.length > 0

  const check = (): void => {
    window.atril
      .doctor()
      .then(setReport)
      .catch((err: unknown) =>
        setReport([{ tool: 'doctor', ok: false, problem: t('no se pudo comprobar: {detail}', { detail: String(err) }), install: '' }])
      )
  }
  useEffect(check, [])
  // A tool installed in another window shows up as soon as the person comes back (W71).
  useEffect(() => {
    if (!missing) return
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [missing])

  const [workspaces, setWorkspaces] = useState<WorkspaceView[]>([])
  // W145: a damaged workspaces.json; the list keeps what it last showed, so open terminals stay.
  const [wsProblem, setWsProblem] = useState<StateProblem | null>(null)
  const listWorkspaces = async (): Promise<WorkspaceView[] | null> => {
    const r = await window.atril.workspaces.list()
    if (!Array.isArray(r)) {
      setWsProblem(r.problem)
      return null
    }
    setWsProblem(null)
    setWorkspaces(r)
    return r
  }
  /** False until listed: the setup card must not flash before the real list arrives. */
  const [listed, setListed] = useState(false)
  const [worked, setWorked] = useState<boolean | null>(null)
  const [openDoctor, setOpenDoctor] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('work')
  // W77: never stored, focus is for the moment. It only holds on Trabajo with a workspace selected:
  // elsewhere the pill is not on screen, so main must notify as usual (W78).
  const [focusMode, setFocusMode] = useState(false)
  const focused = focusMode && selected !== null && screen === 'work'
  /** W79: the workspace open at the first jump; later jumps and manual switches leave it alone. */
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const exitFocus = (): void => {
    setFocusMode(false)
    setReturnTo(null)
  }
  const [all, setAll] = useState(false)
  const toggleFocus = (): void => {
    if (focused) exitFocus()
    else if (screen === 'work' && selected) {
      setFocusMode(true)
      setAll(false)
    }
  }
  // W81: «Todos», never stored; focus is for one workspace, so entering it turns focus off (W77).
  const showAll = (on: boolean): void => {
    setAll(on)
    if (on) exitFocus()
  }
  const flow = useFlow(selected)
  const boxes = useBoxes(selected, flow ?? null)
  // F39: the enlarged code of one box, never stored. It lives where the terminal is, so only on «Uno».
  const [big, setBig] = useState<{ index: number; file?: string } | null>(null)
  const bigAvailable = screen === 'work' && !all && selected !== null
  const bigBox = big ? boxes.boxes.find((b) => b.index === big.index) : undefined
  useEffect(() => window.atril.menu.setBig(bigAvailable), [bigAvailable])
  useEffect(() => {
    if (!bigAvailable || (big && !bigBox)) setBig(null)
  }, [bigAvailable, big, bigBox])
  useEffect(() => setBig(null), [selected])
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
  const [qaPending, setQaPending] = useState<Record<string, QaPending>>({})

  useEffect(() => {
    void window.atril.snapshotView().then((v) => {
      if (v === 'settings' || v === 'tasks' || v === 'work' || v === 'mr' || v === 'avisos' || v === 'libretto' || v === 'qa') setScreen(v)
      if (v === 'mr-score' || v === 'mr-thread' || v === 'mr-lens') setScreen('mr')
      if (v === 'tasks-board') setScreen('tasks')
      if (v === 'settings-board' || v === 'create-repo') setScreen('settings')
      if (v === 'tasks-own') {
        setScreen('tasks')
        setDialog('task')
      }
      // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=palette opens it with a query typed for a photo.
      if (v === 'palette') setPalette('listado')
      // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=focus turns focus mode on over the first workspace for a photo.
      if (v === 'focus') setFocusMode(true)
      // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=overview opens «Todos» for a photo.
      if (v === 'overview') setAll(true)
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
      const list = await listWorkspaces()
      setListed(true)
      // Dev snapshot: show the first workspace without a click.
      if (list?.[0] && (await window.atril.snapshotWorkspace())) setSelected(list[0].id)
    })()
  }, [])

  useEffect(() => {
    let pushed = false
    void window.atril.history.list().then((e) => !pushed && setWorked(e.length > 0), () => setWorked(false))
    return window.atril.history.onChange((e) => {
      pushed = true
      setWorked(e.length > 0)
    })
  }, [])
  // W97: only for someone who never worked here, and never over the tutorial. A live workspace is any listed one,
  // stopped in tmux or not; the closed ones are in the history.
  const setup = listed && worked === false && ui !== null && !ui.setupDismissed && !tourOpen && workspaces.length === 0 && wsProblem === null

  // A notification click must show the workspace, not just select it behind another screen (W38).
  useEffect(
    () =>
      window.atril.status.onOpen((id) => {
        setSelected(id)
        setAll(false)
        setScreen('work')
      }),
    []
  )

  // W186, W187, W194: a Mac notification brings the window to what it was about.
  useEffect(
    () =>
      window.atril.notify.onOpen((to) => {
        if (to.kind === 'avisos') return setScreen('avisos')
        if (to.kind === 'close') {
          setSelected(to.id)
          setAll(false)
          setScreen('work')
          return askClose(to.id)
        }
        if (to.kind === 'fixCi') requestFix(to.url)
        setOpenUrl(to.url)
        setScreen('mr')
      }),
    []
  )
  useEffect(() => window.atril.menu.setState(selected, workspaces.length), [selected, workspaces.length])
  // V21: a workspace on screen has had its questions seen.
  useEffect(() => {
    if (screen === 'work' && selected) void window.atril.avisos.seen(selected).catch(() => undefined)
  }, [screen, selected])
  // Also on load: a reload starts with focus off, and main must know (W78).
  useEffect(() => window.atril.menu.setFocus(focused, screen === 'work' && selected !== null), [focused, screen, selected])
  // W79: in focus, the agents waiting except the open one, in N1 order; tasks never count.
  const waiting = focused
    ? next.flatMap((n) => (n.kind === 'agent' && n.id !== selected ? workspaces.filter((w) => w.id === n.id) : []))
    : []
  const jump = (id: string): void => {
    if (returnTo === null) setReturnTo(selected)
    setSelected(id)
  }
  // A workspace removed while remembered is forgotten, so the next jump can remember a new one.
  useEffect(() => {
    if (returnTo !== null && !workspaces.some((w) => w.id === returnTo)) setReturnTo(null)
  }, [workspaces, returnTo])
  const goBack = async (): Promise<void> => {
    if (returnTo === null) return
    setReturnTo(null)
    // Re-listed: a workspace closed meanwhile is not gone back to.
    const list = await listWorkspaces()
    if (list?.some((w) => w.id === returnTo)) setSelected(returnTo)
  }
  // N2: ⌘↩ only where the list is on screen or one click away; in focus, only for a waiting agent (W79).
  const nextEnabled = focused ? waiting.length > 0 : (screen === 'work' || screen === 'tasks') && next.length > 0
  useEffect(() => window.atril.menu.setNext(nextEnabled), [nextEnabled])

  const openWorkspace = (id: string): void => {
    setSelected(id)
    setAll(false)
    setScreen('work')
  }
  /** Choosing a workspace shows it: from «Todos» that means «Uno». */
  const pick = (id: string): void => {
    setSelected(id)
    setAll(false)
  }
  const overviewAvailable = screen === 'work' && workspaces.length > 0
  useEffect(() => window.atril.menu.setOverview(overviewAvailable), [overviewAvailable])

  const go = (s: Screen): void => {
    setOpenUrl(null)
    setScreen(s)
  }

  // V6: only what the latest listing (or the workspace list) still holds can be opened.
  const openAviso = (to: AvisoTarget): string | null => {
    if (to.kind === 'forge') {
      void window.atril.mr.open(to.url)
      return null
    }
    if (to.kind !== 'mr') {
      if (!workspaces.some((w) => w.id === to.id)) return t('Ese trabajo ya no está')
      if (to.kind === 'qa') {
        setSelected(to.id)
        setScreen('qa')
        return null
      }
      openWorkspace(to.id)
      if (to.kind === 'close') askClose(to.id)
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
        if (a.kind === 'next') {
          if (!focused) return openNext(next[0])
          if (waiting[0]) jump(waiting[0].id)
          return
        }
        if (a.kind === 'back') return void goBack()
        if (a.kind === 'select') {
          const ws = workspaces[a.index]
          if (ws) pick(ws.id)
          return
        }
        // W54: ⌘K does nothing while any dialog, the palette included, is open.
        if (a.kind === 'palette') {
          if (!document.querySelector('[aria-modal="true"]')) setPalette('')
          return
        }
        if (a.kind === 'focusMode') {
          toggleFocus()
          return
        }
        if (a.kind === 'bigCode') {
          if (big) return setBig(null)
          const target = boxes.boxes.find((b) => b.state === 'current') ?? boxes.boxes.filter((b) => b.state === 'closed').at(-1)
          if (bigAvailable && target) setBig({ index: target.index })
          return
        }
        if (a.kind === 'overview') {
          if (overviewAvailable) showAll(!all)
          return
        }
        if (a.kind === 'tutorial') setTourOpen(true)
        else focusRegion(a.target)
      }),
    [workspaces, next, inbox.issues, selected, focused, screen, returnTo, all, overviewAvailable, big, boxes.boxes, bigAvailable]
  )

  // Start already created the workspace in main: only the list and the inbox links are stale.
  const started = async (ws: WorkspaceView): Promise<void> => {
    await listWorkspaces()
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

  const remove = async (id: string, forget = false): Promise<RemoveResult> => {
    const r = await (forget ? window.atril.workspaces.forget(id) : window.atril.workspaces.remove(id))
    if ('error' in r) return r
    if (selected === id) setSelected(null)
    await listWorkspaces()
    return r
  }


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
      <NavigationContext.Provider
        value={{
          openSettings: () => setScreen('settings'),
          openWorkspace: (id) => void listWorkspaces().then(() => openWorkspace(id))
        }}
      >
        <TopBar problems={problems} screen={screen} openDoctor={openDoctor} />
        <div className="shell">
          <Rail screen={screen} onChange={go} reviews={mrs.result?.review.length ?? 0} unread={avisos.unread} />
          {/* Hidden, not unmounted: the terminals must survive a visit to Ajustes. */}
          <div className="work" hidden={screen !== 'work'}>
            {focused ? (
              <FocusBar
                waiting={waiting}
                back={workspaces.find((w) => w.id === returnTo)}
                onJump={jump}
                onBack={() => void goBack()}
                onExit={exitFocus}
              />
            ) : (
              <NextUpStrip items={next} workspaces={workspaces} issues={inbox.issues} onOpen={openNext} />
            )}
            <div className={focused ? 'body focus' : all ? 'body all' : 'body'}>
              {!focused && (
                <Sidebar
                  workspaces={workspaces}
                  problem={wsProblem}
                  selected={selected}
                  onSelect={pick}
                  onRemove={remove}
                  onForget={(id) => remove(id, true)}
                  onNewWork={() => setDialog('work')}
                  inbox={inbox}
                  onOpenTasks={() => setScreen('tasks')}
                />
              )}
              {all && <AgentsOverview workspaces={workspaces} next={next} onOpen={pick} switcher={<ViewSwitch all={all} onChange={showAll} />} />}
              {/* Hidden, not unmounted, in «Todos»: the terminal must survive. */}
              <div className="uno" hidden={all}>
                {setup ? (
                  <Setup
                    report={report}
                    active={screen === 'work'}
                    onTools={() => setOpenDoctor((n) => n + 1)}
                    onNewWork={() => setDialog('work')}
                    onDismiss={dismissSetup}
                  />
                ) : (
                  <Workspace
                    ws={workspaces.find((w) => w.id === selected)}
                    flow={flow ?? null}
                    onReopened={async () => void (await listWorkspaces())}
                    onForget={(id) => remove(id, true)}
                    big={bigBox && selected ? <BigCode key={bigBox.index} workspaceId={selected} box={bigBox} tick={boxes.tick} start={big?.file} onClose={() => setBig(null)} /> : null}
                    switcher={
                      <>
                        <ViewSwitch all={all} onChange={showAll} />
                        <FocusButton on={focused} disabled={selected === null} onClick={toggleFocus} />
                      </>
                    }
                  />
                )}
                <FlowPanel
                  workspaceId={selected}
                  flow={flow}
                  boxes={boxes}
                  onBig={(index, file) => setBig({ index, file })}
                  onOpenLibretto={() => {
                    const repoId = workspaces.find((w) => w.id === selected)?.repoId
                    if (repoId) setLibrettoRepo(repoId)
                    setScreen('libretto')
                  }}
                />
              </div>
            </div>
          </div>
          {screen === 'tasks' && <Inbox inbox={inbox} onStart={(i, alt) => void beginStart(i, alt)} startError={startError} onOpenWorkspace={openWorkspace} onNewTask={() => setDialog('task')} />}
          {screen === 'mr' && <MrScreen mrs={mrs} openUrl={openUrl} />}
          {screen === 'libretto' && <Libretto />}
          {screen === 'qa' && <QaScreen workspaces={workspaces} selected={selected} pending={qaPending} setPending={setQaPending} openSettings={() => setScreen('settings')} />}
          {screen === 'avisos' && <Avisos avisos={avisos} open={openAviso} />}
          {screen === 'settings' && (
            <Ajustes>
              <Language />
              <Notifications />
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
