import { useEffect, useRef } from 'react'
import { headings, highlight } from './highlight'

interface Props {
  text: string
  readOnly: boolean
  onChange: (text: string) => void
  /** Character offset to put the cursor at; changes move it. */
  cursor: { at: number } | null
}

/** A textarea over a coloured <pre>: same font, same scroll, no wrapping, so the gutter always matches. */
export function DocEditor({ text, readOnly, onChange, cursor }: Props) {
  const area = useRef<HTMLTextAreaElement>(null)
  const pre = useRef<HTMLPreElement>(null)
  const gutter = useRef<HTMLDivElement>(null)

  const sync = (): void => {
    const t = area.current
    if (!t) return
    if (pre.current) {
      pre.current.scrollTop = t.scrollTop
      pre.current.scrollLeft = t.scrollLeft
    }
    if (gutter.current) gutter.current.scrollTop = t.scrollTop
  }

  const go = (at: number): void => {
    const t = area.current
    if (!t) return
    t.focus()
    t.setSelectionRange(at, at)
    const line = text.slice(0, at).split('\n').length - 1
    const lh = parseFloat(getComputedStyle(t).lineHeight)
    if (Number.isFinite(lh)) t.scrollTop = Math.max(0, line * lh - 8)
    sync()
  }

  useEffect(() => {
    if (cursor) go(cursor.at)
    // Only a new cursor request moves it; typing must not jump the caret.
  }, [cursor])

  const lines = text.split('\n').length
  return (
    <div className="doc-editor">
      <nav className="outline" aria-label="Esquema">
        <span className="olh">Esquema</span>
        {headings(text).map((h) => (
          <button key={h.offset} type="button" className={h.level === 3 ? 'l3' : undefined} onClick={() => go(h.offset)}>
            {h.title}
          </button>
        ))}
      </nav>
      <div className="edwrap">
        <div className="gutter" ref={gutter} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
        </div>
        <div className="ed">
          <pre className="hl" ref={pre} aria-hidden="true">
            {highlight(text)}
          </pre>
          <textarea
            ref={area}
            className="src"
            aria-label="Contenido del archivo"
            spellCheck={false}
            wrap="off"
            readOnly={readOnly}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onScroll={sync}
          />
        </div>
      </div>
    </div>
  )
}
