const FIRST = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]'

/** ⌘L and ⌘J land here: the first focusable thing of the sidebar or of the Libretto panel. */
export function focusRegion(target: 'sidebar' | 'flow'): boolean {
  const el = document.querySelector<HTMLElement>(target === 'sidebar' ? '.col.left' : '.col.right')?.querySelector<HTMLElement>(FIRST)
  el?.focus()
  return el !== undefined && el === document.activeElement
}
