import { useEffect, useState } from 'react'
import type { QuickChoice, QuickReplies as Stored } from '../../preload/api'
import { useT } from '../ui'

interface Props {
  workspaceId: string
  /** Changes with each new activity line: a new question may bring new options. */
  activityAt: number | undefined
}

/** W76: mounted only while the workspace is needs-you, so a state change remounts it fresh. */
export function QuickReplies({ workspaceId, activityAt }: Props) {
  const t = useT()
  const [stored, setStored] = useState<Stored | null>(null)
  const [result, setResult] = useState<{ sent: boolean; text: string } | null>(null)

  useEffect(() => {
    let live = true
    void window.atril.status.quickReplies(workspaceId).then((r) => live && setStored(r))
    return () => {
      live = false
    }
  }, [workspaceId, activityAt])

  if (!stored || stored.multiSelect) return null
  const choices: [string, QuickChoice][] =
    stored.options.length > 0
      ? stored.options.map((label, option) => [label, { option }])
      : [
          [t('Sí, sigue'), { fixed: 'yes' }],
          [t('No, espera'), { fixed: 'no' }]
        ]
  const press = (choice: QuickChoice): void => {
    setResult({ sent: false, text: '' })
    void window.atril.status.answer(workspaceId, choice).then((r) => setResult('ok' in r ? { sent: true, text: t('Enviado') } : { sent: false, text: r.error }))
  }
  return (
    <div className="quick-replies" role="group" aria-label={t('Respuestas rápidas')}>
      {choices.map(([label, choice]) => (
        <button key={label} type="button" className="quick-reply" disabled={result !== null} onClick={() => press(choice)}>
          {label}
        </button>
      ))}
      {result?.text && <span className={result.sent ? 'quick-sent' : 'bad'}>{result.text}</span>}
    </div>
  )
}
