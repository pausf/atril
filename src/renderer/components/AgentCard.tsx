import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { AgentWait, QuickChoice } from '../../preload/api'
import { localiseActivity } from '../../preload/activity-i18n'
import { useT } from '../ui'
import { Problem } from './Problem'

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
const ANSWERED = 'atril-answered'

// The same mark Automático picks by (W205).
const RECOMMENDED = /\s*\((Recommended|Recomendado)\)\s*$/

/** W294: «Pausar» on a looping turn end goes to the pause, not to the agent. */
type Choice = QuickChoice | 'pause'

interface Button {
  label: string
  choice: Choice
  description?: string
  recommended?: boolean
}

/** W76, W200–W202: one card per kind of wait; mounted only while the workspace is needs-you. */
export function AgentCard({ workspaceId, activityAt, onShown, focusComposer, skipMultiSelect }: Props) {
  const t = useT()
  const [wait, setWait] = useState<AgentWait | null>(null)
  const [result, setResult] = useState<{ sent: boolean; text: string; choice?: Choice } | null>(null)

  // The row and the strip above the terminal show the same wait: an answer in one moves both on.
  const [answers, setAnswers] = useState(0)
  useEffect(() => {
    const on = (e: Event): void => {
      if ((e as CustomEvent<string>).detail === workspaceId) setAnswers((n) => n + 1)
    }
    window.addEventListener(ANSWERED, on)
    return () => window.removeEventListener(ANSWERED, on)
  }, [workspaceId])
  const seen = useRef<{ at: number | undefined; next: number } | null>(null)
  useEffect(() => {
    let live = true
    void window.atril.status.wait(workspaceId).then((w) => {
      if (!live) return
      setWait(w)
      // «Enviado» stays until something new is asked: a new line, or the next question of the call.
      if (seen.current?.at !== activityAt || seen.current?.next !== w?.next) setResult(null)
      seen.current = { at: activityAt, next: w?.next ?? 0 }
    })
    return () => {
      live = false
    }
  }, [workspaceId, activityAt, answers])

  const tell = useRef(onShown)
  tell.current = onShown
  const multi = wait?.kind === 'question' && wait.questions[wait.next]?.multiSelect === true
  const shown = wait !== null && !(skipMultiSelect && multi)
  useEffect(() => {
    tell.current?.(shown)
    return () => tell.current?.(false)
  }, [shown])

  // W340: above the terminal the strip scrolls (W337), so a problem that arrives under its fold is brought into view.
  const box = useRef<HTMLDivElement>(null)
  const failed = result !== null && !result.sent && result.text !== ''
  useEffect(() => {
    if (failed) box.current?.querySelector('[role=alert]')?.scrollIntoView?.({ block: 'nearest' })
  }, [failed, result])

  const turnEnd = wait !== null && wait.kind !== 'question' && wait.kind !== 'permission'
  useEffect(() => {
    if (turnEnd && focusComposer) document.getElementById(composerId(workspaceId))?.focus()
  }, [turnEnd, focusComposer, workspaceId])

  if (!wait || !shown) return null
  const question = wait.kind === 'question' ? wait.questions[wait.next] : undefined
  // Every question of the call answered: the agent takes it from here.
  if (wait.kind === 'question' && !question && wait.questions.length > 0)
    return (
      <div className="ask" role="group" aria-label={t('What the agent is waiting for')}>
        <span className="quick-sent">{t('Sent')}</span>
      </div>
    )
  const said = wait.text ? localiseActivity(wait.text, t) : ''
  let head: string
  let buttons: Button[] = []
  if (wait.kind === 'permission') {
    const p = wait.permission
    head = p?.summary ? t('Wants to run {summary}', { summary: p.summary }) : p ? t('Wants to use {tool}', { tool: p.tool }) : t('Wants permission to go on')
    buttons = [
      { label: t('Allow'), choice: { allow: true } },
      { label: t('Deny'), choice: { deny: true } }
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
    // An end of turn, or a wait the hook did not name: why it stopped (W293), else what it said, and «Sigue».
    const words = wait.text?.startsWith('Claude dice: ') ? wait.text.slice('Claude dice: '.length) : ''
    head = words ? t('Finished: {text}', { text: words }) : wait.kind === 'turn-end' || !said ? t('Finished its turn') : said
    if (wait.said) head = t('Stopped because: “{said}”', { said: wait.said })
    if (wait.why === 'cap') head = t('Stopped 5 times with open boxes: it may be stuck')
    if (wait.why === 'loop') head = t('It repeats itself: looks like a loop')
    buttons = [{ label: t('Go on'), choice: { continue: true } }, ...(wait.why === 'loop' ? [{ label: t('Pause'), choice: 'pause' as const }] : [])]
  }

  const press = (choice: Choice): void => {
    setResult({ sent: false, text: '' })
    void (choice === 'pause' ? window.atril.status.pause(workspaceId) : window.atril.status.answer(workspaceId, choice)).then((r) => {
      if (!('ok' in r)) return setResult({ sent: false, text: r.error, choice })
      setResult({ sent: true, text: t('Sent') })
      // Several questions in one call: the next one shows once main has moved on, here and in the other card.
      window.dispatchEvent(new CustomEvent(ANSWERED, { detail: workspaceId }))
    })
  }
  const sent = result?.sent === true
  // W340: pressed and main has not answered yet; it waits for the answer to land (W339).
  const sending = result !== null && !result.sent && !result.text
  const busy = sent || sending
  const onKey = (e: KeyboardEvent): void => {
    const n = Number(e.key)
    if (busy || !Number.isInteger(n) || n < 1 || n > 4 || !buttons[n - 1]) return
    e.preventDefault()
    press(buttons[n - 1]!.choice)
  }

  return (
    <div ref={box} className="ask" role="group" aria-label={t('What the agent is waiting for')} tabIndex={0} onKeyDown={onKey}>
      {question?.header && <p className="ask-head">{question.header}</p>}
      <p className="ask-q">{head}</p>
      {wait.why === 'cap' && wait.box && <p className="ask-note">{t('On: {box}', { box: wait.box })}</p>}
      {buttons.map((b, i) => (
        <button key={i} type="button" className="ask-opt" disabled={busy} aria-label={b.label} onClick={() => press(b.choice)}>
          <kbd aria-hidden="true">{i + 1}</kbd>
          <span className="ask-text">
            <span className="ask-label">{b.label}</span>
            {b.recommended && <span className="ask-rec">{t('Recommended')}</span>}
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
          <p className="ask-note">{t('Answer in writing below')}</p>
        </>
      )}
      {wait.idle && <p className="ask-note">{t('It has been waiting for you a while')}</p>}
      {sending && <span className="quick-sent">{t('Sending…')}</span>}
      {result?.text && result.sent && <span className="quick-sent">{result.text}</span>}
      {result?.text && !result.sent && result.choice && (
        <Problem what={result.text} cant={t('The agent is still waiting for your answer.')} fix={t('Try again')} onFix={() => press(result.choice!)} detail="" />
      )}
    </div>
  )
}
