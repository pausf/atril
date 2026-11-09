import type { ScoreTarget } from './scores'

/**
 * The window may only open links main handed it (a repo it just created, an MR of the latest
 * listing) and clone into the
 * folder the person picked in main's own dialog: anything else from the renderer is refused.
 */
export function createForgeGuards() {
  const links = new Set<string>()
  let listed = new Set<string>()
  let scorable = new Map<string, ScoreTarget>()
  let folder: string | null = null
  return {
    created: (url: string): void => void links.add(url),
    /** W52: each listing replaces the previous one. */
    listed: (urls: string[]): void => {
      listed = new Set(urls)
    },
    /** M17: the MRs of Mías and Me toca revisar of the latest listing, replaced each time. */
    scorable: (targets: Map<string, ScoreTarget>): void => {
      scorable = targets
    },
    scoreTarget: (url: string): ScoreTarget | undefined => scorable.get(url),
    openable: (url: string): boolean => links.has(url) || listed.has(url),
    picked: (f: string): void => {
      folder = f
    },
    cloneFolder: (f: string): boolean => folder !== null && f === folder
  }
}
