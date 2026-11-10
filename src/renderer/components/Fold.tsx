import { useId, type ReactNode } from 'react'
import { useFolded } from '../ui'

interface Props {
  id: string
  title: string
  count: number | string
  defaultFolded?: boolean
  className?: string
  tour?: string
  children: ReactNode
}

/** A section whose title is a real button; the count stays visible when it is folded. */
export function FoldSection({ id, title, count, defaultFolded = false, className, tour, children }: Props) {
  const [folded, toggle] = useFolded(id, defaultFolded)
  const body = useId()
  const head = useId()
  return (
    <section className={`fold${className ? ` ${className}` : ''}`} data-section={id} data-tour={tour}>
      <h2 className="fold-h">
        <button type="button" id={head} aria-expanded={!folded} aria-controls={body} onClick={toggle}>
          <span className="chev" aria-hidden>
            ▾
          </span>
          {title} <span className="n">{count}</span>
        </button>
      </h2>
      <div id={body} role="region" aria-labelledby={head} hidden={folded}>
        {children}
      </div>
    </section>
  )
}
