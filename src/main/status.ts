import { watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentState, QuickAnswer, QuickChoice, QuickReplies, WorkspaceView } from '../preload/api'
import { atrilHome } from './paths'
import { run as defaultRun, type Runner } from './run'
import { sendKey, sendText, tmuxArgs } from './tmux'
import type { AgentSnapshot } from './nextup'
import { listWorkspaces } from './workspaces'
import { t } from './lang'
import { localiseActivity } from '../preload/activity-i18n'

export const stateDir = (): string => join(atrilHome(), 'state')

/** One notification per entry into needs-you (W15, W27). */
export const shouldNotify = (prev: AgentState | undefined, next: AgentState): boolean =>
  next === 'needs-you' && prev !== 'needs-you'

async function hookFile(session: string): Promise<{ state?: string; text?: string; at?: number; options?: unknown; multiSelect?: unknown }> {
  try {
    return JSON.parse(await readFile(join(stateDir(), `${session}.json`), 'utf8'))
  } catch {
    /* no hook has fired yet, or the file is mid-replace */
    return {}
  }
}

async function hookState(session: string): Promise<AgentState> {
  const { state } = await hookFile(session)
  return state === 'needs-you' || state === 'working' ? state : 'working'
}

/** The agent's own words written with the state change (A4), else today's body. */
export async function notificationBody(ws: WorkspaceView): Promise<string> {
  const { text } = await hookFile(ws.session)
  return typeof text === 'string' && text ? localiseActivity(text, t) : t('{branch} te necesita', { branch: ws.branch })
}

// Only the agent's own pane counts (W16); a failing display means the pane or the server is gone.
async function paneDead(paneId: string, run: Runner): Promise<boolean> {
  const r = await run('tmux', [...tmuxArgs(), 'display', '-p', '-t', paneId, '#{pane_dead}'])
  return r.code !== 0 || r.stdout.trim() === '1'
}

export async function agentState(ws: WorkspaceView, run: Runner = defaultRun): Promise<AgentState> {
  if (!ws.alive || (await paneDead(ws.paneId, run))) return 'stopped'
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

/** Resolves the workspace's own pane from its record and types the reply there; nothing else is touched. */
export async function replyToAgent(id: string, text: string, run: Runner = defaultRun): Promise<'sent' | 'ignored' | 'gone'> {
  if (text.trim() === '') return 'ignored'
  const ws = (await listWorkspaces(run)).find((w) => w.id === id)
  const plan = planReply(text, ws, ws ? await paneDead(ws.paneId, run) : true)
  if (plan.kind !== 'send') return plan.kind === 'gone' ? 'gone' : 'ignored'
  return (await sendText(plan.paneId, plan.text, run)) ? 'sent' : 'gone'
}

/** What the row may offer for that session's question (W74); multiSelect offers nothing. */
export async function quickReplies(session: string): Promise<QuickReplies> {
  const { state, options, multiSelect } = await hookFile(session)
  if (state !== 'needs-you') return { options: [], multiSelect: false }
  return { options: Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : [], multiSelect: multiSelect === true }
}

const isChoice = (c: unknown): c is QuickChoice => {
  if (typeof c !== 'object' || c === null) return false
  const keys = Object.keys(c)
  if (keys.length !== 1) return false
  const v = (c as Record<string, unknown>)[keys[0]!]
  return keys[0] === 'option' ? Number.isInteger(v) : keys[0] === 'fixed' && (v === 'yes' || v === 'no')
}

/** W75: re-reads the state, then types an option's number key or main's own fixed words into that workspace's pane. */
export async function answerAgent(id: string, choice: QuickChoice, run: Runner = defaultRun): Promise<QuickAnswer> {
  if (!isChoice(choice)) return { error: t('Esa opción ya no existe.') }
  const ws = (await listWorkspaces(run)).find((w) => w.id === id)
  if (!ws?.alive || !/^%\d+$/.test(ws.paneId) || (await paneDead(ws.paneId, run))) return { error: replyGone() }
  const { state, options } = await hookFile(ws.session)
  if (state !== 'needs-you') return { error: t('Ese agente ya no está esperando una respuesta.') }
  if ('option' in choice) {
    const n = Array.isArray(options) ? options.length : 0
    if (choice.option < 0 || choice.option >= n) return { error: t('Esa opción ya no existe.') }
    return (await sendKey(ws.paneId, String(choice.option + 1), run)) ? { ok: true } : { error: replyGone() }
  }
  const words = choice.fixed === 'yes' ? t('Sí, sigue') : t('No, espera')
  return (await sendText(ws.paneId, words, run)) ? { ok: true } : { error: replyGone() }
}

export interface StatusOptions {
  run?: Runner
  onChange: (id: string, state: AgentState) => void
  notify: (ws: WorkspaceView, body: string) => void
}

export function createStatus({ run = defaultRun, onChange, notify }: StatusOptions) {
  const known = new Map<string, AgentState>()
  const since = new Map<string, number>()
  let busy = false
  let seeded = false
  let timer: NodeJS.Timeout | undefined
  let watcher: FSWatcher | undefined

  async function refresh(): Promise<void> {
    if (busy) return
    busy = true
    try {
      const list = await listWorkspaces(run)
      for (const ws of list) {
        const next = await agentState(ws, run)
        const prev = known.get(ws.id)
        if (prev === next) continue
        known.set(ws.id, next)
        since.set(ws.id, (await hookFile(ws.session)).at ?? 0)
        onChange(ws.id, next)
        // The first pass only records: reopening Atril must not announce what was already waiting.
        if (seeded && shouldNotify(prev, next)) notify(ws, await notificationBody(ws))
      }
      for (const id of known.keys())
        if (!list.some((w) => w.id === id)) {
          known.delete(id)
          since.delete(id)
        }
      seeded = true
    } finally {
      busy = false
    }
  }

  return {
    refresh,
    states: (): Record<string, AgentState> => Object.fromEntries(known),
    snapshot: (): AgentSnapshot[] => [...known].map(([id, state]) => ({ id, state, at: since.get(id) ?? 0 })),
    async start(): Promise<void> {
      await mkdir(stateDir(), { recursive: true })
      watcher = watch(stateDir(), () => void refresh())
      timer = setInterval(() => void refresh(), 2000)
      await refresh()
    },
    stop(): void {
      watcher?.close()
      clearInterval(timer)
    }
  }
}
