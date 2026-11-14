import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { AgentWait, QuickChoice } from '../../preload/api'
import { localiseActivity } from '../../preload/activity-i18n'
import { useT } from '../ui'

interface Props {
  workspaceId: string
  /** Changes with each new activity line: the wait may have changed. */
  activityAt: number | undefined
  /** Tells the row whether the card is there, so it can join it and drop its own cut line. */
  onShown?: (shown: boolean) => void
  /** The strip above the terminal: an end of turn hands the focus to the composer (W202). */
  focusComposer?: boolean
  /** W82: a card in «Todos» shows no multiSelect question. */
  skipMultiSelect?: boolean
}

/** Which workspaces have their card on screen right now. */
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

export const composerId = (workspaceId: string): string => `composer-${workspaceId}`

// The same mark Automático picks by (W205).
const RECOMMENDED = /\s*\((Recommended|Recomendado)\)\s*$/

interface Button {
  label: string
  choice: QuickChoice
  description?: string
  recommended?: boolean
}

/** W76, W200–W202: one card per kind of wait; mounted only while the workspace is needs-you. */
export function AgentCard({ workspaceId, activityAt, onShown, focusComposer, skipMultiSelect }: Props) {
  const t = useT()
  const [wait, setWait] = useState<AgentWait | null>(null)
  const [result, setResult] = useState<{ sent: boolean; text: string } | null>(null)

  const load = useCallback(() => window.atril.status.wait(workspaceId), [workspaceId])
  useEffect(() => {
    let live = true
    void load().then((w) => {
      if (!live) return
      setWait(w)
      setResult(null)
    })
    return () => {
      live = false
    }
  }, [load, activityAt])

  const tell = useRef(onShown)
  tell.current = onShown
  const multi = wait?.kind === 'question' && wait.questions[wait.next]?.multiSelect === true
  const shown = wait !== null && !(skipMultiSelect && multi)
  useEffect(() => {
    tell.current?.(shown)
    return () => tell.current?.(false)
  }, [shown])

  const turnEnd = wait !== null && wait.kind !== 'question' && wait.kind !== 'permission'
  useEffect(() => {
    if (turnEnd && focusComposer) document.getElementById(composerId(workspaceId))?.focus()
  }, [turnEnd, focusComposer, workspaceId])

  if (!wait || !shown) return null
  const question = wait.kind === 'question' ? wait.questions[wait.next] : undefined
  const said = wait.text ? localiseActivity(wait.text, t) : ''
  let head: string
  let buttons: Button[] = []
  if (wait.kind === 'permission') {
    const p = wait.permission
    head = p?.summary ? t('Quiere ejecutar {summary}', { summary: p.summary }) : p ? t('Quiere usar {tool}', { tool: p.tool }) : t('Quiere permiso para seguir')
    buttons = [
      { label: t('Permitir'), choice: { allow: true } },
      { label: t('Denegar'), choice: { deny: true } }
    ]
  } else if (question) {
    head = question.question
    if (!question.multiSelect)
      buttons = question.options.map((o, option) => ({
        label: o.label.replace(RECOMMENDED, ''),
        description: o.description,
        recommended: RECOMMENDED.test(o.label),
        choice: { option, question: wait.next }
      }))
  } else {
    // An end of turn, or a wait the hook did not name: what it said and «Sigue».
    const words = wait.text?.startsWith('Claude dice: ') ? wait.text.slice('Claude dice: '.length) : ''
    head = words ? t('Ha terminado: {text}', { text: words }) : wait.kind === 'turn-end' || !said ? t('Ha terminado su turno') : said
    buttons = [{ label: t('Sigue'), choice: { continue: true } }]
  }

  const press = (choice: QuickChoice): void => {
    setResult({ sent: false, text: '' })
    void window.atril.status.answer(workspaceId, choice).then(async (r) => {
      if (!('ok' in r)) return setResult({ sent: false, text: r.error })
      setResult({ sent: true, text: t('Enviado') })
      // Several questions in one call: the next one shows once main has moved on.
      const now = await load()
      if (now && wait.kind === 'question' && now.next !== wait.next) {
        setWait(now)
        setResult(null)
      }
    })
  }
  const sent = result?.sent === true
  const onKey = (e: KeyboardEvent): void => {
    const n = Number(e.key)
    if (sent || !Number.isInteger(n) || n < 1 || n > 4 || !buttons[n - 1]) return
    e.preventDefault()
    press(buttons[n - 1]!.choice)
  }

  return (
    <div className="ask" role="group" aria-label={t('Lo que espera el agente')} tabIndex={0} onKeyDown={onKey}>
      {question?.header && <p className="ask-head">{question.header}</p>}
      <p className="ask-q">{head}</p>
      {buttons.map((b, i) => (
        <button key={i} type="button" className="ask-opt" disabled={sent} aria-label={b.label} onClick={() => press(b.choice)}>
          <kbd aria-hidden="true">{i + 1}</kbd>
          <span className="ask-text">
            <span className="ask-label">{b.label}</span>
            {b.recommended && <span className="ask-rec">{t('Recomendada')}</span>}
            {b.description && <span className="ask-desc">{b.description}</span>}
          </span>
        </button>
      ))}
      {question?.multiSelect && (
        <>
          <ul className="ask-multi">
            {question.options.map((o, i) => (
              <li key={i}>
                <span className="ask-label">{o.label}</span>
                {o.description && <span className="ask-desc">{o.description}</span>}
              </li>
            ))}
          </ul>
          <p className="ask-note">{t('Contesta por escrito abajo')}</p>
        </>
      )}
      {wait.idle && <p className="ask-note">{t('Lleva un rato esperándote')}</p>}
      {result?.text && <span className={result.sent ? 'quick-sent' : 'bad'}>{result.text}</span>}
    </div>
  )
}
