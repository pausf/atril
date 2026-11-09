import { useEffect, useState } from 'react'
import type { AddRepoResult, Agent, Mode, RepoView } from '../../preload/api'

const ID_RE = /^[a-z0-9-]+$/
type Choice = Mode | 'auto'
const CHOICES: ReadonlyArray<{ value: Choice; label: string }> = [
  { value: 'worktree', label: 'worktree' },
  { value: 'in-place', label: 'in-place' },
  { value: 'auto', label: 'automático' }
]

interface Pending {
  path: string
  id: string
  note: string
}

function NewWork({ repoId, onCreate }: { repoId: string; onCreate: (repoId: string, branch: string, agent: Agent) => Promise<string | null> }) {
  const [open, setOpen] = useState(false)
  const [branch, setBranch] = useState('')
  const agent: Agent = 'claude'
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" className="pill add" onClick={() => setOpen(true)}>
        Nuevo trabajo
      </button>
    )
  }
  return (
    <form
      className="idask"
      onSubmit={(e) => {
        e.preventDefault()
        void onCreate(repoId, branch.trim(), agent).then((err) => {
          setError(err)
          if (!err) {
            setOpen(false)
            setBranch('')
          }
        })
      }}
    >
      <div className="idrow">
        <input aria-label={`Rama de ${repoId}`} placeholder="feat/mi-rama" value={branch} onChange={(e) => setBranch(e.target.value)} />
      </div>
      <div className="idrow">
        <button type="submit" className="pill" disabled={branch.trim() === ''}>
          Crear
        </button>
        <button type="button" className="pill" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
      {error && <div className="bad">{error}</div>}
    </form>
  )
}

export function Repos({ onCreate }: { onCreate: (repoId: string, branch: string, agent: Agent) => Promise<string | null> }) {
  const [repos, setRepos] = useState<RepoView[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.atril.repos
      .list()
      .then(setRepos)
      .catch((e: unknown) => setError(`no se pudieron leer los repos: ${String(e)}`))
  }, [])

  const settle = async (r: AddRepoResult, path: string): Promise<void> => {
    if ('repo' in r) {
      setPending(null)
      setError(null)
      setRepos(await window.atril.repos.list())
    } else if (r.error === 'id-taken') {
      setPending({ path, id: r.suggested, note: 'Ya hay otro repo con ese nombre. Elige otro id.' })
    } else if (r.error === 'invalid-id') {
      setError('No se pudo derivar un id válido: usa solo a-z, 0-9 y guiones.')
    } else {
      setPending(null)
      setError('Esa carpeta no es un repositorio git.')
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
    setRepos(await window.atril.repos.setOverride(repo.id, value === 'auto' ? null : value))
  }

  const idValid = pending ? ID_RE.test(pending.id) : true

  return (
    <div className="repos">
      <h3>Repos</h3>
      {repos.length === 0 && (
        <div className="empty">Registra la carpeta de un repo y Atril decidirá si cada trabajo va en un worktree o en su rama.</div>
      )}
      {repos.map((repo) => {
        const current: Choice = repo.override ?? 'auto'
        return (
          <div className="repo-item" key={repo.id}>
            <div className="repo">
              <span>{repo.id}</span>
              <span className={repo.mode === 'in-place' ? 'mode ip' : 'mode'}>{repo.mode}</span>
            </div>
            <div className="why">{repo.reason}</div>
            <div className="seg" role="group" aria-label={`Modo de ${repo.id}`}>
              {CHOICES.map((c) => (
                <button key={c.value} type="button" aria-pressed={current === c.value} onClick={() => void choose(repo, c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
            <NewWork repoId={repo.id} onCreate={onCreate} />
          </div>
        )
      })}
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
              Usar este id
            </button>
          </div>
          {!idValid && <div className="bad">Solo minúsculas, números y guiones.</div>}
        </form>
      )}
      {error && <div className="bad">{error}</div>}
      <button type="button" className="pill add" onClick={() => void add()}>
        ＋ Añadir repo…
      </button>
    </div>
  )
}
