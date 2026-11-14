import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useT } from '../ui'
import { composerId } from './AgentCard'
import { Problem } from './Problem'

/** W204: everything the person says to the agent goes through here; the terminal above only shows. */
export function Composer({ workspaceId, stopped }: { workspaceId: string; stopped: boolean }) {
  const t = useT()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const send = (): void => {
    const line = text.trim()
    if (!line || stopped || busy) return
    setBusy(true)
    void window.atril.status.compose(workspaceId, line).then((r) => {
      setBusy(false)
      if ('ok' in r) {
        setText('')
        setProblem(null)
      } else setProblem(r.error)
    })
  }
  const submit = (e: FormEvent): void => {
    e.preventDefault()
    send()
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return
    e.preventDefault()
    send()
  }

  return (
    <form className="composer" onSubmit={submit}>
      {problem && <Problem what={problem} cant={t('Tu mensaje sigue en la caja.')} fix={t('Volver a intentar')} onFix={send} detail="" busy={busy} />}
      <div className="composer-row">
        <textarea
          id={composerId(workspaceId)}
          rows={2}
          aria-label={t('Escribe al agente')}
          placeholder={stopped ? t('El agente está parado.') : t('Escribe al agente…  ⌘↩ envía')}
          value={text}
          disabled={stopped}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="submit" className="btn p" disabled={stopped || busy || text.trim() === ''}>
          {t('Enviar')}
        </button>
      </div>
    </form>
  )
}
