import { useEffect, useRef, type KeyboardEvent, type MutableRefObject } from 'react'
import { useT } from '../ui'

export interface Level {
  label: string
  sub: string
  /** Why it cannot run now (M26); it still shows, disabled. */
  disabled?: string
  run: () => void
}

/**
 * M45: one «Revisar ▾» with its levels; Enter, Space or ↓ open it, ↑/↓ move, Escape closes it and gives focus back.
 * `close` lets the page close it as the top layer (M43).
 */
export function RevisarMenu({ levels, status, open, setOpen, close }: { levels: Level[]; status: string; open: boolean; setOpen: (o: boolean) => void; close: MutableRefObject<(() => void) | null> }) {
  const t = useT()
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const shut = (): void => {
    setOpen(false)
    button.current?.focus()
  }
  useEffect(() => {
    close.current = open ? shut : null
  })

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const outside = (e: MouseEvent): void => {
      if (!menu.current?.parentElement?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [open, setOpen])

  const onButtonKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }
  const onMenuKey = (e: KeyboardEvent): void => {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      shut()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
    } else if (e.key === 'Tab') setOpen(false)
  }

  if (levels.length === 0) return null
  return (
    <span className="rvw">
      <button ref={button} type="button" className="btn p" aria-haspopup="menu" aria-expanded={open} data-tour="mr-tools" onClick={() => setOpen(!open)} onKeyDown={onButtonKey}>
        {t('Revisar ▾')}
      </button>
      <span className="rvst" role="status">
        {status}
      </span>
      {open && (
        <div className="rvch" role="menu" aria-label={t('Revisar')} ref={menu} onKeyDown={onMenuKey}>
          {levels.map((l) => (
            <button
              key={l.label}
              type="button"
              role="menuitem"
              className="rvo"
              aria-disabled={l.disabled ? true : undefined}
              onClick={() => {
                if (l.disabled) return
                setOpen(false)
                l.run()
              }}
            >
              <b>{l.label}</b>
              <span>{l.disabled ?? l.sub}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
