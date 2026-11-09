import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Model, RepoView, WorkspaceView } from '../../preload/api'
import { MODEL_OPTIONS } from '../components/models'
import { slugBranch } from './branch'

interface Props {
  onClose: () => void
  onStarted: (ws: WorkspaceView) => Promise<void>
}

const FOCUSABLE = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled)'

export function OwnTaskDialog({ onClose, onStarted }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const [repos, setRepos] = useState<RepoView[] | null>(null)
  const [text, setText] = useState('')
  const [repoId, setRepoId] = useState('')
  const [edited, setEdited] = useState<string | null>(null)
  const [model, setModel] = useState<Model>('default')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const branch = edited ?? slugBranch(text)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    window.atril.repos.list().then((r) => {
      setRepos(r)
      if (r.length === 1 && r[0]) setRepoId(r[0].id)
    }, (e: unknown) => setError(String(e)))
    dialog.current?.querySelector('textarea')?.focus()
    return () => opener?.focus?.()
  }, [])

  const ready = text.trim() !== '' && repoId !== '' && branch.trim() !== '' && !busy

  const submit = async (): Promise<void> => {
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      const r = await window.atril.workspaces.open(repoId, branch.trim(), 'claude', model, text)
      if ('error' in r) return setError(r.error)
      await onStarted(r.workspace)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'Enter' && (e.metaKey || (e.target as HTMLElement).tagName === 'INPUT')) {
      e.preventDefault()
      void submit()
    }
    if (e.key === 'Tab') {
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) return
      const wrap = e.shiftKey ? document.activeElement === first && last : document.activeElement === last && first
      if (wrap) {
        e.preventDefault()
        wrap.focus()
      }
    }
  }

  return (
    <div className="modal" onKeyDown={onKeyDown}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="own-title" ref={dialog}>
        <h3 id="own-title">Nueva tarea</h3>
        <p>Escribe lo que hay que hacer: Libretto lo toma como petición y empieza por la spec.</p>

        <div className="f stack">
          <label htmlFor="own-text">¿Qué hay que hacer?</label>
          <textarea id="own-text" rows={5} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Añadir filtro de laboratorios al listado…" />
        </div>

        <div className="f">
          <label htmlFor="own-repo">Repo</label>
          <select id="own-repo" value={repoId} onChange={(e) => setRepoId(e.target.value)} disabled={!repos?.length}>
            {repoId === '' && <option value="">{repos?.length === 0 ? 'No hay repos registrados' : 'Elige un repo…'}</option>}
            {(repos ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </div>
        {repos?.length === 0 && <div className="f-note">Añade un repo en Trabajo para empezar</div>}

        <div className="f">
          <label htmlFor="own-branch">Rama</label>
          <input id="own-branch" value={branch} onChange={(e) => setEdited(e.target.value)} spellCheck={false} />
        </div>

        <div className="f">
          <label htmlFor="own-model">Modelo</label>
          <select id="own-model" value={model} onChange={(e) => setModel(e.target.value as Model)}>
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="f">
          <span className="lbl">Lanza</span>
          <code aria-label="Comando que se ejecutará">/libretto:libretto-flow «tu texto»</code>
        </div>

        {error && (
          <div className="bad" role="alert">
            {error}
          </div>
        )}

        <div className="btns">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn p" disabled={!ready} onClick={() => void submit()}>
            {busy ? 'Empezando…' : 'Empezar'}
          </button>
        </div>
      </div>
    </div>
  )
}
