import { useState } from 'react'
import type { QaPlatform, QaTargets } from '../../preload/api'
import { useT } from '../ui'
import { PLATFORMS, platformLabel } from './kinds'

/** W122: «Elegir a mano»; main validates it and answers a sentence when it refuses. */
export function QaPick({ workspaceId, onSaved, onCancel }: { workspaceId: string; onSaved: (r: QaTargets) => void; onCancel: () => void }) {
  const t = useT()
  const [platform, setPlatform] = useState<QaPlatform>('chrome')
  const [dir, setDir] = useState('')
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const r = await window.atril.qa.manual(workspaceId, { platform, dir: dir.trim(), command })
    setBusy(false)
    if ('error' in r) setError(r.error)
    else onSaved(r)
  }

  return (
    <form
      className="qat-pick"
      aria-label={t('Elegir a mano')}
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="f stack">
        <label htmlFor="qat-platform">{t('Plataforma')}</label>
        <select id="qat-platform" value={platform} onChange={(e) => setPlatform(e.target.value as QaPlatform)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {platformLabel(t, p)}
            </option>
          ))}
        </select>
      </div>
      <div className="f stack">
        <label htmlFor="qat-dir">{t('Carpeta')}</label>
        <input id="qat-dir" value={dir} spellCheck={false} placeholder={t('Vacía: la raíz del trabajo')} onChange={(e) => setDir(e.target.value)} />
      </div>
      <div className="f stack">
        <label htmlFor="qat-command">{t('Comando')}</label>
        <input id="qat-command" value={command} spellCheck={false} placeholder="pnpm run dev" onChange={(e) => setCommand(e.target.value)} />
      </div>
      {error && (
        <p className="qa-err" role="alert">
          {error}
        </p>
      )}
      <div className="btns">
        <button type="button" className="btn" onClick={onCancel}>
          {t('Cancelar')}
        </button>
        <button type="submit" className="btn p" disabled={busy || command.trim() === ''}>
          {t('Guardar')}
        </button>
      </div>
    </form>
  )
}
