const EVERY = 5 * 60_000

interface Deps {
  /** `lastMrs` of index.ts: written by every listing, the window's and this one's. */
  last: () => { at: number } | null
  /** Lists and feeds Avisos, as the window's listings do. */
  list: () => Promise<unknown>
  connected: () => Promise<boolean>
  now?: () => number
}

/** W185: main lists MRs when nobody has for five minutes, window or not. */
export function createMrPoll({ last, list, connected, now = Date.now }: Deps) {
  let timer: NodeJS.Timeout | undefined
  const tick = async (): Promise<boolean> => {
    if (!(await connected())) return false
    const l = last()
    if (l && now() - l.at < EVERY) return false
    await list().catch(() => undefined)
    return true
  }
  return {
    tick,
    start: (): void => {
      timer = setInterval(() => void tick().catch(() => undefined), 60_000)
    },
    stop: (): void => clearInterval(timer)
  }
}
