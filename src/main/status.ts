import { existsSync, watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentState, AgentWait, QuickAnswer, QuickChoice, QuickReplies, WaitKind, WaitQuestion, WorkspaceView } from '../preload/api'
import { atrilHome } from './paths'
import { run as defaultRun, type Runner } from './run'
import { hasSession, paneDead, paneListedDead, pasteText, pressKey, sendKey, sendText } from './tmux'
import { readSubagents } from './subagents'
import type { AgentSnapshot } from './nextup'
import { listWorkspaces, readRecords } from './workspaces'
import { orProblem, readState, StateError } from './state'
import { t } from './lang'
import { localiseActivity } from '../preload/activity-i18n'
import { burst } from './burst'
import { kindOf } from './avisos'

export const stateDir = (): string => join(atrilHome(), 'state')
/** W86: one file per paused session, written by main; main (Reanudar) or the hook (W87) removes it. */
const pauseFile = (session: string): string => join(atrilHome(), 'paused', session)

/** One notification per entry into needs-you (W15, W27). */
export const shouldNotify = (prev: AgentState | undefined, next: AgentState): boolean =>
  (next === 'needs-you' || next === 'done') && prev !== next

/** V11: a state that leaves the wait behind marks its notices read; entering `done` does not (W15). */
export const leftWait = (state: AgentState): boolean => state !== 'needs-you' && state !== 'done'

interface HookFile {
  state?: string
  text?: string
  at?: number
  kind?: unknown
  questions?: unknown
  permission?: unknown
  idle?: unknown
  /** Before W197: the first question's labels. */
  options?: unknown
  multiSelect?: unknown
}

async function hookFile(session: string): Promise<HookFile> {
  try {
    return JSON.parse(await readFile(join(stateDir(), `${session}.json`), 'utf8'))
  } catch {
    /* no hook has fired yet, or the file is mid-replace */
    return {}
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** W197: the hook's kind, else read from its text as before it wrote one. */
function kindOfWait(file: HookFile): WaitKind | undefined {
  if (file.kind === 'question' || file.kind === 'permission' || file.kind === 'turn-end') return file.kind
  const text = str(file.text)
  if (/^Te pregunta: Claude needs your permission/.test(text)) return 'permission'
  if (Array.isArray(file.options) || file.multiSelect === true) return 'question'
  if (text.startsWith('Claude dice: ') || text === 'Claude ha terminado') return 'turn-end'
  return undefined
}

/** W74: every stored question; a state from before W197 holds its first question's labels only. */
function questionsOf(file: HookFile): WaitQuestion[] {
  if (Array.isArray(file.questions))
    return file.questions.map((q: Record<string, unknown>) => ({
      question: str(q?.['question']),
      header: str(q?.['header']),
      options: Array.isArray(q?.['options']) ? q['options'].map((o: Record<string, unknown>) => ({ label: str(o?.['label']), description: str(o?.['description']) })) : [],
      multiSelect: q?.['multiSelect'] === true
    }))
  if (!Array.isArray(file.options) && file.multiSelect !== true) return []
  const labels = Array.isArray(file.options) ? file.options.filter((o): o is string => typeof o === 'string') : []
  return [{ question: str(file.text).replace(/^Te pregunta: /, ''), header: '', options: labels.map((label) => ({ label, description: '' })), multiSelect: file.multiSelect === true }]
}

/** W75: per session, the question answered next, kept with the state's time so a new entry starts at 0. */
const progress = new Map<string, { at: number | undefined; next: number }>()
const nextQuestion = (session: string, file: HookFile): number => {
  const p = progress.get(session)
  return p && p.at === file.at ? p.next : 0
}

/** W199: an end of turn, or done, while one of its subagents still runs is not a wait yet. */
async function behindSubagent(session: string, file: HookFile): Promise<boolean> {
  if (file.state !== 'done' && (file.state !== 'needs-you' || kindOfWait(file) !== 'turn-end')) return false
  return ((await readSubagents(session)) ?? []).some((e) => e.endedAt === undefined)
}

// W205: an option Claude marks as the one it recommends.
export const RECOMMENDED = /\s*\((Recommended|Recomendado)\)\s*$/

/** W205: what Automático decided, shown until the agent writes a newer line. */
const decided = new Map<string, { text: string; at?: number; line?: string }>()
/** The activity feed re-reads when Automático decides: no hook write may follow at once. */
const decidedListeners = new Set<() => void>()
export function onDecided(cb: () => void): () => void {
  decidedListeners.add(cb)
  return () => void decidedListeners.delete(cb)
}
async function newestLine(session: string): Promise<{ at?: number; line?: string }> {
  const { readLines } = await import('./activity')
  const first = (await readLines(session))[0]
  return first ? { at: first.at, line: first.text } : {}
}
export async function decidedLine(session: string, newest: { at: number; text: string } | undefined): Promise<{ at: number; text: string } | null> {
  const d = decided.get(session)
  if (!d || newest?.at !== d.at || newest?.text !== d.line) return null
  return { at: d.at ?? 0, text: d.text }
}

/** W199: the line the row shows instead of the turn's last words while a subagent runs. */
export async function waitingLine(session: string): Promise<{ at: number; text: string } | null> {
  const file = await hookFile(session)
  return (await behindSubagent(session, file)) ? { at: file.at ?? 0, text: 'Esperando a un subagente' } : null // i18n-ignore: an activity line, localised when shown
}

async function hookState(session: string): Promise<AgentState> {
  // W86: the mark outranks the hook's state until the hook removes it (UserPromptSubmit or needs-you) or Reanudar does.
  if (existsSync(pauseFile(session))) return 'paused'
  const file = await hookFile(session)
  if (await behindSubagent(session, file)) return 'working'
  return file.state === 'needs-you' || file.state === 'done' || file.state === 'working' ? file.state : 'working'
}

/** What a needs-you agent waits for (W200–W202); null otherwise. */
export async function waitOf(session: string): Promise<AgentWait | null> {
  const file = await hookFile(session)
  if (file.state !== 'needs-you' || (await behindSubagent(session, file))) return null
  const kind = kindOfWait(file)
  const p = file.permission as { tool?: unknown; summary?: unknown } | undefined
  return {
    ...(kind && { kind }),
    ...(typeof file.text === 'string' && file.text && { text: plainWait(file.text) }),
    questions: questionsOf(file),
    next: nextQuestion(session, file),
    ...(kind === 'permission' && typeof p?.tool === 'string' && p.tool && { permission: { tool: p.tool, ...(typeof p.summary === 'string' && p.summary && { summary: p.summary }) } }),
    idle: file.idle === true
  }
}

/** W203: the hook's English wait messages, in Atril's words, for text written before the hook said them itself. */
export function plainWait(text: string): string {
  const tool = /^Te pregunta: Claude needs your permission to use (.+)$/.exec(text) // i18n-ignore: matches Claude Code's English, never shown
  if (tool) return `Te pregunta: ¿Puede usar ${tool[1]}?` // i18n-ignore: a hook line, localised when shown
  if (/^Te pregunta: Claude needs your permission/.test(text)) return 'Te pregunta: ¿Puede seguir?' // i18n-ignore: a hook line, localised when shown
  if (/^Te pregunta: Claude is waiting for your input/.test(text)) return 'Claude te necesita' // i18n-ignore: a hook line, localised when shown
  return text
}

/** The agent's own words written with the state change (A4), else today's body. */
export async function notificationBody(ws: WorkspaceView): Promise<string> {
  const { text } = await hookFile(ws.session)
  return typeof text === 'string' && text ? localiseActivity(plainWait(text), t) : t('{branch} te necesita', { branch: ws.branch })
}

export async function agentState(ws: WorkspaceView, run: Runner = defaultRun): Promise<AgentState> {
  if (!ws.alive || (await paneListedDead(ws.paneId, run))) return 'stopped'
  return hookState(ws.session)
}

// Functions, not constants: the text must be in the language of the moment it is shown (W48).
export const replyPlaceholder = (): string => t('Responde a Claude…')
export const replyGone = (): string => t('No se pudo enviar: ese trabajo ya no está')

export type ReplyPlan = { kind: 'send'; paneId: string; text: string } | { kind: 'ignore' } | { kind: 'gone' }

/** N3: what a notification reply does, decided from the record and the pane alone. */
export function planReply(text: string, ws: Pick<WorkspaceView, 'paneId' | 'alive'> | undefined, paneIsDead: boolean): ReplyPlan {
  // One line: a newline typed into the pane would submit it before the Enter we send.
  const line = text.replace(/[\r\n]+/g, ' ').trim()
  if (line === '') return { kind: 'ignore' }
  if (!ws?.alive || !/^%\d+$/.test(ws.paneId) || paneIsDead) return { kind: 'gone' }
  return { kind: 'send', paneId: ws.paneId, text: line }
}

/** W74: how many options the question due now offers; 0 for none. */
export async function optionCount(session: string): Promise<number> {
  return (await quickReplies(session)).options.length
}

/** The question a numbered reply from the Mac answers (N3). */
async function dueQuestion(session: string): Promise<number> {
  return nextQuestion(session, await hookFile(session))
}

/** N3: a reply from the Mac notification; with options, a number from 1 to their count answers that option (W75). */
export type NoticeReply = 'sent' | 'ignored' | 'gone' | { error: string }

/** N3: only a vanished work reads as gone; any other refusal keeps its own sentence. */
export const fromAnswer = (r: { ok: true } | { error: string }): NoticeReply => ('ok' in r ? 'sent' : r.error === replyGone() ? 'gone' : { error: r.error })

export async function replyFromNotice(id: string, text: string, run: Runner = defaultRun): Promise<NoticeReply> {
  const line = text.trim()
  if (line === '') return 'ignored'
  if (/^\d+$/.test(line)) {
    const rec = (await readRecords()).find((r) => r.id === id)
    const n = Number(line)
    if (rec && n >= 1 && n <= (await optionCount(rec.session))) return fromAnswer(await answerAgent(id, { option: n - 1, question: await dueQuestion(rec.session) }, run))
  }
  return replyToAgent(id, text, run)
}

/** W163: an action asks tmux directly whether the session exists; the 1-second snapshot is only for showing state. */
async function actingWorkspace(id: string, run: Runner): Promise<WorkspaceView | undefined> {
  const rec = (await readRecords()).find((r) => r.id === id)
  return rec && { ...rec, alive: await hasSession(id, run) }
}

/** Resolves the workspace's own pane from its record and types the reply there; nothing else is touched. */
export async function replyToAgent(id: string, text: string, run: Runner = defaultRun): Promise<'sent' | 'ignored' | 'gone'> {
  if (text.trim() === '') return 'ignored'
  const ws = await actingWorkspace(id, run)
  const plan = planReply(text, ws, ws ? await paneDead(ws.paneId, run) : true)
  if (plan.kind !== 'send') return plan.kind === 'gone' ? 'gone' : 'ignored'
  return (await sendText(plan.paneId, plan.text, run)) ? 'sent' : 'gone'
}

/** The question due now, as the row's options (W74); multiSelect offers nothing. */
export async function quickReplies(session: string): Promise<QuickReplies> {
  const wait = await waitOf(session)
  const q = wait?.questions[wait.next]
  return q ? { options: q.options.map((o) => o.label), multiSelect: q.multiSelect, question: wait.next } : { options: [], multiSelect: false, question: 0 }
}

// W75, W206: never a bare «sí»: it was read as approval of whatever Claude had last offered.
export const CONTINUE = 'Sigue con el plan; no hagas nada que no esté en él.' // i18n-ignore: words for Claude, not the person

const isChoice = (c: unknown): c is QuickChoice => {
  if (typeof c !== 'object' || c === null) return false
  const v = c as Record<string, unknown>
  const keys = Object.keys(c).sort().join(',')
  if (keys === 'option,question') return Number.isInteger(v['option']) && Number.isInteger(v['question'])
  return (keys === 'allow' || keys === 'deny' || keys === 'continue') && v[keys] === true
}

/** W75: re-reads the state, then turns the choice into keys for that workspace's pane. */
export async function answerAgent(id: string, choice: QuickChoice, run: Runner = defaultRun): Promise<QuickAnswer> {
  const noOption = { error: t('Esa opción ya no existe.') }
  if (!isChoice(choice)) return noOption
  const ws = await actingWorkspace(id, run)
  if (!ws?.alive || !/^%\d+$/.test(ws.paneId) || (await paneDead(ws.paneId, run))) return { error: replyGone() }
  const file = await hookFile(ws.session)
  if (file.state !== 'needs-you') return { error: t('Ese agente ya no está esperando una respuesta.') }
  const sent = (ok: boolean): QuickAnswer => (ok ? { ok: true } : { error: replyGone() })
  if ('continue' in choice) return sent(await pasteText(ws.paneId, CONTINUE, run))
  if ('allow' in choice || 'deny' in choice) {
    if (kindOfWait(file) !== 'permission') return noOption
    // «1» is «Sí» in Claude Code's permission prompt; Escape refuses it.
    return sent('allow' in choice ? await sendKey(ws.paneId, '1', run) : await pressKey(ws.paneId, 'Escape', run))
  }
  const questions = questionsOf(file)
  const q = questions[choice.question]
  if (choice.question !== nextQuestion(ws.session, file) || !q || q.multiSelect || choice.option < 0 || choice.option >= q.options.length) return noOption
  if (!(await sendKey(ws.paneId, String(choice.option + 1), run))) return { error: replyGone() }
  progress.set(ws.session, { at: file.at, next: choice.question + 1 })
  // After the call's last question, Claude Code waits for its answers to be submitted.
  return choice.question === questions.length - 1 ? sent(await pressKey(ws.paneId, 'Enter', run)) : { ok: true }
}

/** W204: the composer's trimmed text as a bracketed paste, then Enter, into that workspace's own pane. */
export async function composeAgent(id: string, text: string, run: Runner = defaultRun): Promise<QuickAnswer> {
  const line = text.trim()
  if (!line) return { error: t('No hay nada que enviar.') }
  const ws = await liveWorkspace(id, run)
  if (!ws) return { error: replyGone() }
  return (await pasteText(ws.paneId, line, run)) ? { ok: true } : { error: replyGone() }
}

export async function liveWorkspace(id: string, run: Runner): Promise<WorkspaceView | undefined> {
  const ws = await actingWorkspace(id, run)
  return ws?.alive && /^%\d+$/.test(ws.paneId) && !(await paneDead(ws.paneId, run)) ? ws : undefined
}

/** W86: Escape in that workspace's pane, offered only while it works; the session stays alive. */
export async function pauseAgent(id: string, run: Runner = defaultRun): Promise<QuickAnswer> {
  const blocked = await orProblem(() => readState('workspaces'))
  if ('error' in blocked) return { error: blocked.error }
  const ws = await liveWorkspace(id, run)
  if (!ws) return { error: replyGone() }
  if ((await hookState(ws.session)) !== 'working') return { error: t('Ese agente no está trabajando.') }
  if (!(await pressKey(ws.paneId, 'Escape', run))) return { error: replyGone() }
  await mkdir(join(atrilHome(), 'paused'), { recursive: true })
  await writeFile(pauseFile(ws.session), String(Math.floor(Date.now() / 1000)))
  return { ok: true }
}

/** W87: asks a paused agent to go on with main's own words, then forgets the pause. */
export async function resumeAgent(id: string, run: Runner = defaultRun): Promise<QuickAnswer> {
  const blocked = await orProblem(() => readState('workspaces'))
  if ('error' in blocked) return { error: blocked.error }
  const ws = await liveWorkspace(id, run)
  if (!ws) return { error: replyGone() }
  if ((await hookState(ws.session)) !== 'paused') return { error: t('Ese agente no está en pausa.') }
  if (!(await sendText(ws.paneId, t('Sigue donde lo dejaste.'), run))) return { error: replyGone() }
  await rm(pauseFile(ws.session), { force: true })
  return { ok: true }
}

export interface StatusOptions {
  run?: Runner
  onChange: (id: string, state: AgentState) => void
  /** W15, W176: an entry into needs-you, or a question after an end of turn in the same wait; `text` is the hook's. */
  notify: (ws: WorkspaceView, kind: 'ask' | 'done', text: string | undefined) => void
  /** W178, W179: the workspaces that stopped in one pass. */
  stopped?: (list: WorkspaceView[]) => void
  /** W180: once per entry, after `idleMinutes` of main's clock. */
  idle?: (ws: WorkspaceView, minutes: number) => void
  idleMinutes?: () => Promise<number>
  /** V11: a workspace that left the list. */
  left?: (id: string) => void
  /** W178: a workspace Atril is closing does not count as a stop. */
  closing?: (id: string) => boolean
  now?: () => number
}

export function createStatus({ run = defaultRun, onChange, notify, stopped = () => {}, idle = () => {}, idleMinutes = async () => 15, closing = () => false, left = () => {}, now = Date.now }: StatusOptions) {
  const known = new Map<string, AgentState>()
  const since = new Map<string, number>()
  /** Per session in needs-you: main's clock at the entry, the hook text last seen, whether W180 fired. */
  const waits = new Map<string, { at: number; text: string | undefined; reminded: boolean }>()
  let busy = false
  let seeded = false
  let timer: NodeJS.Timeout | undefined
  let watcher: FSWatcher | undefined

  async function refresh(): Promise<void> {
    if (busy) return
    busy = true
    try {
      let list: WorkspaceView[]
      try {
        list = await listWorkspaces(run)
      } catch (err) {
        // W145: the poll is fired with `void`; a damaged list waits for the person, states as last seen.
        if (err instanceof StateError) return
        throw err
      }
      const stops: WorkspaceView[] = []
      const minutes = await idleMinutes()
      for (const ws of list) {
        const next = await automatic(ws, await agentState(ws, run))
        const prev = known.get(ws.id)
        if (prev !== next) {
          known.set(ws.id, next)
          const file = await hookFile(ws.session)
          since.set(ws.id, file.at ?? 0)
          onChange(ws.id, next)
          if (next === 'needs-you') {
            const text = typeof file.text === 'string' ? plainWait(file.text) : undefined
            waits.set(ws.id, { at: now(), text, reminded: false })
            // The first pass only records: reopening Atril must not announce what was already waiting.
            if (seeded && shouldNotify(prev, next)) notify(ws, kindOf(text), text)
          } else {
            waits.delete(ws.id)
            if (next === 'done' && seeded && shouldNotify(prev, next)) notify(ws, 'done', typeof file.text === 'string' ? file.text : undefined)
          }
          if (seeded && next === 'stopped' && prev !== undefined && !closing(ws.id)) stops.push(ws)
          continue
        }
        const wait = next === 'needs-you' ? waits.get(ws.id) : undefined
        if (!wait) continue
        const { text } = await hookFile(ws.session)
        const now_ = typeof text === 'string' ? plainWait(text) : undefined
        // W176: a question after an end of turn, in the same wait, is news.
        if (seeded && wait.text?.startsWith('Claude dice: ') && now_?.startsWith('Te pregunta: ')) notify(ws, 'ask', now_)
        wait.text = now_
        if (seeded && !wait.reminded && now() - wait.at >= minutes * 60_000) {
          wait.reminded = true
          idle(ws, minutes)
        }
      }
      for (const id of known.keys())
        if (!list.some((w) => w.id === id)) {
          known.delete(id)
          since.delete(id)
          waits.delete(id)
          left(id)
        }
      if (stops.length) stopped(stops)
      seeded = true
    } finally {
      busy = false
    }
  }

  /** Per automatic workspace: the wait it already answered, its «Sigue» in a row, and since when it works (W206). */
  const autos = new Map<string, { answered?: number; count: number; workingSince?: number }>()

  /** W205–W207: in Automático, a question or an end of turn is answered here and reads as working. */
  async function automatic(ws: WorkspaceView, state: AgentState): Promise<AgentState> {
    if (ws.auto !== true) return state
    const a = autos.get(ws.id) ?? { count: 0 }
    autos.set(ws.id, a)
    if (state !== 'needs-you') {
      if (state !== 'working') a.workingSince = undefined
      else if (a.workingSince === undefined) a.workingSince = now()
      else if (now() - a.workingSince >= 30_000) a.count = 0
      return state
    }
    a.workingSince = undefined
    const file = await hookFile(ws.session)
    if (file.at !== undefined && a.answered === file.at) return 'working'
    const kind = kindOfWait(file)
    if (kind === 'question') {
      const questions = questionsOf(file)
      if (questions.length === 0 || questions.some((q) => q.multiSelect || q.options.length === 0)) return state
      const picks = questions.map((q) => Math.max(0, q.options.findIndex((o) => RECOMMENDED.test(o.label))))
      for (const [question, option] of picks.entries())
        if ('error' in (await answerAgent(ws.id, { option, question }, run))) return state
      a.answered = file.at
      decided.set(ws.session, { text: `Decidió: ${picks.map((o, i) => questions[i]!.options[o]!.label.replace(RECOMMENDED, '')).join(' · ')}`, ...(await newestLine(ws.session)) }) // i18n-ignore: an activity line, localised when shown
      decidedListeners.forEach((cb) => cb())
      return 'working'
    }
    if (kind === 'turn-end' && a.count < 3) {
      if ('error' in (await answerAgent(ws.id, { continue: true }, run))) return state
      a.count++
      a.answered = file.at
      return 'working'
    }
    return state
  }

  const api = {
    refresh,
    states: (): Record<string, AgentState> => Object.fromEntries(known),
    snapshot: (): AgentSnapshot[] => [...known].map(([id, state]) => ({ id, state, at: since.get(id) ?? 0 })),
    async start(): Promise<void> {
      await mkdir(stateDir(), { recursive: true })
      watcher = watch(stateDir(), poke)
      timer = setInterval(() => void refresh(), 2000)
      await refresh()
    },
    stop(): void {
      watcher?.close()
      poke.cancel()
      clearInterval(timer)
    }
  }
  // Through `api` so a test can count what a burst of hook writes costs.
  const poke = burst(() => void api.refresh())
  return api
}
