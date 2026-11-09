import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Screen } from '../components/Rail'
import { useT, type T } from '../ui'

export interface Step {
  /** Value of the `data-tour` attribute on the real element. */
  target: string
  screen: Screen
  title: string
  text: ReactNode
}

const kbd = (k: string): ReactNode => <kbd>{k}</kbd>

export const stepsOf = (t: T): readonly Step[] => [
  {
    target: 'rail',
    screen: 'work',
    title: t('Tus pantallas'),
    text: t('Trabajo es donde viven tus agentes, Tareas tiene tu Jira y Ajustes guarda tus tokens y la apariencia.')
  },
  {
    target: 'tasks',
    screen: 'tasks',
    title: t('Tus tareas de Jira'),
    text: t('Todas tus tareas abiertas, agrupadas por estado. «Empezar» crea un trabajo con su propia rama y lanza /libretto-flow con la clave.')
  },
  {
    target: 'workspaces',
    screen: 'work',
    title: t('Trabajo en marcha'),
    text: t('Cada trabajo con su agente y su estado escrito: trabajando, te necesita o parado. Cuando te necesita, Atril te avisa con una notificación.')
  },
  {
    target: 'terminal',
    screen: 'work',
    title: t('La terminal de tu agente'),
    text: (
      <>
        {t('Es tu Claude Code de verdad, dentro de tmux: escribe como siempre.')} {kbd('⌘D')} {t('divide el panel a la derecha y')} {kbd('⌘⇧D')}{' '}
        {t('hacia abajo. Si cierras Atril, el agente sigue vivo.')}
      </>
    )
  },
  {
    target: 'flow',
    screen: 'work',
    title: t('El flujo de Libretto'),
    text: (
      <>
        {t('La etapa y el checklist del trabajo elegido, leídos de sus archivos.')} {kbd('⌘J')} {t('te lleva aquí y')} {kbd('⌘L')} {t('a la barra lateral.')}
      </>
    )
  },
  {
    target: 'usage',
    screen: 'work',
    title: t('Tu cuota de Claude'),
    text: t('Cuánto llevas en las últimas 5 horas y en 7 días, y cuándo se reinicia. Así sabes si te da para otro agente.')
  },
  {
    target: 'session',
    screen: 'work',
    title: t('Tu sesión'),
    text: t('Quién eres en Jira. Púlsalo para ir a Ajustes y conectar, reemplazar o borrar tu token.')
  },
  {
    target: 'appearance',
    screen: 'settings',
    title: t('Apariencia'),
    text: t('Claro, Oscuro o Automático, que sigue a tu Mac. Para volver a ver este tutorial: Ayuda → Tutorial.')
  }
]

/** Spanish, as written: what tests and the dev snapshots count; the window renders `stepsOf(t)`. */
export const STEPS = stepsOf((es) => es)

interface Box {
  left: number
  top: number
  width: number
  height: number
}

const PAD = 6
const TIP_W = 340
const MARGIN = 12

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(v, hi))

/** Beside the target when there is room, else over a corner of the window. */
function placeTip(r: Box, h: number, vw: number, vh: number): { left: number; top: number } {
  const alongY = clamp(r.top, MARGIN, vh - h - MARGIN)
  const alongX = clamp(r.left, MARGIN, vw - TIP_W - MARGIN)
  const right = r.left + r.width + PAD + 16
  const left = r.left - PAD - 16 - TIP_W
  const below = r.top + r.height + PAD + 16
  const above = r.top - PAD - 16 - h
  if (right + TIP_W <= vw - MARGIN) return { left: right, top: alongY }
  if (below + h <= vh - MARGIN) return { left: alongX, top: below }
  if (left >= MARGIN) return { left, top: alongY }
  if (above >= MARGIN) return { left: alongX, top: above }
  return { left: vw - TIP_W - 24, top: vh - h - 60 }
}

interface Props {
  screen: Screen
  goTo: (s: Screen) => void
  /** Skipped or finished: either way the tutorial is done. */
  onClose: () => void
  /** Dev snapshots open on a given step. */
  startAt?: number
}

export function Tour({ screen, goTo, onClose, startAt = -1 }: Props) {
  const t = useT()
  const STEPS = useMemo(() => stepsOf(t), [t])
  // -1 is the welcome card.
  const [i, setI] = useState(startAt)
  const [box, setBox] = useState<Box | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const tip = useRef<HTMLDivElement>(null)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const next = (): void => (last ? onClose() : setI(i + 1))
  const prev = (): void => (i > 0 ? setI(i - 1) : undefined)

  useEffect(() => {
    if (step && step.screen !== screen) goTo(step.screen)
  }, [step, screen, goTo])

  useEffect(() => {
    if (!step || step.screen !== screen) return setBox(null)
    const measure = (): void => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      el?.scrollIntoView?.({ block: 'nearest' })
      const r = el?.getBoundingClientRect()
      setBox(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null)
    }
    measure()
    // The footer and the session chip fill in after their data arrives and move.
    const late = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(late)
      window.removeEventListener('resize', measure)
    }
  }, [step, screen])

  useLayoutEffect(() => {
    setPos(step && box ? placeTip(box, tip.current?.offsetHeight ?? 260, window.innerWidth, window.innerHeight) : null)
  }, [step, box])

  useEffect(() => {
    tip.current?.querySelector<HTMLElement>('[data-primary]')?.focus()
  }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Tab') {
        const items = Array.from(tip.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
        const first = items[0]
        const end = items.at(-1)
        if (!first || !end) return
        const active = document.activeElement
        const inside = tip.current?.contains(active) ?? false
        const wrap = !inside ? (e.shiftKey ? end : first) : e.shiftKey && active === first ? end : !e.shiftKey && active === end ? first : null
        if (wrap) {
          e.preventDefault()
          wrap.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="tour">
      {box ? (
        <div
          className="spot"
          data-target={step?.target}
          style={{ left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      ) : (
        <div className="scrim" />
      )}
      <div
        ref={tip}
        className={`tip${step ? '' : ' welcome'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={step && pos ? { ...pos, right: 'auto', bottom: 'auto' } : undefined}
      >
        {step ? (
          <>
            <div className="stepn">
              {t('Paso {n} de {total}', { n: i + 1, total: STEPS.length })}
            </div>
            <h4 id="tour-title">{step.title}</h4>
            <p>{step.text}</p>
            <div className="dots" aria-hidden>
              {STEPS.map((s, n) => (
                <i key={s.target} className={n === i ? 'on' : undefined} />
              ))}
            </div>
            <div className="nav">
              <button type="button" className="skip" onClick={onClose}>
                {t('Saltar')}
              </button>
              <span className="sp" />
              <button type="button" className="btn" disabled={i === 0} onClick={prev}>
                {t('Atrás')}
              </button>
              <button type="button" className="btn p" data-primary onClick={next}>
                {last ? t('Terminar') : t('Siguiente')}
              </button>
            </div>
            <div className="kb">{kbd('←')} {kbd('→')} {t('para moverte')} · {kbd('Enter')} {t('siguiente')} · {kbd('Esc')} {t('salir')}</div>
          </>
        ) : (
          <>
            <h4 id="tour-title">{t('Bienvenido a Atril')}</h4>
            <p>
              {t('Tus tareas de Jira, tus agentes de Claude y el flujo de Libretto, en una sola ventana. Te enseño cada pieza en un minuto.')}
            </p>
            <div className="nav">
              <button type="button" className="btn" onClick={onClose}>
                {t('Saltar')}
              </button>
              <span className="sp" />
              <button type="button" className="btn p" data-primary onClick={() => setI(0)}>
                {t('Enséñamelo · 1 min')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
