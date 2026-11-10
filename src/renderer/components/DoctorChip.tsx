import { useEffect, useRef, useState } from 'react'
import type { ToolReport } from '../../preload/api'
import { useT } from '../ui'

export function DoctorChip({ problems }: { problems: ToolReport[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  /** Per tool: 'running' or main's error text; cleared by each recheck, which hands in new problems. */
  const [installs, setInstalls] = useState<Record<string, string>>({})
  const root = useRef<HTMLSpanElement>(null)

  useEffect(() => setInstalls({}), [problems])

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

  const install = (tool: string): void => {
    setInstalls((s) => ({ ...s, [tool]: 'running' }))
    void window.atril.installTool(tool).then((r) => setInstalls((s) => ({ ...s, [tool]: 'error' in r ? r.error : 'running' })))
  }

  return (
    <span className="doctor-chip" ref={root}>
      <button className="chip bad" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        {problems.length === 1 ? t('{n} herramienta por instalar', { n: 1 }) : t('{n} herramientas por instalar', { n: problems.length })}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label={t('Herramientas que faltan')}>
          {problems.map((p) => (
            <div className="doctor-item" key={p.tool}>
              <b>{p.tool}</b>
              <span className="doctor-problem">{p.problem}</span>
              {p.install && (
                <span className="doctor-cmd">
                  <code>{p.install}</code>
                  <button className="btn" onClick={() => copy(p.install)}>
                    {copied === p.install ? t('Copiado') : t('Copiar')}
                  </button>
                  {installs[p.tool] !== 'running' && (
                    <button className="btn p" onClick={() => install(p.tool)}>
                      {t('Instalar')}
                    </button>
                  )}
                </span>
              )}
              {installs[p.tool] === 'running' && <span className="doctor-problem">{t('Instalando en Terminal…')}</span>}
              {installs[p.tool] !== undefined && installs[p.tool] !== 'running' && <span className="doctor-error" role="alert">{installs[p.tool]}</span>}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}
