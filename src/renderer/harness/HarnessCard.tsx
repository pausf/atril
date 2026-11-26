import { useEffect, useRef, useState } from 'react'
import type { HarnessItem } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT } from '../ui'

type State = { items: HarnessItem[] } | { failed: string } | null
const GROUPS = ['context', 'verification', 'guardrails'] as const

/** W286: what this repo has of an agent harness, and what it lacks. Read-only: nothing here fixes anything. */
export function HarnessCard({ repoId }: { repoId: string }) {
  const t = useT()
  const [state, setState] = useState<State>(null)
  const [attempt, setAttempt] = useState(0)
  const seq = useRef(0)

  // A reply counts only while it is the latest read of a card that is still open.
  useEffect(() => {
    const mine = ++seq.current
    setState(null)
    window.atril.harness.get(repoId).then(
      (r) => {
        if (mine === seq.current) setState('items' in r ? r : { failed: r.error })
      },
      (e: unknown) => {
        if (mine === seq.current) setState({ failed: String(e) })
      }
    )
    return () => {
      seq.current += 1
    }
  }, [repoId, attempt])

  const words = (id: HarnessItem['id']): { name: string; why: string } => {
    switch (id) {
      case 'memory':
        return { name: t('Agent memory (CLAUDE.md or AGENTS.md)'), why: t('The agent reads it at the start of every session: what the project is and how to work in it.') }
      case 'skills':
        return { name: t('Skills'), why: t('Reusable procedures the agent can load on demand instead of working them out again.') }
      case 'lint':
        return { name: t('Lint script'), why: t('A fast check the agent can run to catch style slips and simple bugs.') }
      case 'typecheck':
        return { name: t('Typecheck script'), why: t('Catches whole classes of mistakes before the code runs.') }
      case 'test':
        return { name: t('Test script'), why: t('Lets the agent prove a change works instead of saying it does.') }
      case 'precommit':
        return { name: t('Pre-commit hook'), why: t('Refuses a bad commit on your machine, before anyone else sees it.') }
      case 'ci':
        return { name: t('CI workflows'), why: t('Runs the checks again on every push, on a machine that is not yours.') }
      case 'hooks':
        return { name: t('Claude Code hooks'), why: t('Run your own scripts before or after the agent acts: a rule that is enforced, not just written.') }
      case 'permissions':
        return { name: t('Permission rules'), why: t('Say which commands the agent may run without asking, and which never.') }
      case 'prepush':
        return { name: t('Pre-push hook'), why: t('The last stop on your machine before code leaves it.') }
    }
  }

  const detail = (i: HarnessItem): string | undefined => {
    if (i.detail === 'unreadable') return t('Could not read the file')
    if (i.id === 'memory' && i.detail) {
      if (i.big) return t('{file} · over 1 MB', { file: i.detail })
      if (i.n === 1) return t('{file} · 1 line', { file: i.detail })
      if (i.n !== undefined) return t('{file} · {n} lines', { file: i.detail, n: i.n })
    }
    if (i.id === 'skills' && i.n !== undefined) return i.n === 1 ? t('1 skill') : t('{n} skills', { n: i.n })
    return i.detail
  }

  const groupName = (g: (typeof GROUPS)[number]): string => (g === 'context' ? t('Context') : g === 'verification' ? t('Verification') : t('Guardrails'))

  if (state === null) return <p className="hint2 harness">{t('Reading the repo…')}</p>
  if ('failed' in state) {
    return (
      <div className="harness">
        <Problem
          what={t('Could not read the files of this repo.')}
          cant={t('Nothing was changed.')}
          fix={t('Check again')}
          onFix={() => setAttempt((a) => a + 1)}
          detail={state.failed}
        />
      </div>
    )
  }

  const found = state.items.filter((i) => i.ok).length
  return (
    <div className="harness">
      <b>{t('Harness · {n} of {m}', { n: found, m: state.items.length })}</b>
      {GROUPS.map((g) => (
        <section key={g}>
          <h4>{groupName(g)}</h4>
          <ul>
            {state.items
              .filter((i) => i.group === g)
              .map((i) => {
                const w = words(i.id)
                const d = detail(i)
                return (
                  <li key={i.id} className={i.ok ? 'hz-found' : 'hz-gap'}>
                    <span className="hz-mark" aria-hidden="true">
                      {i.ok ? '✓' : '✗'}
                    </span>
                    <div className="hz-body">
                      <b>{w.name}</b> <span className="hz-state">{i.ok ? t('Found') : t('Missing')}</span>
                      {d && <div className="hz-detail">{d}</div>}
                      <div className="hz-why">{w.why}</div>
                    </div>
                    {!i.ok && i.doc && (
                      <button type="button" className="pill" aria-label={t('How to set it up: {name}', { name: w.name })} onClick={() => void window.atril.harness.doc(i.id)}>
                        {t('How to set it up')}
                      </button>
                    )}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </div>
  )
}
