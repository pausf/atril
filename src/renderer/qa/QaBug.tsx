import { useEffect, useRef, useState } from 'react'
import type { QaCriterion, QaEntry, QaReport } from '../../preload/api'
import { useT } from '../ui'
import { useModalKeys } from '../flow/modalKeys'
import { platformLabel } from './kinds'

/** W117, W118: a bug prefilled from the failed criterion; nothing leaves until a button is pressed. */
export function QaBug({ workspaceId, report, criterion, entry, onClose }: { workspaceId: string; report: QaReport; criterion: QaCriterion; entry: QaEntry; onClose: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const keys = useModalKeys(dialog, onClose)
  const [title, setTitle] = useState(`QA ${report.branch}: ${entry.note || criterion.text}`)
  const [steps, setSteps] = useState(entry.steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n'))
  const [env, setEnv] = useState([report.target && platformLabel(t, report.target.platform), report.target?.dir, report.branch, report.head].filter(Boolean).join(' · '))
  const [crit, setCrit] = useState(`${criterion.id}: ${criterion.text}`)
  const [board, setBoard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ jira: string | null; agent: boolean }>({ jira: null, agent: false })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void window.atril.settings.jira.status().then((s) => live && setBoard(s.saved && s.board !== undefined), () => undefined)
    return () => {
      live = false
    }
  }, [])

  const send = async (to: 'jira' | 'agent'): Promise<void> => {
    setBusy(true)
    setError(null)
    const body = `${t('Criterio')}: ${crit}\n\n${t('Pasos')}:\n${steps}\n\n${t('Entorno')}: ${env}`
    const r = await window.atril.qa.bug(workspaceId, { to, title, body })
    setBusy(false)
    if ('error' in r) setError(r.error)
    else if ('key' in r) setDone((d) => ({ ...d, jira: r.key }))
    else setDone((d) => ({ ...d, agent: true }))
  }
  const sent = done.jira !== null || done.agent

  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg qa-dlg" role="dialog" aria-modal="true" aria-labelledby="qa-bug-title" ref={dialog} tabIndex={-1}>
        <div className="qa-dhead">
          <h3 id="qa-bug-title">{t('Marcar como bug')}</h3>
          <button type="button" className="btn" onClick={onClose}>
            {t('Cerrar')}
          </button>
        </div>
        <p className="qa-sub">{t('Prellenado con lo que vio el agente.')}</p>
        <div className="f stack">
          <label htmlFor="qa-b-title">{t('Título')}</label>
          <input id="qa-b-title" value={title} spellCheck={false} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="f stack">
          <label htmlFor="qa-b-steps">{t('Pasos')}</label>
          <textarea id="qa-b-steps" rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </div>
        <div className="f stack">
          <label htmlFor="qa-b-env">{t('Entorno')}</label>
          <input id="qa-b-env" value={env} spellCheck={false} onChange={(e) => setEnv(e.target.value)} />
        </div>
        <div className="f stack">
          <label htmlFor="qa-b-crit">{t('Criterio')}</label>
          <textarea id="qa-b-crit" rows={2} value={crit} onChange={(e) => setCrit(e.target.value)} />
        </div>
        {error && (
          <p className="qa-err" role="alert">
            {error}
          </p>
        )}
        {sent && (
          <div className="saved" role="status">
            {done.jira !== null ? t('Creada {key}', { key: done.jira }) : t('Enviado al agente')}
          </div>
        )}
        <div className="btns">
          <button type="button" className="btn" onClick={onClose}>
            {t('Cancelar')}
          </button>
          <button type="button" className="btn" disabled={busy || done.agent || title.trim() === ''} onClick={() => void send('agent')}>
            {t('Pasar al agente del trabajo')}
          </button>
          {board && (
            <button type="button" className="btn p" disabled={busy || done.jira !== null || title.trim() === ''} onClick={() => void send('jira')}>
              {t('Crear en Jira')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
