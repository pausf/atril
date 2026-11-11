import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { JiraIssue, Model, RepoView, StartProposal, WorkFix, WorkspaceView } from '../../preload/api'
import { Icon } from '../components/Icon'
import { modelOptions } from '../components/models'
import { Problem } from '../components/Problem'
import { ModePicker } from './ModePicker'
import { useT } from '../ui'

interface Props {
  issue: JiraIssue
  onClose: () => void
  /** The workspace exists: refresh lists. Returns once the app knows about it. */
  onStarted: (ws: WorkspaceView) => Promise<void>
  onOpenWorkspace: (id: string) => void
}

const FOCUSABLE = 'button:not(:disabled), select:not(:disabled), input:not(:disabled)'

export function StartDialog({ issue, onClose, onStarted, onOpenWorkspace }: Props) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const lastRepo = useRef<string | undefined>(undefined)
  const [repos, setRepos] = useState<RepoView[] | null>(null)
  const [repoId, setRepoId] = useState('')
  const [branch, setBranch] = useState('')
  const [model, setModel] = useState<Model>('default')
  const [auto, setAuto] = useState(false)
  const [proposal, setProposal] = useState<StartProposal | null>(null)
  const [error, setError] = useState<string | null>(null)
  // W130: a refusal with its way past (a worktree this once, or Terminal in the repo).
  const [problem, setProblem] = useState<{ error: string; detail?: string; fix?: WorkFix } | null>(null)
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState<{ ws: WorkspaceView; text: string } | null>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    window.atril.repos.list().then(setRepos, (e: unknown) => setError(String(e)))
    return () => opener?.focus?.()
  }, [])

  // The repo decides the branch (taken names get a suffix); the model only changes the command line.
  useEffect(() => {
    void window.atril.jira.proposeStart(issue, repoId || undefined, model, auto).then((p) => {
      if ('error' in p) return setError(p.error)
      setProposal(p)
      if (p.repoId && !repoId) setRepoId(p.repoId)
      if (p.branch && lastRepo.current !== p.repoId) setBranch(p.branch)
      lastRepo.current = p.repoId
    })
  }, [issue, repoId, model, auto])

  useEffect(() => dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), [repos])

  const ready = repoId !== '' && branch.trim() !== '' && !busy && !warning

  const submit = async (worktree = false): Promise<void> => {
    if (!ready) return
    setBusy(true)
    setError(null)
    setProblem(null)
    try {
      const r = await window.atril.jira.start({ key: issue.key, components: issue.components, group: issue.group, repoId, branch: branch.trim(), model, ...(auto && { auto: true }), ...(worktree && { worktree: true }) })
      if ('error' in r) return r.fix ? setProblem(r) : setError(r.error)
      await onStarted(r.workspace)
      if (r.transitionError) setWarning({ ws: r.workspace, text: r.transitionError })
      else onOpenWorkspace(r.workspace.id)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const openTerminal = async (): Promise<void> => {
    const r = await window.atril.workspaces.terminal({ repoId })
    if ('error' in r) setError(r.error)
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
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
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="start-title" ref={dialog}>
        <h3 id="start-title">{t('Empezar {key}', { key: issue.key })}</h3>
        <p>{issue.summary}</p>

        <div className="f">
          <label htmlFor="start-repo">{t('Repo')}</label>
          <select id="start-repo" value={repoId} onChange={(e) => setRepoId(e.target.value)} disabled={!repos?.length || !!warning}>
            {repoId === '' && <option value="">{repos?.length === 0 ? t('No hay repos registrados') : t('Elige un repo…')}</option>}
            {(repos ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </div>
        {repos?.length === 0 && <div className="f-note">{t('Registra un repo con «Añadir repo…» en Trabajo y vuelve a empezar.')}</div>}
        {repos && repos.length > 0 && !proposal?.repoId && repoId === '' && (
          <div className="f-note">{t('Es la primera tarea de {project}: elige repo y Atril lo recordará.', { project: `${issue.key.slice(0, issue.key.lastIndexOf('-'))}${issue.components[0] ? ` / ${issue.components[0]}` : ''}` })}</div>
        )}

        <div className="f">
          <label htmlFor="start-branch">{t('Rama')}</label>
          <input id="start-branch" value={branch} onChange={(e) => setBranch(e.target.value)} disabled={!!warning} spellCheck={false} />
        </div>
        {proposal?.note && <div className="f-note">{proposal.note}</div>}

        <div className="f">
          <span className="lbl">{t('Dónde')}</span>
          <span>
            {proposal?.mode ? (
              <>
                <span className={proposal.mode === 'in-place' ? 'mode ip' : 'mode'}>
                  <Icon name={proposal.mode} size={14} /> {proposal.mode}
                </span>{' '}
                <span className="why-inline">{proposal.reason}</span>
              </>
            ) : (
              <span className="why-inline">{t('Depende del repo')}</span>
            )}
          </span>
        </div>

        <div className="f">
          <label htmlFor="start-model">{t('Modelo')}</label>
          <select id="start-model" value={model} onChange={(e) => setModel(e.target.value as Model)} disabled={!!warning}>
            {modelOptions(t).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <ModePicker auto={auto} onChange={setAuto} disabled={!!warning} />

        <div className="f">
          <span className="lbl">{t('Lanza')}</span>
          <code aria-label={t('Comando que se ejecutará')}>{proposal?.command ?? '…'}</code>
        </div>
        <div className="f">
          <span className="lbl">Jira</span>
          <span className="why-inline">{issue.group === 'doing' ? t('ya está en curso') : t('pasará a In Progress')}</span>
        </div>

        {problem && (
          <Problem
            what={problem.error}
            cant={t('No he creado el trabajo.')}
            fix={problem.fix === 'worktree' ? t('Usar un worktree esta vez') : t('Abrir en Terminal')}
            busy={busy}
            onFix={() => void (problem.fix === 'worktree' ? submit(true) : openTerminal())}
            detail={problem.detail ?? ''}
          />
        )}
        {error && (
          <div className="bad" role="alert">
            {error}
          </div>
        )}
        {warning && (
          <div className="bad" role="alert">
            {t('El trabajo está en marcha, pero {detail}', { detail: warning.text.charAt(0).toLowerCase() + warning.text.slice(1) })}
          </div>
        )}

        <div className="btns">
          {warning ? (
            <button type="button" className="btn p" onClick={() => onOpenWorkspace(warning.ws.id)}>
              {t('Ir al trabajo')}
            </button>
          ) : (
            <>
              <button type="button" className="btn" onClick={onClose}>
                {t('Cancelar')}
              </button>
              <button type="button" className="btn p" disabled={!ready} onClick={() => void submit()}>
                {busy ? t('Empezando…') : t('Empezar')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
