import type { CrashWhere } from './report'

type Listener = (...args: unknown[]) => void
interface Emitter {
  on(event: string, listener: Listener): unknown
}
export interface CrashInput {
  where: CrashWhere
  message: string
  stack?: string
}

const EARLY = 5
const WINDOW_MAX = 16 * 1024

const fromError = (e: unknown): { message: string; stack: string } => {
  if (e instanceof Error) return { message: e.message || e.name, stack: e.stack ?? '' }
  try {
    return { message: String(e), stack: '' }
  } catch {
    return { message: typeof e, stack: '' }
  }
}

/** R5: main's own failures, what the window sends and dead processes; before ready they wait in memory. */
export function installCrashHooks(d: {
  proc: Emitter
  app: Emitter & { whenReady(): Promise<unknown> }
  ipc: Emitter
  isOwnWindow(sender: unknown): boolean
  crash: { report(r: CrashInput): Promise<void> }
  log?: (...a: unknown[]) => void
}): void {
  const log = d.log ?? console.error
  let ready = false
  const early: CrashInput[] = []
  const send = (r: CrashInput): void => void d.crash.report(r).catch(() => undefined)
  const report = (r: CrashInput): void => {
    if (ready) send(r)
    else if (early.length < EARLY) early.push(r)
  }
  void d.app.whenReady().then(() => {
    ready = true
    early.splice(0).forEach(send)
  })

  // Electron would show its dialog and stop; Atril logs it and keeps running.
  const fromMain = (e: unknown): void => {
    log(e)
    report({ where: 'main', ...fromError(e) })
  }
  d.proc.on('uncaughtException', fromMain as Listener)
  d.proc.on('unhandledRejection', fromMain as Listener)

  d.ipc.on('atril:crash:report', ((e: { sender: unknown }, p: unknown) => {
    if (!d.isOwnWindow(e.sender) || typeof p !== 'object' || p === null) return
    const { message, stack } = p as Record<string, unknown>
    if (typeof message !== 'string' || typeof stack !== 'string') return
    report({ where: 'ventana', message: message.slice(0, WINDOW_MAX), stack: stack.slice(0, WINDOW_MAX) })
  }) as Listener)

  const gone = (type: string, g: { reason?: string; exitCode?: number }): void => {
    if (g.reason === 'clean-exit' || g.reason === 'killed') return
    report({ where: 'proceso', message: `${type} ${g.reason} (exit ${g.exitCode})` })
  }
  d.app.on('render-process-gone', ((_e: unknown, _wc: unknown, g: { reason?: string; exitCode?: number }) => gone('renderer', g)) as Listener)
  d.app.on('child-process-gone', ((_e: unknown, g: { type?: string; reason?: string; exitCode?: number }) => gone(g.type ?? 'child', g)) as Listener)
}
