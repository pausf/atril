import { useContext, useEffect, useState } from 'react'
import type { DoctorReport, ForgeId } from '../../preload/api'
import { NavigationContext } from '../settings/navigation'
import { useT } from '../ui'

/** Step 1's tools, plus a doctor that could not check; jira's CLI belongs to step 3, which is optional (W97). */
const CORE = ['git', 'tmux', 'claude', 'doctor']
const FORGES: ForgeId[] = ['github', 'gitlab']

interface Live {
  repos: boolean
  jira: boolean
  forge: boolean
}

/** W97: what a new person still has to do, read again each time Trabajo comes back on screen. */
export function Setup({ report, active, onTools, onNewWork, onDismiss }: {
  /** null while the doctor has not answered. */
  report: DoctorReport | null
  active: boolean
  onTools(): void
  onNewWork(): void
  onDismiss(): void
}) {
  const t = useT()
  // The way M35 goes to «Ajustes → Repos».
  const { openSettings: onSettings } = useContext(NavigationContext)
  const [live, setLive] = useState<Live | null>(null)

  useEffect(() => {
    if (!active) return
    let on = true
    const saved = (p: Promise<{ saved: boolean }>): Promise<boolean> => p.then((s) => s.saved, () => false)
    void Promise.all([
      window.atril.repos.list().then((r) => r.length > 0, () => false),
      saved(window.atril.settings.jira.status()),
      Promise.all(FORGES.map((f) => saved(window.atril.settings.forge.status(f)))).then((s) => s.includes(true))
    ]).then(([repos, jira, forge]) => on && setLive({ repos, jira, forge }))
    return () => {
      on = false
    }
  }, [active])

  const tools = report && !report.some((r) => !r.ok && CORE.includes(r.tool))
  const toSettings = t('Ir a Ajustes')
  const steps: { name: string; done?: boolean | null; optional?: boolean; note?: string; button: string; onClick(): void }[] = [
    { name: t('Herramientas listas'), done: report ? tools : null, note: report ? undefined : t('Comprobando…'), button: t('Ver qué falta'), onClick: onTools },
    { name: t('Añade un repo'), done: live?.repos ?? null, button: toSettings, onClick: onSettings },
    { name: t('Conecta Jira'), done: live?.jira ?? null, optional: true, button: toSettings, onClick: onSettings },
    { name: t('Conecta GitHub o GitLab'), done: live?.forge ?? null, optional: true, button: toSettings, onClick: onSettings },
    { name: t('Abre tu primer trabajo'), button: t('Nuevo trabajo'), onClick: onNewWork }
  ]

  return (
    <main className="col center">
      <section className="setup" aria-labelledby="setup-h">
        <h1 id="setup-h">{t('Primeros pasos')}</h1>
        <p className="setup-lead">{t('Lo que falta para tu primer trabajo. Cada paso se marca solo cuando lo haces.')}</p>
        <ol>
          {steps.map((s, i) => (
            <li key={s.name} className={s.done ? 'done' : undefined}>
              {s.done === undefined ? (
                <span className="setup-mark" aria-hidden="true">{i + 1}</span>
              ) : s.done === null ? (
                <span className="setup-mark" aria-hidden="true" />
              ) : (
                <span className="setup-mark" role="img" aria-label={s.done ? t('Hecho') : t('Pendiente')}>
                  {s.done ? '✓' : i + 1}
                </span>
              )}
              <span className="setup-name">{s.name}</span>
              {s.optional && <span className="setup-opt">{t('opcional')}</span>}
              {s.note && <span className="setup-opt">{s.note}</span>}
              <span className="sp" />
              {s.done === false || s.done === undefined ? (
                <button className={s.done === undefined ? 'btn p' : 'btn'} onClick={s.onClick}>
                  {s.button}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="setup-foot">
          <button className="linklike" onClick={onDismiss}>
            {t('Ya lo tengo')}
          </button>
        </div>
      </section>
    </main>
  )
}
