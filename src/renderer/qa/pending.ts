import type { QaReport, QaStatus } from '../../preload/api'

/** W116: «Probando…» gives up after this and shows the previous status again. */
export const TESTING_MS = 5 * 60 * 1000

/** `live`: the QA pane has been seen alive since the request, so its death ends the wait. */
export interface QaPending {
  since: number
  live: boolean
}

/** W116's end rules for one workspace's pending requests, applied to what main just answered. */
export function settled(pending: Record<string, QaPending>, id: string, report: QaReport | null, status: QaStatus | null, now: number): Record<string, QaPending> {
  const next: Record<string, QaPending> = {}
  for (const [key, p] of Object.entries(pending)) {
    const crit = key.startsWith(`${id}:`) ? key.slice(id.length + 1) : null
    if (crit === null) {
      next[key] = p
      continue
    }
    const answered = report !== null && report.at >= p.since && report.entries.some((e) => e.id === crit)
    const died = p.live && !status?.live
    if (answered || died || now - p.since >= TESTING_MS) continue
    next[key] = status?.live && !p.live ? { ...p, live: true } : p
  }
  return next
}

