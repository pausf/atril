import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useModalKeys } from '../flow/modalKeys'
import { useT } from '../ui'
import { filterItems, type ItemKind, type PaletteItem } from './items'

interface Props {
  items: PaletteItem[]
  onClose: () => void
  /** Dev snapshot only: a query already typed. */
  initialQuery?: string
}

export function Palette({ items, onClose, initialQuery = '' }: Props) {
  const t = useT()
  const kinds: Record<ItemKind, string> = { screen: t('Pantalla'), action: t('Acción'), workspace: t('Trabajo'), mr: t('MR'), task: t('Tarea') }
  const dialog = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [at, setAt] = useState(0)
  const shown = filterItems(items, query)
  const current = shown[Math.min(at, shown.length - 1)]
  const optionId = (i: PaletteItem): string => `pl-${shown.indexOf(i)}`

  const keys = useModalKeys(dialog, onClose)
  // After useModalKeys: it remembers the opener first, then the box takes the focus.
  useEffect(() => {
    input.current?.focus()
  }, [])
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [at, query])

  const run = (item: PaletteItem | undefined): void => {
    if (!item) return
    onClose()
    item.run()
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (keys(e)) return
    const n = shown.length
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (n > 0) setAt((a) => (Math.min(a, n - 1) + (e.key === 'ArrowDown' ? 1 : n - 1)) % n)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(current)
    }
  }

  const active = current ? optionId(current) : undefined
  return (
    <div className="modal palette-scrim" onKeyDown={onKeyDown} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg palette" role="dialog" aria-modal="true" aria-label={t('Buscar')} ref={dialog} tabIndex={-1}>
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={t('Buscar en Atril')}
          aria-controls="pl-list"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-activedescendant={active}
          placeholder={t('Pantallas, trabajos, MR, tareas o acciones')}
          value={query}
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value)
            setAt(0)
          }}
        />
        <div id="pl-list" className="pl-list" role="listbox" aria-label={t('Resultados')} aria-activedescendant={active} ref={listRef}>
          {shown.map((i) => (
            <div
              key={i.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === current}
              className="pl-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(i)}
            >
              <span className="pl-label">{i.label}</span>
              <span className="pl-kind">{kinds[i.kind]}</span>
            </div>
          ))}
        </div>
        {shown.length === 0 && <p className="pl-empty">{t('Nada coincide con «{query}»', { query })}</p>}
      </div>
    </div>
  )
}
