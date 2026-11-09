import { useEffect, useRef, useState } from 'react'
import type { ToolReport } from '../../preload/api'

export function DoctorChip({ problems }: { problems: ToolReport[] }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const root = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent): void => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  if (problems.length === 0) return null

  const copy = (cmd: string): void => {
    void navigator.clipboard?.writeText(cmd).then(() => setCopied(cmd))
  }

  return (
    <span className="doctor-chip" ref={root}>
      <button className="chip bad" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        {problems.length} {problems.length === 1 ? 'herramienta' : 'herramientas'} por instalar
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Herramientas que faltan">
          {problems.map((p) => (
            <div className="doctor-item" key={p.tool}>
              <b>{p.tool}</b>
              <span className="doctor-problem">{p.problem}</span>
              {p.install && (
                <span className="doctor-cmd">
                  <code>{p.install}</code>
                  <button className="btn" onClick={() => copy(p.install)}>
                    {copied === p.install ? 'Copiado' : 'Copiar'}
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}
