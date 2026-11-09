import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { AgentState, FlowDocs } from '../../preload/api'
import { DocEditor } from './DocEditor'
import { useT } from '../ui'
import { useModalKeys } from './modalKeys'
import { partOffset, type Part } from './highlight'

interface Props {
  workspaceId: string
  part: Part
  /** F26: an automatic workspace's documents are read-only whatever the agent does. */
  auto?: boolean
  onClose: () => void
}

/** A draft keeps the mtime the person started from: a save after the agent wrote must be refused (F16). */
type Draft = { text: string; mtimeMs: number }

export function DocModal({ workspaceId, part, auto = false, onClose }: Props) {
  const t = useT()
  const titles: Record<Part, string> = { spec: t('Spec'), plan: t('Plan'), checklist: t('Checklist') }
  const dialog = useRef<HTMLDivElement>(null)
  const [docs, setDocs] = useState<FlowDocs | null>(null)
  const [file, setFile] = useState('proposal.md')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [state, setState] = useState<AgentState | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<{ at: number } | null>(null)

  useEffect(() => {
    let live = true
    const load = (): void => void window.atril.flow.docs(workspaceId).then((d) => live && setDocs(d))
    load()
    const offFlow = window.atril.flow.onChange((id) => id === workspaceId && load())
    void window.atril.status.list().then((s) => live && setState(s[workspaceId]))
    const offState = window.atril.status.onChange((id, s) => id === workspaceId && setState(s))
    return () => {
      live = false
      offFlow()
      offState()
    }
  }, [workspaceId])

  // The cursor goes to the stage's section once, when the proposal first arrives.
  const placed = useRef(false)
  useEffect(() => {
    const proposal = docs?.files.find((f) => f.name === 'proposal.md')
    if (!proposal || placed.current) return
    placed.current = true
    setCursor({ at: partOffset(proposal.text, part) })
  }, [docs, part])

  const files = (docs?.files ?? []).filter((f) => part === 'spec' || f.name === 'proposal.md')
  const current = files.find((f) => f.name === file)
  const dirty = (name: string): boolean => {
    const d = drafts[name]
    const f = docs?.files.find((x) => x.name === name)
    return !!d && d.text !== f?.text
  }
  const text = drafts[file]?.text ?? current?.text ?? ''
  const readOnly = auto || state === 'working'

  const edit = (value: string): void => {
    if (!current) return
    setDrafts((d) => ({ ...d, [file]: { text: value, mtimeMs: d[file]?.mtimeMs ?? current.mtimeMs } }))
  }

  const save = async (): Promise<void> => {
    const d = drafts[file]
    if (!docs || !d || readOnly || !dirty(file)) return
    const r = await window.atril.flow.save(workspaceId, docs.change, file, d.text, d.mtimeMs)
    if ('error' in r) return setError(r.error)
    setError(null)
    setDocs((x) => x && { ...x, files: x.files.map((f) => (f.name === file ? { ...f, text: d.text, mtimeMs: r.mtimeMs } : f)) })
    setDrafts((all) => {
      const rest = { ...all }
      delete rest[file]
      return rest
    })
  }

  const close = (): void => {
    if (files.some((f) => dirty(f.name)) && !window.confirm(t('Tienes cambios sin guardar. ¿Cerrar y descartarlos?'))) return
    onClose()
  }

  const keys = useModalKeys(dialog, () => close())
  const onKeyDown = (e: KeyboardEvent): void => {
    if (keys(e)) return
    if (e.metaKey && e.key === 's') {
      e.preventDefault()
      void save()
    }
  }

  return (
    <div className="modal" onKeyDown={onKeyDown}>
      <div className="dlg edmodal" role="dialog" aria-modal="true" aria-labelledby="doc-title" ref={dialog} tabIndex={-1}>
        <div className="edhead">
          <h3 id="doc-title">{titles[part]}</h3>
          <span className="docchange">{docs?.change ?? ''}</span>
          <div className="ftabs" role="tablist" aria-label={t('Archivos')}>
            {files.map((f) => (
              <button
                key={f.name}
                type="button"
                role="tab"
                aria-selected={f.name === file}
                aria-label={dirty(f.name) ? t('{name} sin guardar', { name: f.name }) : f.name}
                onClick={() => setFile(f.name)}
              >
                {f.name}
                {dirty(f.name) && <span className="dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <span className="sp" />
          <button type="button" className="btn" onClick={close}>
            {t('Cerrar')}
          </button>
        </div>
        {error && (
          <div className="edbanner" role="alert">
            {error}
          </div>
        )}
        {docs === null ? (
          <div className="empty">{t('Este trabajo aún no tiene documentos de Libretto.')}</div>
        ) : (
          <DocEditor text={text} readOnly={readOnly} onChange={edit} cursor={cursor} />
        )}
        <div className="edstatus">
          {readOnly ? (
            <span className="ro">{auto ? t('🔒 solo lectura · modo automático') : t('🔒 solo lectura · Claude está escribiendo')}</span>
          ) : (
            <span className="rw">{state === 'stopped' ? t('✎ editable · agente parado') : t('✎ editable · Claude te espera')}</span>
          )}
          <span className="sp" />
          <button type="button" onClick={() => void save()} disabled={readOnly || !dirty(file)}>
            {t('Guardar ⌘S')}
          </button>
        </div>
      </div>
    </div>
  )
}
