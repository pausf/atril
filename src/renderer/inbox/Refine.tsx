import { useState, type KeyboardEvent } from 'react'
import type { RefineResult } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT, type T } from '../ui'

/** One of Claude's questions and what the person answered. */
export interface Asked {
  q: string
  a: string
}

/** I30: the four fixed questions and the prefix each answer travels with. */
const fixedQuestions = (t: T): Array<[label: string, prefix: string]> => [
  [t('¿Qué tiene que pasar cuando esté hecho?'), t('Hecho cuando:')],
  [t('¿Qué no entra?'), t('No entra:')],
  [t('¿Dónde se toca? (pantalla, archivos)'), t('Dónde:')],
  [t('Un ejemplo'), t('Ejemplo:')]
]

const clean = (s: string): string => s.replace(/\s*[\r\n]+\s*/g, ' ').trim()

/** The answered pairs, fixed first and then Claude's, each as [lead, answer]. */
export function answers(t: T, fixed: string[], asked: Asked[]): Array<[string, string]> {
  const prefixes = fixedQuestions(t).map(([, p]) => p)
  return [...fixed.map((a, i): [string, string] => [prefixes[i] ?? '', a]), ...asked.map(({ q, a }): [string, string] => [q, a])].filter(([, a]) => clean(a) !== '')
}

/** I30: the request as typed, then a blank line and one line per filled answer. */
export function withAnswers(text: string, pairs: Array<[string, string]>): string {
  const lines = pairs.map(([lead, a]) => [lead, clean(a)] as const).filter(([, a]) => a !== '').map(([lead, a]) => `${lead} ${a}`)
  return lines.length ? `${text.trimEnd()}\n\n${lines.join('\n')}` : text
}

interface Props {
  /** The request as typed: what Claude asks about. */
  text: string
  fixed: string[]
  onFixed: (fixed: string[]) => void
  asked: Asked[]
  onAsked: (asked: Asked[]) => void
  count: number
}

/** I34: Enter walks the section's fields, ending on the ask button; ⌘↩ still goes up to the dialog. */
function walk(e: KeyboardEvent<HTMLDivElement>): void {
  if (e.key !== 'Enter' || e.metaKey || (e.target as HTMLElement).tagName !== 'INPUT') return
  e.preventDefault()
  e.stopPropagation()
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('input, .ask button'))
  items[items.indexOf(e.target as HTMLElement) + 1]?.focus()
}

type Failed = Extract<RefineResult, { error: string }>

export function Refine({ text, fixed, onFixed, asked, onAsked, count }: Props) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  const [failed, setFailed] = useState<Failed | null>(null)

  // I31: the only call to Claude in the dialog, and only on this press.
  const ask = async (): Promise<void> => {
    setAsking(true)
    setFailed(null)
    const r: RefineResult = await window.atril.refine.ask(text).catch((e: unknown) => ({ error: t('Claude ha fallado.'), detail: String(e), fix: 'retry' as const }))
    setAsking(false)
    if ('error' in r) return setFailed(r)
    onAsked(r.questions.map((q) => ({ q, a: '' })))
  }

  return (
    <details className="refine">
      <summary>
        {t('Afinar la petición')}
        <span className="op"> · {t('opcional')}</span>
        {count > 0 && <span className="cnt"> · {count === 1 ? t('1 respuesta añadida') : t('{n} respuestas añadidas', { n: count })}</span>}
      </summary>
      <div className="rb" onKeyDown={walk}>
        {fixedQuestions(t).map(([label], i) => (
          <div className="rq" key={label}>
            <label htmlFor={`refine-f${i}`}>{label}</label>
            <input id={`refine-f${i}`} value={fixed[i] ?? ''} onChange={(e) => onFixed(fixed.map((v, j) => (j === i ? e.target.value : v)))} />
          </div>
        ))}
        {asked.length > 0 && <div className="aih">{t('Claude pregunta, sobre tu petición')}</div>}
        {asked.map(({ q, a }, i) => (
          <div className="rq" key={q}>
            <label htmlFor={`refine-a${i}`}>{q}</label>
            <input id={`refine-a${i}`} value={a} onChange={(e) => onAsked(asked.map((x, j) => (j === i ? { q, a: e.target.value } : x)))} />
          </div>
        ))}
        <div className="ask">
          <button type="button" className="btn" disabled={asking} onClick={() => void ask()}>
            {asked.length ? t('Volver a preguntar') : t('Que Claude me pregunte')}
          </button>
          <span>{t('Usa Claude Haiku, solo cuando lo pulsas.')}</span>
        </div>
        {asking && (
          <div className="think" role="status">
            {t('Pensando…')}
          </div>
        )}
        {failed && <Problem what={failed.error} cant={t('Puedes empezar igual: afinar es opcional.')} fix={t('Volver a intentar')} onFix={() => void ask()} detail={failed.detail} />}
      </div>
    </details>
  )
}
