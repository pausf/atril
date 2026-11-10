import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ForgeId, ForgeStatus } from '../../preload/api'
import { useT } from '../ui'
import { ConnectSteps, ConnectionRow, Field, Manage, useConnectionState } from './Connection'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

/** S20, S25, S29, S30: like Jira's row — the token goes in once and is never shown again. */
export function ForgeCard({ forge }: { forge: ForgeId }) {
  const t = useT()
  const name = NAME[forge]
  const [status, setStatus] = useState<ForgeStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [site, setSite] = useState('')
  const [token, setToken] = useState('')
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const state = useConnectionState(status, forge === 'gitlab')

  const refresh = useCallback(async () => setStatus(await window.atril.settings.forge.status(forge)), [forge])
  useEffect(() => void refresh(), [refresh])

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setMissing(!token)
    if (!token) return
    setChecking(true)
    const r = await window.atril.settings.forge.save(forge, { token, ...(forge === 'gitlab' && { site: site || 'https://gitlab.com' }) })
    setChecking(false)
    setToken('')
    if ('error' in r) return setError(r.error)
    setReplacing(false)
    await refresh()
  }

  const remove = async (): Promise<void> => {
    await window.atril.settings.forge.delete(forge)
    setOpen(false)
    await refresh()
  }

  const id = `forge-${forge}`
  return (
    <ConnectionRow
      id={id}
      name={name}
      purpose={t('Tus MR, revisar y crear repos')}
      state={state}
      saved={status && status.saved}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      {status?.saved && !replacing ? (
        <Manage note={t('El token no se muestra nunca. Si lo pierdes, crea uno nuevo y pulsa Reemplazar.')} onReplace={() => setReplacing(true)} onRemove={() => void remove()} />
      ) : (
        <ConnectSteps
          createLabel={t('Crear token en {forge}', { forge: name })}
          createNote={forge === 'github' ? t('con el permiso repo') : t('con el permiso api')}
          onCreate={() => void window.atril.settings.forge.openTokenPage(forge, site || undefined)}
          fields={
            <>
              {forge === 'gitlab' && <Field id={`${id}-site`} label={t('Dirección')} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://gitlab.com" />}
              <Field
                id={`${id}-token`}
                label={t('Token')}
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                error={missing && !token ? t('Falta el token.') : undefined}
              />
            </>
          }
          error={error}
          checking={checking}
          onCancel={replacing ? () => setReplacing(false) : undefined}
          onSubmit={(e) => void save(e)}
        />
      )}
    </ConnectionRow>
  )
}
