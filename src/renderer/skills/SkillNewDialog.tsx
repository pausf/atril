import { useEffect, useRef, useState } from 'react'
import { useT } from '../ui'

/** K21/K25: same rule as main; main still decides. */
const NAME = /^[a-z][a-z0-9-]{0,63}$/

export function SkillNewDialog({ origin, create, onNo }: { origin: 'personal' | 'project'; create: (name: string) => Promise<void>; onNo: () => void }) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onNo()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onNo])
  const go = async (): Promise<void> => {
    if (!NAME.test(name) || busy) return
    setBusy(true)
    setError(null)
    try {
      await create(name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const title = origin === 'personal' ? t('Nueva skill personal') : t('Nueva skill de proyecto')
  return (
    <div className="skw-back">
      <form
        className="skw"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(e) => {
          e.preventDefault()
          void go()
        }}
      >
        <h2>{title}</h2>
        <label>
          {t('Nombre')}
          <input ref={input} type="text" value={name} onChange={(e) => setName(e.target.value)} aria-describedby="sk-new-rule" autoComplete="off" spellCheck={false} />
        </label>
        <p id="sk-new-rule" className="where">
          {t('Minúsculas, números y guiones.')}
        </p>
        {error !== null && <p role="alert">{error}</p>}
        <div className="skw-act">
          <button type="button" className="btn" onClick={onNo}>
            {t('Cancelar')}
          </button>
          <button type="submit" className="btn primary" disabled={!NAME.test(name) || busy}>
            {t('Crear')}
          </button>
        </div>
      </form>
    </div>
  )
}
