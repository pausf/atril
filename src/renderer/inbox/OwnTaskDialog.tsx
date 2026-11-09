import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Model, RepoView, WorkspaceView } from '../../preload/api'
import { modelOptions } from '../components/models'
import { useT } from '../ui'
import { slugBranch } from './branch'
import { ModePicker } from './ModePicker'

interface Props {
  /** «Nuevo trabajo» from Trabajo: without text the agent is plain Claude (I27). */
  textOptional?: boolean
  onClose: () => void
  onOpenSettings: () => void
  onStarted: (ws: WorkspaceView) => Promise<void>
}

const FOCUSABLE = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled)'

export function OwnTaskDialog({ textOptional = false, onClose, onOpenSettings, onStarted }: Props) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const [repos, setRepos] = useState<RepoView[] | null>(null)
  const [text, setText] = useState('')
  const [repoId, setRepoId] = useState('')
  const [edited, setEdited] = useState<string | null>(null)
  const [model, setModel] = useState<Model>('default')
  const [auto, setAuto] = useState(false)
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

  const blank = text.trim() === ''
  const title = textOptional ? t('Nuevo trabajo') : t('Nueva tarea')
  const ready = (textOptional || !blank) && repoId !== '' && branch.trim() !== '' && !busy

  const submit = async (): Promise<void> => {
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      const r = await (blank
        ? window.atril.workspaces.open(repoId, branch.trim(), 'claude', model)
        : auto ? window.atril.workspaces.open(repoId, branch.trim(), 'claude', model, text, true) : window.atril.workspaces.open(repoId, branch.trim(), 'claude', model, text))
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
        <h3 id="own-title">{title}</h3>
        <p>
          {textOptional
            ? t('Con texto, Libretto lo toma como petición y empieza por la spec; sin texto, abre Claude a secas.')
            : t('Escribe lo que hay que hacer: Libretto lo toma como petición y empieza por la spec.')}
        </p>

        <div className="f stack">
          <label htmlFor="own-text">{textOptional ? t('¿Qué hay que hacer? (opcional)') : t('¿Qué hay que hacer?')}</label>
          <textarea id="own-text" rows={5} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Añadir filtro de laboratorios al listado…')} />
        </div>

        <div className="f">
          <label htmlFor="own-repo">{t('Repo')}</label>
          <select id="own-repo" value={repoId} onChange={(e) => setRepoId(e.target.value)} disabled={!repos?.length}>
            {repoId === '' && <option value="">{repos?.length === 0 ? t('No hay repos registrados') : t('Elige un repo…')}</option>}
            {(repos ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </div>
        {repos?.length === 0 && (
          <div className="f-note">
            {t('Añade un repo en Ajustes → Repos')}{' '}
            <button type="button" className="linklike" onClick={onOpenSettings}>
              {t('Ir a Ajustes')}
            </button>
          </div>
        )}

        <div className="f">
          <label htmlFor="own-branch">{t('Rama')}</label>
          <input id="own-branch" value={branch} onChange={(e) => setEdited(e.target.value)} spellCheck={false} />
        </div>

        <div className="f">
          <label htmlFor="own-model">{t('Modelo')}</label>
          <select id="own-model" value={model} onChange={(e) => setModel(e.target.value as Model)}>
            {modelOptions(t).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {!blank && <ModePicker auto={auto} onChange={setAuto} />}

        <div className="f">
          <span className="lbl">{t('Lanza')}</span>
          <code aria-label={t('Comando que se ejecutará')}>{blank && textOptional ? 'claude' : auto ? t('/libretto:libretto-attacca «tu texto»') : t('/libretto:libretto-flow «tu texto»')}</code>
        </div>

        {error && (
          <div className="bad" role="alert">
            {error}
          </div>
        )}

        <div className="btns">
          <button type="button" className="btn" onClick={onClose}>
            {t('Cancelar')}
          </button>
          <button type="button" className="btn p" disabled={!ready} onClick={() => void submit()}>
            {busy ? t('Empezando…') : t('Empezar')}
          </button>
        </div>
      </div>
    </div>
  )
}
