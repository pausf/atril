/**
 * The window may only open links main handed it (a repo it just created) and clone into the
 * folder the person picked in main's own dialog: anything else from the renderer is refused.
 */
export function createForgeGuards() {
  const links = new Set<string>()
  let folder: string | null = null
  return {
    created: (url: string): void => void links.add(url),
    openable: (url: string): boolean => links.has(url),
    picked: (f: string): void => {
      folder = f
    },
    cloneFolder: (f: string): boolean => folder !== null && f === folder
  }
}
