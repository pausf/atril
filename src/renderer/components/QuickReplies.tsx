import { useCallback, useEffect, useRef, useState } from 'react'
import type { QuickChoice, QuickReplies as Stored } from '../../preload/api'
import { useT } from '../ui'

interface Props {
  workspaceId: string
  /** Changes with each new activity line: a new question may bring new options. */
  activityAt: number | undefined
  /** The whole question: its latest activity line. */
  question?: string
  /** Tells the row whether the card is there, so it can join it and drop its own cut line. */
  onShown?: (shown: boolean) => void
}

/** Which workspaces have their question card on screen right now. */
export function useAsking(): [Set<string>, (id: string, shown: boolean) => void] {
  const [asking, setAsking] = useState<Set<string>>(new Set())
  const mark = useCallback((id: string, shown: boolean) => {
    setAsking((prev) => {
      if (prev.has(id) === shown) return prev
      const next = new Set(prev)
      if (shown) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  return [asking, mark]
}

/** W76: mounted only while the workspace is needs-you, so a state change remounts it fresh. */
export function QuickReplies({ workspaceId, activityAt, question, onShown }: Props) {
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

  const shown = stored !== null && !stored.multiSelect
  const tell = useRef(onShown)
  tell.current = onShown
  useEffect(() => {
    tell.current?.(shown)
    return () => tell.current?.(false)
  }, [shown])

  if (!stored || stored.multiSelect) return null
  const choices: [string, QuickChoice][] =
    stored.options.length > 0
      ? stored.options.map((label, option) => [label, { option, question: stored.question }])
      : [[t('Sigue'), { continue: true }]]
  const press = (choice: QuickChoice): void => {
    setResult({ sent: false, text: '' })
    void window.atril.status.answer(workspaceId, choice).then((r) => setResult('ok' in r ? { sent: true, text: t('Enviado') } : { sent: false, text: r.error }))
  }
  return (
    <div className="ask" role="group" aria-label={t('Respuestas rápidas')}>
      {question && <p className="ask-q">{question}</p>}
      {choices.map(([label, choice], i) => (
        <button key={label} type="button" className="ask-opt" disabled={result?.sent === true} onClick={() => press(choice)}>
          <kbd aria-hidden="true">{i + 1}</kbd>
          {label}
        </button>
      ))}
      {result?.text && <span className={result.sent ? 'quick-sent' : 'bad'}>{result.text}</span>}
    </div>
  )
}
