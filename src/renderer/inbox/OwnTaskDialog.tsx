import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Effort, Model, RepoView, WorkRefusal, WorkspaceView } from '../../preload/api'
import { effortOptions, modelOptions } from '../components/models'
import { fixLabel, Problem, sharedFix } from '../components/Problem'
import { useT } from '../ui'
import { slugBranch } from './branch'
import { ModePicker } from './ModePicker'
import { answers, Refine, withAnswers, type Asked } from './Refine'
import { suggest, type Suggestion } from './suggest'
import { SuggestLine } from './SuggestLine'

interface Props {
  /** «Nuevo trabajo» from Trabajo: without text the agent is plain Claude (I27). */
  textOptional?: boolean
  onClose: () => void
  onOpenSettings: () => void
  onStarted: (ws: WorkspaceView) => Promise<void>
}

const MAX_TEXT = 2000
const FOCUSABLE = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled)'

export function OwnTaskDialog({ textOptional = false, onClose, onOpenSettings, onStarted }: Props) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const [repos, setRepos] = useState<RepoView[] | null>(null)
  const [text, setText] = useState('')
  const [repoId, setRepoId] = useState('')
  const [edited, setEdited] = useState<string | null>(null)
  const [model, setModel] = useState<Model>('default')
  const [effort, setEffort] = useState<Effort>('default')
  const [auto, setAuto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // W130: a refusal main can get past with a worktree this once, or from Terminal in the repo.
  const [problem, setProblem] = useState<WorkRefusal | null>(null)
  const [busy, setBusy] = useState(false)
  const [fixed, setFixed] = useState(['', '', '', ''])
  const [asked, setAsked] = useState<Asked[]>([])
  const branch = edited ?? slugBranch(text)
  const suggestion = suggest(t, text)
  const use = (s: Suggestion): void => {
    setModel(s.model)
    setEffort(s.effort)
  }

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    window.atril.repos.list().then((r) => {
      if (!Array.isArray(r)) return setProblem(r.problem)
      setRepos(r)
      if (r.length === 1 && r[0]) setRepoId(r[0].id)
    }, (e: unknown) => setError(String(e)))
    dialog.current?.querySelector('textarea')?.focus()
    return () => opener?.focus?.()
  }, [])

  const blank = text.trim() === ''
  const pairs = answers(t, fixed, asked)
  const composed = withAnswers(text, pairs)
  // I33: main refuses past 2000; the dialog says so before Empezar.
  const tooLong = !blank && composed.length > MAX_TEXT
  const title = textOptional ? t('Nuevo trabajo') : t('Nueva tarea')
  const ready = (textOptional || !blank) && repoId !== '' && branch.trim() !== '' && !busy && !tooLong

  const submit = async (worktree = false): Promise<void> => {
    if (!ready) return
    setBusy(true)
    setError(null)
    setProblem(null)
    try {
      const args: Parameters<typeof window.atril.workspaces.open> = [repoId, branch.trim(), 'claude', model, blank ? undefined : composed, !blank && auto, worktree, effort === 'default' ? undefined : effort]
      // Trailing options left unset are not sent: main reads a missing argument as off.
      while (args.length > 4 && (args.at(-1) === undefined || args.at(-1) === false)) args.pop()
      const r = await window.atril.workspaces.open(...args)
      if ('error' in r) return r.fix ? setProblem(r) : setError(r.error)
      await onStarted(r.workspace)
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

        {!blank && <Refine fixed={fixed} onFixed={setFixed} asked={asked} onAsked={setAsked} count={pairs.length} />}

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

        <div className="f">
          <label htmlFor="own-effort">{t('Esfuerzo')}</label>
          <select id="own-effort" value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
            {effortOptions(t).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <SuggestLine suggestion={suggestion} model={model} effort={effort} onUse={use} />

        {!blank && <ModePicker auto={auto} onChange={setAuto} />}

        <div className="f">
          <span className="lbl">{t('Lanza')}</span>
          <code className="launch" aria-label={t('Comando que se ejecutará')}>{blank && textOptional
              ? 'claude'
              : blank
                ? auto ? t('/libretto:libretto-attacca «tu texto»') : t('/libretto:libretto-flow «tu texto»')
                : auto ? t('/libretto:libretto-attacca «{text}»', { text: composed }) : t('/libretto:libretto-flow «{text}»', { text: composed })}</code>
        </div>

        {problem && (
          <Problem
            what={problem.error}
            cant={t('No he creado el trabajo.')}
            fix={fixLabel(t, problem.fix)}
            busy={busy}
            onFix={() => sharedFix(problem.fix, onOpenSettings) || void (problem.fix === 'worktree' ? submit(true) : problem.fix === 'reveal' ? window.atril.revealState(problem.file ?? 'repos') : openTerminal())}
            detail={problem.detail ?? ''}
          />
        )}
        {tooLong && (
          <div className="bad" role="alert">
            {t('Con las respuestas pasa de 2000 caracteres: acorta algo.')}
          </div>
        )}
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
