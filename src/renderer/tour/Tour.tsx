import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Screen } from '../components/Rail'
import { useT, type T } from '../ui'

export interface Step {
  /** Value of the `data-tour` attribute on the real element. */
  target: string
  screen: Screen
  title: string
  text: ReactNode
}

const kbd = (k: string): ReactNode => <kbd>{k}</kbd>

// Shortcuts inside a text show as keys; the text stays one t() key.
const KEYS = /(⌘⇧?[A-Z0-9↩]|⌥|↑|↓|\bEnter\b|\bEsc\b)/

const keys = (text: string): ReactNode => text.split(KEYS).map((part, n) => (n % 2 ? <kbd key={n}>{part}</kbd> : part))

export const stepsOf = (t: T): readonly Step[] => [
  { target: 'rail', screen: 'work', title: t('Your screens'), text: keys(t('On the left are the seven screens: Work, Tasks, MR, Libretto, QA, Notices and Settings. Click one to switch; whatever you have in Work stays alive while you are elsewhere. The number on MR counts the ones waiting for your review, and the one on Notices, the ones you have not read yet.')) },
  { target: 'next-up', screen: 'work', title: t('Up next'), text: keys(t('This strip gathers what is waiting for you: first the agents that need you, then the tasks to start. Click one to go to its workspace or to the Start dialog, or press ⌘↩ to go to the first. When nothing is waiting, it does not show.')) },
  { target: 'new-work', screen: 'work', title: t('New work'), text: keys(t('Opens a workspace in one of your repos: Atril creates the branch, in a worktree or in your copy depending on the repo, and launches Claude inside tmux. If you write what needs doing, Libretto starts with the spec and you pick the mode; if you leave it blank, it opens plain Claude. ⌘↩ starts it without leaving the keyboard.')) },
  { target: 'workspaces', screen: 'work', title: t('Work in progress'), text: keys(t('Each workspace with its agent, its status written out (working, needs you, paused or stopped), the last thing it did and how many subagents it has running. When an agent needs you, your Mac tells you and you can answer it from the notification or with the quick replies shown in its row, without opening its terminal. ⌘1 to ⌘9 pick the first nine; ⌘⇧A («All») shows them all as cards, those that need you first, ⌘⇧F (focus mode) leaves only the chosen one and tells you at the top if another needs you, and ⌘⇧P pauses or resumes it.')) },
  { target: 'terminal', screen: 'work', title: t("Your agent's terminal"), text: keys(t("It's your real Claude Code, inside tmux, read-only: you watch it work and can copy, but nothing is typed into it. What you tell it goes through Atril: the cards when it asks and «Write to the agent», below. If you close Atril, the agent keeps working in tmux.")) },
  { target: 'flow', screen: 'work', title: t('The Libretto panel'), text: keys(t('On the right you see how the selected workspace is going, read from its .agents folder: boxes with their code and subagents. It has two tabs, Libretto and Activity, and the arrow keys move between them. ⌘J brings you here and ⌘L takes you to the sidebar.')) },
  { target: 'stages', screen: 'work', title: t('The steps'), text: keys(t('Six named segments above the title of the work: Intake, Spec, Plan, Build, Review and Land. The current one fills as boxes close. Spec and Plan can be clicked: they open what Claude wrote, and while it waits for you, you can correct it and save with ⌘S.')) },
  { target: 'flow-checklist', screen: 'work', title: t('Boxes'), text: keys(t('From Build on, the checklist is a timeline: press a closed box to see the code that closed it and, on the box due now, the code Claude is writing, refreshed every 3 seconds. If the branch goes past 400 lines, a warning shows at the top: you can ask it to split it into chained MRs or leave it as it is.')) },
  { target: 'flow-subagents', screen: 'work', title: t('Subagents'), text: keys(t('When Claude hands part of the work to a subagent, here you see what it asked for, what type it is and how long it has been working or how long it took. Click one to open its log, with what it does shown as in a terminal and updated every second while it works.')) },
  { target: 'activity', screen: 'work', title: t('Activity'), text: keys(t('This tab tells in sentences what the selected agent has done: what it reads, edits, runs and asks you, newest on top. It lets you catch up without reading the whole terminal.')) },
  { target: 'tasks', screen: 'tasks', title: t('Your Jira tasks'), text: keys(t('Your open Jira tasks, grouped by status or by your board’s columns, and refreshed every 5 minutes. “Start” creates the branch, moves the task to In Progress and runs Libretto with its key; if Atril does not know yet which repo that project goes in, it asks you first. If you click with ⌥ held, it always opens the dialog to choose repo, branch, model and mode.')) },
  { target: 'start-mode', screen: 'tasks', title: t('Manual or automatic'), text: keys(t('When you start a task, or a workspace with text, you pick the mode. Manual stops with the spec and the plan written and asks you before building; Automatic goes on without stopping, but asks you before pushing anything. In automatic mode, the Spec and the Plan are read-only.')) },
  { target: 'new-task', screen: 'tasks', title: t('New task'), text: keys(t('For something that is not in Jira: write what needs doing and pick repo, branch, model and mode. Libretto takes your text as the request and starts with the spec. ⌘↩ starts it right away.')) },
  { target: 'mr', screen: 'mr', title: t('Your MRs'), text: keys(t('Three lists from GitHub and GitLab: Mine, To review and Following, with their CI, their size, when they last moved and whether they are in conflict. Click one and its page fills the screen (J and K move to the next or previous one): the code with each thread and each draft on its line, the conversation and, on the right, the score, “Against its spec”, the reviewers and the CI. On yours that the forge lets merge, “Merge” asks you before doing it.')) },
  { target: 'mr-tools', screen: 'mr', title: t('Score and review'), text: keys(t('On an MR’s page, “Review ▾” offers Score (difficulty and risk from 1 to 5, with Claude Sonnet), Comment (drafts per lens on their line, which you publish, discard or send to the agent) and In depth (Libretto reviewing it in your repo). Score and Comment show in Mine and To review, and in the inbox each of those rows also has “Score”. They only spend quota when you click them.')) },
  { target: 'avisos', screen: 'avisos', title: t('Notices'), text: keys(t('What changed in your MRs and your agents: reviews requested from you, new comments, failing CI, new MRs in what you follow and agents that need you. Click one to go to its MR or workspace, and it is marked read; “Mark all read” clears them at once. At the top you can filter them by type.')) },
  { target: 'libretto', screen: 'libretto', title: t('Libretto'), text: keys(t("Each repo's idea queue and what is in flight, read from its .agents folder: it costs no quota. Type an idea and “Queue” saves it and commits it on the current branch by itself; “Start” opens its work on a feat/ branch with Libretto already at the spec. Pick the repo at the top and “Refresh” reads it again.")) },
  { target: 'qa', screen: 'qa', title: t('QA'), text: keys(t('You pick a work and see each criterion of its change as Pass, Fail or Untested. «Test live» opens a Claude alongside that walks through the app and leaves a report and screenshots; «See how» shows its steps, «Test this» repeats one criterion and «Mark as bug» takes it to Jira or to the agent.')) },
  { target: 'doctor', screen: 'work', title: t('Missing tools'), text: keys(t('If a tool Atril needs is missing (git, tmux, claude or jira), a red warning at the top says how many. Click it: “Copy” copies the install command and “Install” runs it in Terminal. When you come back to the Atril window, it checks again and the warning goes away once everything is there.')) },
  { target: 'palette', screen: 'work', title: t('Search with ⌘K'), text: keys(t('⌘K opens a search across all of Atril: screens, actions, workspaces, MRs and tasks. Type a few letters, move with ↑ and ↓ and press Enter to go; Esc closes it.')) },
  { target: 'usage', screen: 'work', title: t('Your Claude quota'), text: keys(t('At the bottom you see how much Claude you have used in the last 5 hours and 7 days, and when the week resets. The bars change colour past 80 %, so you know if you have room for another agent.')) },
  { target: 'session', screen: 'work', title: t('Your session'), text: keys(t('Top right is the Jira account you are signed in with, or “Not connected”. Click it to go to Settings and connect, replace or delete your token.')) },
  { target: 'connections', screen: 'settings', title: t('Connections'), text: keys(t('Here you connect Jira, GitHub and GitLab with a token, and Atril checks it when you save it. They are stored encrypted in your Mac’s Keychain, never shown again and never given to your agents: you can only replace or delete them. In Jira you also pick the board that orders your Tasks.')) },
  { target: 'repos', screen: 'settings', title: t('Repos'), text: keys(t('Add the folder of a git repo, or create a new one on GitHub or GitLab and, if you want, Atril clones and adds it. Atril decides whether each workspace gets its own worktree or uses your copy: if there are unversioned files, like a .env, or the dependencies are very heavy, it uses your copy. The selector on each repo forces it.')) },
  { target: 'appearance', screen: 'settings', title: t('Appearance'), text: keys(t('Pick the palette, Original or Graphite, and the theme: Light, Dark or Auto, which follows your Mac. To see this tutorial again, go to Help → Tutorial or search for it with ⌘K.')) }
]


interface Box {
  left: number
  top: number
  width: number
  height: number
}

const PAD = 6
const TIP_W = 340
const MARGIN = 12

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(v, hi))

/** Beside the target when there is room, else over a corner of the window. */
function placeTip(r: Box, h: number, vw: number, vh: number): { left: number; top: number } {
  const alongY = clamp(r.top, MARGIN, vh - h - MARGIN)
  const alongX = clamp(r.left, MARGIN, vw - TIP_W - MARGIN)
  const right = r.left + r.width + PAD + 16
  const left = r.left - PAD - 16 - TIP_W
  const below = r.top + r.height + PAD + 16
  const above = r.top - PAD - 16 - h
  if (right + TIP_W <= vw - MARGIN) return { left: right, top: alongY }
  if (below + h <= vh - MARGIN) return { left: alongX, top: below }
  if (left >= MARGIN) return { left, top: alongY }
  if (above >= MARGIN) return { left: alongX, top: above }
  return { left: vw - TIP_W - 24, top: vh - h - 60 }
}

interface Props {
  screen: Screen
  goTo: (s: Screen) => void
  /** Skipped or finished: either way the tutorial is done. */
  onClose: () => void
  /** Dev snapshots open on a given step. */
  startAt?: number
}

export function Tour({ screen, goTo, onClose, startAt = -1 }: Props) {
  const t = useT()
  const STEPS = useMemo(() => stepsOf(t), [t])
  // -1 is the welcome card.
  const [i, setI] = useState(startAt)
  const [box, setBox] = useState<Box | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const tip = useRef<HTMLDivElement>(null)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const next = (): void => (last ? onClose() : setI(i + 1))
  const prev = (): void => (i > 0 ? setI(i - 1) : undefined)

  useEffect(() => {
    if (step && step.screen !== screen) goTo(step.screen)
  }, [step, screen, goTo])

  useEffect(() => {
    if (!step || step.screen !== screen) return setBox(null)
    const measure = (): void => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      el?.scrollIntoView?.({ block: 'nearest' })
      const r = el?.getBoundingClientRect()
      setBox(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null)
    }
    measure()
    // The footer and the session chip fill in after their data arrives and move.
    const late = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(late)
      window.removeEventListener('resize', measure)
    }
  }, [step, screen])

  useLayoutEffect(() => {
    setPos(step && box ? placeTip(box, tip.current?.offsetHeight ?? 260, window.innerWidth, window.innerHeight) : null)
  }, [step, box])

  useEffect(() => {
    tip.current?.querySelector<HTMLElement>('[data-primary]')?.focus()
  }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Tab') {
        const items = Array.from(tip.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
        const first = items[0]
        const end = items.at(-1)
        if (!first || !end) return
        const active = document.activeElement
        const inside = tip.current?.contains(active) ?? false
        const wrap = !inside ? (e.shiftKey ? end : first) : e.shiftKey && active === first ? end : !e.shiftKey && active === end ? first : null
        if (wrap) {
          e.preventDefault()
          wrap.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="tour">
      {box ? (
        <div
          className="spot"
          data-target={step?.target}
          style={{ left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      ) : (
        <div className="scrim" />
      )}
      <div
        ref={tip}
        className={`tip${!step ? ' welcome' : box ? '' : ' centred'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={step && pos ? { ...pos, right: 'auto', bottom: 'auto' } : undefined}
      >
        {step ? (
          <>
            <div className="stepn">
              {t('Step {n} of {total}', { n: i + 1, total: STEPS.length })}
            </div>
            <h4 id="tour-title">{step.title}</h4>
            <p>{step.text}</p>
            <div className="dots" aria-hidden>
              {STEPS.map((s, n) => (
                <i key={s.target} className={n === i ? 'on' : undefined} />
              ))}
            </div>
            <div className="nav">
              <button type="button" className="skip" onClick={onClose}>
                {t('Skip')}
              </button>
              <span className="sp" />
              <button type="button" className="btn" disabled={i === 0} onClick={prev}>
                {t('Back@@nav')}
              </button>
              <button type="button" className="btn p" data-primary onClick={next}>
                {last ? t('Finish') : t('Next')}
              </button>
            </div>
            <div className="kb">{kbd('←')} {kbd('→')} {t('to move')} · {kbd('Enter')} {t('next')} · {kbd('Esc')} {t('exit')}</div>
          </>
        ) : (
          <>
            <h4 id="tour-title">{t('Welcome to Atril')}</h4>
            <p>
              {t('Your Jira tasks, your Claude agents and the Libretto flow, in a single window. I will show you each piece in three minutes.')}
            </p>
            <div className="nav">
              <button type="button" className="btn" onClick={onClose}>
                {t('Skip')}
              </button>
              <span className="sp" />
              <button type="button" className="btn p" data-primary onClick={() => setI(0)}>
                {t('Show me · 3 min')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
