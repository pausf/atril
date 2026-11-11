import { useEffect, useState } from 'react'
import { CreateRepoDialog } from './CreateRepo'
import type { AddRepoResult, Listed, Mode, RepoView, StateProblem } from '../../preload/api'
import { fixLabel, Problem } from '../components/Problem'
import { useT } from '../ui'

const ID_RE = /^[a-z0-9-]+$/
type Choice = Mode | 'auto'

interface Pending {
  path: string
  id: string
  note: string
}

export function Repos() {
  const t = useT()
  const [repos, setRepos] = useState<RepoView[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  // S33: repos.json is damaged; nothing here may write it, so only the way to the file is offered.
  const [problem, setProblem] = useState<StateProblem | null>(null)
  const show = (r: Listed<RepoView>): void => {
    if (!Array.isArray(r)) return setProblem(r.problem)
    setProblem(null)
    setRepos(r)
  }
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=create-repo opens the dialog for a photo.
  useEffect(() => void window.atril.snapshotView().then((v) => v === 'create-repo' && setCreating(true)), [])

  useEffect(() => {
    window.atril.repos
      .list()
      .then(show)
      .catch((e: unknown) => setError(t('no se pudieron leer los repos: {detail}', { detail: String(e) })))
  }, [])

  const settle = async (r: AddRepoResult, path: string): Promise<void> => {
    if ('repo' in r) {
      setPending(null)
      setError(null)
      show(await window.atril.repos.list())
    } else if ('fix' in r) {
      setPending(null)
      setProblem(r)
    } else if (r.error === 'id-taken') {
      setPending({ path, id: r.suggested, note: t('Ya hay otro repo con ese nombre. Elige otro id.') })
    } else if (r.error === 'invalid-id') {
      setError(t('No se pudo derivar un id válido: usa solo a-z, 0-9 y guiones.'))
    } else {
      setPending(null)
      setError(t('Esa carpeta no es un repositorio git.'))
    }
  }

  const add = async (): Promise<void> => {
    try {
      const r = await window.atril.repos.add()
      if (r) await settle(r, r.path)
    } catch (e) {
      setError(String(e))
    }
  }

  const confirmId = async (): Promise<void> => {
    if (!pending || !ID_RE.test(pending.id)) return
    await settle(await window.atril.repos.addWithId(pending.path, pending.id), pending.path)
  }

  const choose = async (repo: RepoView, value: Choice): Promise<void> => {
    show(await window.atril.repos.setOverride(repo.id, value === 'auto' ? null : value))
  }

  const idValid = pending ? ID_RE.test(pending.id) : true

  return (
    <section className="scard" aria-labelledby="repos-h" data-tour="repos">
      <h3 id="repos-h">{t('Repos')}</h3>
      <p className="hint2">{t('Atril decide si cada trabajo va en un worktree o en la rama de tu copia. Puedes forzarlo.')}</p>
      {problem && (
        <Problem
          what={problem.error}
          cant={t('Atril no toca el archivo: arréglalo o quítalo y vuelve aquí.')}
          fix={fixLabel(t, problem.fix)}
          onFix={() => void window.atril.revealState(problem.file)}
          detail={problem.detail}
        />
      )}
      {!problem && repos.length === 0 && <p className="hint2">{t('Aún no hay ninguno: añade la carpeta de un repo git.')}</p>}
      <ul className="repo-rows">
        {!problem && repos.map((repo) => (
          <li key={repo.id}>
            <div className="grow">
              <b>{repo.id}</b>
              <div className="path">{repo.path}</div>
              {repo.mode === 'in-place' && <div className="why">{repo.reason}</div>}
            </div>
            <select aria-label={t('Modo de {id}', { id: repo.id })} title={repo.reason} value={repo.override ?? 'auto'} onChange={(e) => void choose(repo, e.target.value as Choice)}>
              <option value="auto">{t('Auto · {mode}', { mode: repo.mode })}</option>
              <option value="worktree">Worktree</option>
              <option value="in-place">In-place</option>
            </select>
          </li>
        ))}
      </ul>
      {pending && (
        <form
          className="idask"
          onSubmit={(e) => {
            e.preventDefault()
            void confirmId()
          }}
        >
          <label htmlFor="repo-id">{pending.note}</label>
          <div className="idrow">
            <input
              id="repo-id"
              value={pending.id}
              aria-invalid={!idValid}
              onChange={(e) => setPending({ ...pending, id: e.target.value })}
            />
            <button type="submit" className="pill" disabled={!idValid}>
              {t('Usar este id')}
            </button>
          </div>
          {!idValid && <div className="bad">{t('Solo minúsculas, números y guiones.')}</div>}
        </form>
      )}
      {error && <div className="bad">{error}</div>}
      {!problem && (
        <>
          <button type="button" className="pill add" onClick={() => void add()}>
            {t('＋ Añadir repo…')}
          </button>{' '}
          <button type="button" className="pill add" onClick={() => setCreating(true)}>
            {t('＋ Crear repo…')}
          </button>
        </>
      )}
      {creating && (
        <CreateRepoDialog
          onClose={() => setCreating(false)}
          onRegistered={() => void window.atril.repos.list().then(show)}
        />
      )}
    </section>
  )
}
