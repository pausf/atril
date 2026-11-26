export type CrashSend = (r: { message: string; stack: string }) => void

export const fromError = (e: unknown, fallback = ''): { message: string; stack: string } =>
  e instanceof Error ? { message: e.message || e.name, stack: e.stack ?? '' } : { message: typeof e === 'string' ? e : fallback || String(e), stack: '' }

/** crash R5: what the window does not catch goes to main; returns the way to stop. */
export function installWindowCrash(win: Window, send: CrashSend): () => void {
  const onError = (e: ErrorEvent): void => send(fromError(e.error, e.message))
  const onRejection = (e: PromiseRejectionEvent): void => send(fromError(e.reason))
  win.addEventListener('error', onError)
  win.addEventListener('unhandledrejection', onRejection)
  return () => {
    win.removeEventListener('error', onError)
    win.removeEventListener('unhandledrejection', onRejection)
  }
}
