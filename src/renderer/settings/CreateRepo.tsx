import { useEffect, useRef, useState } from 'react'
import type { CreateRepoResult, ForgeId, ForgeStatus } from '../../preload/api'
import { useModalKeys } from '../flow/modalKeys'
import { useT } from '../ui'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }
const FORGES: ForgeId[] = ['github', 'gitlab']

/** S23, S26: a personal repo, private unless confirmed; optionally cloned and registered. */
export function CreateRepoDialog({ onClose, onRegistered }: { onClose: () => void; onRegistered: () => void }) {
  const t = useT()
  const dialog = useRef<HTMLDivElement>(null)
  const keys = useModalKeys(dialog, onClose)
  const [connected, setConnected] = useState<{ id: ForgeId; account?: string }[] | null>(null)
  const [forge, setForge] = useState<ForgeId | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setPublic] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [clone, setClone] = useState(false)
  const [folder, setFolder] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CreateRepoResult | null>(null)

  useEffect(() => {
    void Promise.all(FORGES.map(async (id) => ({ id, s: (await window.atril.settings.forge.status(id)) as ForgeStatus }))).then((all) => {
      const ok = all.filter((x) => x.s.saved).map((x) => ({ id: x.id, account: x.s.saved ? x.s.account : undefined }))
      setConnected(ok)
      if (ok[0]) setForge(ok[0].id)
    })
  }, [])

  const ready = forge !== '' && name.trim() !== '' && (!isPublic || understood) && (!clone || folder !== null) && !busy
  const submit = async (): Promise<void> => {
    if (!ready || !forge) return
    setBusy(true)
    const req = { forge, name: name.trim(), description: description.trim(), public: isPublic }
    const r = await (clone && folder ? window.atril.forge.create(req, folder) : window.atril.forge.create(req))
    setBusy(false)
    setResult(r)
    if ('registered' in r && r.registered) onRegistered()
  }

  return (
    <div className="modal" onKeyDown={(e) => void keys(e)}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="newrepo-title" ref={dialog} tabIndex={-1}>
        <h3 id="newrepo-title">{t('Crear repo')}</h3>
        {connected?.length === 0 && <p className="f-note">{t('Conecta GitHub o GitLab en Ajustes')}</p>}
        <div className="f">
          <label htmlFor="newrepo-forge">{t('Dónde')}</label>
          <select id="newrepo-forge" value={forge} onChange={(e) => setForge(e.target.value as ForgeId)} disabled={!connected?.length}>
            {(connected ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {NAME[c.id]}
                {c.account ? ` · ${c.account}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="newrepo-name">{t('Nombre')}</label>
          <input id="newrepo-name" value={name} onChange={(e) => setName(e.target.value)} spellCheck={false} autoComplete="off" />
        </div>
        <div className="f">
          <label htmlFor="newrepo-desc">{t('Descripción')}</label>
          <input id="newrepo-desc" value={description} onChange={(e) => setDescription(e.target.value)} autoComplete="off" />
        </div>
        <div className="f vis" role="radiogroup" aria-labelledby="newrepo-vis-l">
          <span className="lbl" id="newrepo-vis-l">
            {t('Visibilidad')}
          </span>
          <span>
            <label>
              <input type="radio" name="newrepo-vis" checked={!isPublic} onChange={() => setPublic(false)} /> {t('Privado')}
            </label>{' '}
            <label>
              <input type="radio" name="newrepo-vis" checked={isPublic} onChange={() => setPublic(true)} /> {t('Público')}
            </label>
          </span>
        </div>
        {isPublic && (
          <label className="f-check warn">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} /> {t('Entiendo que cualquiera podrá verlo')}
          </label>
        )}
        <label className="f-check">
          <input type="checkbox" checked={clone} onChange={(e) => setClone(e.target.checked)} /> {t('Clonar y añadir a Atril')}
        </label>
        {clone && (
          <div className="f">
            <span className="lbl">{t('En')}</span>
            <span>
              <code>{folder ?? t('elige una carpeta')}</code>{' '}
              <button type="button" className="btn" onClick={() => void window.atril.forge.pickFolder().then((f) => f && setFolder(f))}>
                {t('Elegir…')}
              </button>
            </span>
          </div>
        )}
        {result && 'error' in result && (
          <div className="bad" role="alert">
            {result.error}
          </div>
        )}
        {result && 'url' in result && (
          <div className="f-note" role="status">
            {t('Creado:')}{' '}
            <button type="button" className="linklike" onClick={() => void window.atril.forge.open(result.url)}>
              {result.url}
            </button>
            {result.registered && <div>{t('Clonado y añadido a Atril como «{id}».', { id: result.registered })}</div>}
            {result.cloneError && (
              <div className="bad">
                {result.cloneError} <code>{result.cloneCommand}</code>
              </div>
            )}
          </div>
        )}
        <div className="btns">
          <button type="button" className="btn" onClick={onClose}>
            {result && 'url' in result ? t('Cerrar') : t('Cancelar')}
          </button>
          {!(result && 'url' in result) && (
            <button type="button" className="btn p" disabled={!ready} onClick={() => void submit()}>
              {busy ? t('Creando…') : t('Crear')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
