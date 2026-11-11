import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'
import { useT } from '../ui'

type Saved = { saved: false } | { saved: true; account?: string; site?: string }

/** S29: «Cargando…», «Sin conectar» or «Conectado · cuenta», plus the site when there is one. */
export function useConnectionState(status: Saved | null, withSite: boolean): string {
  const t = useT()
  if (!status) return t('Cargando…')
  if (!status.saved) return t('Sin conectar')
  const site = withSite && status.site ? ` · ${status.site.replace(/^https:\/\//, '')}` : ''
  return t('Conectado · {account}', { account: status.account ?? '' }) + site
}

/** S29: one row per service; its body shows only once the row's single button is pressed. */
export function ConnectionRow(p: {
  id: string
  name: string
  purpose: string
  state: string
  saved: boolean | null
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const t = useT()
  return (
    <section className="conn" aria-labelledby={`${p.id}-h`}>
      <div className="conn-head">
        <span className={p.saved ? 'conn-dot on' : 'conn-dot'} aria-hidden />
        <div className="conn-id">
          <h3 id={`${p.id}-h`}>{p.name}</h3>
          <p>{p.purpose}</p>
        </div>
        <span className="conn-state">{p.state}</span>
        {p.saved !== null && (
          <button type="button" className="btn" aria-expanded={p.open} aria-controls={`${p.id}-body`} onClick={p.onToggle}>
            {p.saved ? t('Gestionar') : t('Conectar')}
          </button>
        )}
      </div>
      {p.open && p.saved !== null && (
        <div className="conn-body" id={`${p.id}-body`}>
          {p.children}
        </div>
      )}
    </section>
  )
}

/** A labelled input whose error, if any, sits right under it and describes it. */
export function Field({ id, label, error, ...input }: { id: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="srow">
      <label htmlFor={id}>{label}</label>
      <div className="sfield">
        <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} autoComplete="off" spellCheck={false} {...input} />
        {error && (
          <div id={`${id}-err`} className="serr">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

/** S30: create the token, paste it, check and save — numbered, inside the row. */
export function ConnectSteps(p: {
  createLabel: string
  createNote: string
  onCreate: () => void
  fields: ReactNode
  error: string | null
  /** S32: the technical code, folded under «Ver detalle». */
  detail?: string
  checking: boolean
  onCancel?: () => void
  onSubmit: (e: FormEvent) => void
}) {
  const t = useT()
  return (
    <form className="steps-form" noValidate onSubmit={p.onSubmit}>
      <ol className="steps">
        <li>
          <b>{t('Crea el token')}</b>
          <div className="step-line">
            <button type="button" className="btn" onClick={p.onCreate}>
              {p.createLabel}
            </button>
            <span className="step-note">{p.createNote}</span>
          </div>
        </li>
        <li>
          <b>{t('Pégalo aquí')}</b>
          {p.fields}
        </li>
        <li>
          <b>{t('Comprueba y guarda')}</b>
          {p.error && (
            <div className="serr" role="alert">
              ✕ {p.error}
              {p.detail && (
                <details>
                  <summary>{t('Ver detalle')}</summary>
                  <code>{p.detail}</code>
                </details>
              )}
            </div>
          )}
          <div className="sactions">
            <button type="submit" className="btn p" disabled={p.checking}>
              {p.checking ? t('Comprobando…') : t('Guardar y comprobar')}
            </button>
            {p.onCancel && (
              <button type="button" className="btn" onClick={p.onCancel}>
                {t('Cancelar')}
              </button>
            )}
          </div>
        </li>
      </ol>
    </form>
  )
}

/** S5: what a saved row offers — never the token. */
export function Manage({ note, onReplace, onRemove, children }: { note: string; onReplace: () => void; onRemove: () => void; children?: ReactNode }) {
  const t = useT()
  return (
    <div className="manage">
      <div className="sactions">
        <button type="button" className="btn" onClick={onReplace}>
          {t('Reemplazar')}
        </button>
        <button type="button" className="btn" onClick={onRemove}>
          {t('Borrar')}
        </button>
      </div>
      <div className="lockn">{note}</div>
      {children}
    </div>
  )
}
