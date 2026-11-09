import { useEffect, type KeyboardEvent, type RefObject } from 'react'

const FOCUSABLE = 'button:not(:disabled), textarea, select:not(:disabled), input:not(:disabled)'

/** One keyboard behaviour for the flow modals: focus on open, Tab stays inside, Escape closes. */
export function useModalKeys(dialog: RefObject<HTMLElement | null>, onEscape: () => void): (e: KeyboardEvent) => boolean {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    return () => opener?.focus?.()
  }, [dialog])

  /** True when the key was handled. */
  return (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onEscape()
      return true
    }
    if (e.key !== 'Tab') return false
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    const first = items[0]
    const last = items.at(-1)
    if (!first || !last) return true
    const active = document.activeElement as HTMLElement | null
    const outside = !active || !items.includes(active)
    const wrap = e.shiftKey ? (active === first || outside) && last : (active === last || outside) && first
    if (wrap) {
      e.preventDefault()
      wrap.focus()
    }
    return true
  }
}
