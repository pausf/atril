import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FileChange } from '../../preload/api'
import { useModalKeys } from './modalKeys'

interface Props {
  workspaceId: string
  files: FileChange[]
  start: string
  onClose: () => void
}

function diffLine(l: string, i: number): ReactNode {
  const cls = /^(diff --git|index |new file|deleted file|--- |\+\+\+ )/.test(l)
    ? 'dmeta'
    : l.startsWith('@@')
      ? 'dhunk'
      : l.startsWith('+')
        ? 'dadd'
        : l.startsWith('-')
          ? 'ddel'
          : undefined
  return (
    <span key={i}>
      {cls ? <span className={cls}>{l}</span> : l}
      {'\n'}
    </span>
  )
}

/** F21: a read-only snapshot of one file's diff, with the other changed files beside it. */
export function DiffModal({ workspaceId, files, start, onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState(start)
  const [diff, setDiff] = useState<string | null>(null)
  const [at, setAt] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)
  const keys = useModalKeys(dialog, onClose)

  useEffect(() => {
    let live = true
    setDiff(null)
    void window.atril.flow.diff(workspaceId, file).then((d) => {
      if (!live) return
      setDiff(d)
      setAt(new Date())
    })
    return () => {
      live = false
    }
  }, [workspaceId, file, tick])

  const current = files.find((f) => f.path === file)
  const lines = (diff ?? '').replace(/\n$/, '').split('\n')
  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg edmodal" role="dialog" aria-modal="true" aria-labelledby="diff-title" ref={dialog} tabIndex={-1}>
        <div className="edhead">
          <h3 id="diff-title">Cambios</h3>
          <span className="docchange">{file}</span>
          <span className="sp" />
          <button type="button" className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="doc-editor">
          <nav className="outline" aria-label="Archivos cambiados">
            <span className="olh">Archivos</span>
            {files.map((f) => (
              <button key={f.path} type="button" className={f.path === file ? 'on' : undefined} title={f.path} onClick={() => setFile(f.path)}>
                <span className={`fst ${f.status}`}>{f.status}</span> {f.path.split('/').pop()}
              </button>
            ))}
          </nav>
          <div className="edwrap">
            <div className="gutter" aria-hidden="true">
              {lines.map((_, i) => i + 1).join('\n')}
            </div>
            <div className="ed">
              <pre className="hl diffview" tabIndex={0} aria-label={`Diff de ${file}`}>
                {diff === null ? 'Cargando…' : diff === '' ? 'Este archivo ya no tiene cambios.' : lines.map(diffLine)}
              </pre>
            </div>
          </div>
        </div>
        <div className="edstatus">
          <span className="ro">solo lectura · diff contra la rama base</span>
          {current && (
            <span>
              <span className="fa">+{current.added}</span> <span className="fd">−{current.removed}</span>
            </span>
          )}
          <span className="sp" />
          {at && <span>instantánea de las {at.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" onClick={() => setTick((t) => t + 1)}>
            Actualizar
          </button>
        </div>
      </div>
    </div>
  )
}
