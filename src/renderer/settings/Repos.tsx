import { useEffect, useRef, useState } from 'react'
import { CreateRepoDialog } from './CreateRepo'
import type { AddRepoResult, Listed, Mode, PathProblem, RepoResult, RepoView, StateProblem } from '../../preload/api'
import { fixLabel, Problem } from '../components/Problem'
import { HarnessCard } from '../harness/HarnessCard'
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
  // W444–W446: the typed path, the refusal of its last add, and a ticket that dates every send and every edit.
  const [text, setText] = useState('')
  const [pathProblem, setPathProblem] = useState<PathProblem | null>(null)
  const ticket = useRef(0)
  // W286: each row owns its card; the ids whose card is open.
  const [harness, setHarness] = useState<ReadonlySet<string>>(new Set())
  const flip = (id: string): void =>
    setHarness((open) => {
      const next = new Set(open)
      if (!next.delete(id)) next.add(id)
      return next
    })
  // S33: repos.json is damaged; nothing here may write it, so only the way to the file is offered.
  const [problem, setProblem] = useState<StateProblem | null>(null)
  // S35: a refused remove or relocate, shown under its row.
  const [refusal, setRefusal] = useState<{ id: string; error: string } | null>(null)
  const show = (r: Listed<RepoView>): void => {
    if (!Array.isArray(r)) return setProblem(r.problem)
    setProblem(null)
    setRepos(r)
  }
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=create-repo opens the dialog for a photo.
  useEffect(() => void window.atril.snapshotView().then((v) => v === 'create-repo' && setCreating(true)), [])
  // ponytail: dev-only, ATRIL_SNAPSHOT_VIEW=ajustes-harness opens every healthy repo's Harness card for a photo.
  useEffect(() => {
    void window.atril.snapshotView().then(async (v) => {
      if (v !== 'ajustes-harness') return
      const all = await window.atril.repos.list()
      if (Array.isArray(all)) setHarness(new Set(all.filter((r) => r.health === 'ok').map((r) => r.id)))
    })
  }, [])

  useEffect(() => {
    window.atril.repos
      .list()
      .then(show)
      .catch((e: unknown) => setError(t('could not read the repos: {detail}', { detail: String(e) })))
  }, [])

  const settle = async (r: AddRepoResult, path: string): Promise<void> => {
    if ('repo' in r) {
      setPending(null)
      setError(null)
      setText('')
      show(await window.atril.repos.list())
    } else if ('fix' in r) {
      setPending(null)
      setProblem(r)
    } else if (r.error === 'id-taken') {
      setPending({ path, id: r.suggested, note: t('There is already a repo with that name. Pick another id.') })
    } else if (r.error === 'invalid-id') {
      setError(t('Could not derive a valid id: use only a-z, 0-9 and hyphens.'))
    } else {
      setPending(null)
      setError(t('That folder is not a git repository.'))
    }
  }

  const add = async (): Promise<void> => {
    setPathProblem(null)
    try {
      const r = await window.atril.repos.add()
      if (r) await settle(r, r.path)
    } catch (e) {
      setError(String(e))
    }
  }

  // W444–W446: the window sends the text as typed; main decides what it is. An answer for text edited since is dropped.
  const addTyped = async (): Promise<void> => {
    const mine = ++ticket.current
    setError(null)
    setPathProblem(null)
    try {
      const r = await window.atril.repos.addPath(text)
      if (mine !== ticket.current) return
      if ('what' in r) return setPathProblem(r)
      await settle(r, r.path)
    } catch (e) {
      if (mine === ticket.current) setError(String(e))
    }
  }

  const confirmId = async (): Promise<void> => {
    if (!pending || !ID_RE.test(pending.id)) return
    await settle(await window.atril.repos.addWithId(pending.path, pending.id), pending.path)
  }

  const choose = async (repo: RepoView, value: Choice): Promise<void> => {
    show(await window.atril.repos.setOverride(repo.id, value === 'auto' ? null : value))
  }

  const settleRow = async (id: string, r: RepoResult | null): Promise<void> => {
    if (r === null) return
    if ('fix' in r) return setProblem(r)
    if ('error' in r) return setRefusal({ id, error: r.error })
    setRefusal(null)
    show(await window.atril.repos.list())
  }

  const idValid = pending ? ID_RE.test(pending.id) : true

  return (
    <section className="scard" aria-labelledby="repos-h" data-tour="repos">
      <h3 id="repos-h">{t('Repos')}</h3>
      <p className="hint2">{t('Atril decides whether each workspace goes in a worktree or on the branch of your copy. You can force it.')}</p>
      {problem && (
        <Problem
          what={problem.error}
          cant={t('Atril leaves the file alone: fix it or move it away and come back here.')}
          fix={fixLabel(t, problem.fix)}
          onFix={() => void window.atril.revealState(problem.file)}
          detail={problem.detail}
        />
      )}
      {!problem && repos.length === 0 && <p className="hint2">{t('None yet: add the folder of a git repo.')}</p>}
      <ul className="repo-rows">
        {!problem && repos.map((repo) => (
          <li key={repo.id}>
            <div className="grow">
              <b>{repo.id}</b>
              <div className="path" title={repo.path}>
                <bdi>{repo.path}</bdi>
              </div>
              {repo.mode === 'in-place' && <div className="why">{repo.reason}</div>}
            </div>
            {repo.health === 'missing' || repo.health === 'not-git' ? (
              <>
                <span className="bad">{repo.health === 'missing' ? t('Folder not found') : t('Not a git repo')}</span>
                <button type="button" className="pill" onClick={() => void window.atril.repos.relocate(repo.id).then((r) => settleRow(repo.id, r))}>
                  {t('Find the folder…')}
                </button>
              </>
            ) : (
              <select aria-label={t('Mode of {id}', { id: repo.id })} title={repo.reason} value={repo.override ?? 'auto'} onChange={(e) => void choose(repo, e.target.value as Choice)}>
                <option value="auto">{t('Auto · {mode}', { mode: repo.mode })}</option>
                <option value="worktree">Worktree</option>
                <option value="in-place">In-place</option>
              </select>
            )}
            <button type="button" className="pill" onClick={() => void window.atril.repos.remove(repo.id).then((r) => settleRow(repo.id, r))}>
              {t('Remove the repo')}
            </button>
            {repo.health === 'ok' && (
              <button type="button" className="pill" aria-expanded={harness.has(repo.id)} aria-label={t('Harness of {id}', { id: repo.id })} onClick={() => flip(repo.id)}>
                {t('Harness')}
              </button>
            )}
            {refusal?.id === repo.id && (
              <Problem what={refusal.error} cant={t('{id} stays as it was.', { id: repo.id })} detail="" onClose={() => setRefusal(null)} />
            )}
            {repo.health === 'ok' && harness.has(repo.id) && <HarnessCard repoId={repo.id} />}
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
              {t('Use this id')}
            </button>
          </div>
          {!idValid && <div className="bad">{t('Only lowercase letters, numbers and hyphens.')}</div>}
        </form>
      )}
      {error && <div className="bad">{error}</div>}
      {!problem && (
        <>
          <form
            className="idask"
            onSubmit={(e) => {
              e.preventDefault()
              void addTyped()
            }}
          >
            <div className="idrow">
              <input
                id="repo-path"
                aria-label={t('Path of a git repo')}
                placeholder="~/code/my-repo"
                spellCheck={false}
                value={text}
                onChange={(e) => {
                  ticket.current++
                  setText(e.target.value)
                  setPathProblem(null)
                }}
              />
              <button type="submit" className="pill" disabled={text.trim() === ''}>
                {t('Add this path')}
              </button>
            </div>
          </form>
          {pathProblem && (
            <Problem
              what={pathProblem.what}
              cant={t('Nothing was added.')}
              fix={pathProblem.fix === 'pick' ? t('Choose a folder…') : fixLabel(t, 'git')}
              onFix={() => (pathProblem.fix === 'pick' ? void add() : void window.atril.installTool('git'))}
              detail={pathProblem.detail}
            />
          )}
          <button type="button" className="pill add" onClick={() => void add()}>
            {t('＋ Add repo…')}
          </button>{' '}
          <button type="button" className="pill add" onClick={() => setCreating(true)}>
            {t('＋ Create repo…')}
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
