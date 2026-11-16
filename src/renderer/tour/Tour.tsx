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

// Shortcuts inside a text show as keys; the text stays one t() key.
const KEYS = /(⌘⇧?[A-Z0-9↩]|⌥|↑|↓|\bEnter\b|\bEsc\b)/

const keys = (text: string): ReactNode => text.split(KEYS).map((part, n) => (n % 2 ? <kbd key={n}>{part}</kbd> : part))

export const stepsOf = (t: T): readonly Step[] => [
  { target: 'rail', screen: 'work', title: t('Tus pantallas'), text: keys(t('A la izquierda tienes las siete pantallas: Trabajo, Tareas, MR, Libretto, QA, Avisos y Ajustes. Pulsa una para cambiar; lo que tengas en Trabajo sigue vivo mientras estás en otra. El número sobre MR cuenta las que te toca revisar, y el de Avisos, los que aún no has leído.')) },
  { target: 'next-up', screen: 'work', title: t('Qué me toca'), text: keys(t('Esta franja junta lo que te espera: primero los agentes que te necesitan y después las tareas por empezar. Pulsa uno para ir a su trabajo o al diálogo de Empezar, o pulsa ⌘↩ para ir al primero. Si no hay nada pendiente, no aparece.')) },
  { target: 'new-work', screen: 'work', title: t('Nuevo trabajo'), text: keys(t('Abre un trabajo en uno de tus repos: Atril crea la rama, en un worktree o en tu copia según el repo, y lanza Claude dentro de tmux. Si escribes qué hay que hacer, Libretto empieza por la spec y eliges el modo; si lo dejas en blanco, abre Claude a secas. Con ⌘↩ lo empiezas sin soltar el teclado.')) },
  { target: 'workspaces', screen: 'work', title: t('Trabajo en marcha'), text: keys(t('Cada trabajo con su agente, su estado escrito (trabajando, te necesita, en pausa o parado), lo último que ha hecho y cuántos subagentes tiene en marcha. Cuando un agente te necesita, tu Mac te avisa y puedes contestarle desde la notificación o con las respuestas rápidas que salen en su fila, sin abrir su terminal. Con ⌘1 a ⌘9 eliges los nueve primeros; ⌘⇧A («Todos») los enseña todos en tarjetas, primero los que te necesitan, ⌘⇧F (modo foco) deja solo el elegido y te avisa arriba si otro te necesita, y ⌘⇧P lo pausa o lo reanuda.')) },
  { target: 'terminal', screen: 'work', title: t('La terminal de tu agente'), text: keys(t('Es tu Claude Code de verdad, dentro de tmux, de solo lectura: lo ves trabajar y puedes copiar, pero no se escribe en él. Lo que le digas pasa por Atril: las tarjetas cuando te pregunta y «Escribe al agente», debajo. Si cierras Atril, el agente sigue trabajando en tmux.')) },
  { target: 'flow', screen: 'work', title: t('El panel de Libretto'), text: keys(t('A la derecha ves cómo va el trabajo elegido, leído de su carpeta .agents: casillas con su código y subagentes. Tiene dos pestañas, Libretto y Actividad, y pasas de una a otra con las flechas. ⌘J te trae aquí y ⌘L te lleva a la barra lateral.')) },
  { target: 'stages', screen: 'work', title: t('Los pasos'), text: keys(t('Seis tramos con nombre sobre el título del trabajo: Entrada, Spec, Plan, Construir, Revisar y Aterrizar. El actual se va llenando con las casillas cerradas. Spec y Plan se pueden pulsar: abren lo que ha escrito Claude, y mientras te espera puedes corregirlo y guardarlo con ⌘S.')) },
  { target: 'flow-checklist', screen: 'work', title: t('Casillas'), text: keys(t('Desde Construir, el checklist es una línea de tiempo: pulsa una casilla cerrada para ver el código que la cerró y, en la que toca ahora, el que Claude está escribiendo, al día cada 3 segundos. Si la rama pasa de 400 líneas, sale un aviso arriba: puedes pedirle que la separe en MRs encadenadas o dejarla así.')) },
  { target: 'flow-subagents', screen: 'work', title: t('Subagentes'), text: keys(t('Cuando Claude encarga una parte a un subagente, aquí ves qué le ha pedido, de qué tipo es y cuánto lleva trabajando o cuánto tardó. Pulsa uno para abrir su registro, con lo que hace contado como en una terminal y al día cada segundo mientras trabaja.')) },
  { target: 'activity', screen: 'work', title: t('Actividad'), text: keys(t('Esta pestaña cuenta en frases lo que ha hecho el agente del trabajo elegido: qué lee, qué edita, qué ejecuta y qué te pregunta, lo más reciente arriba. Sirve para ponerte al día sin leer la terminal entera.')) },
  { target: 'tasks', screen: 'tasks', title: t('Tus tareas de Jira'), text: keys(t('Tus tareas abiertas de Jira, agrupadas por estado o por las columnas de tu tablero, y al día cada 5 minutos. «Empezar» crea la rama, pasa la tarea a In Progress y lanza Libretto con su clave; si Atril aún no sabe en qué repo va ese proyecto, te lo pregunta antes. Si haces clic con ⌥ pulsado, siempre abre el diálogo para elegir repo, rama, modelo y modo.')) },
  { target: 'start-mode', screen: 'tasks', title: t('Manual o automático'), text: keys(t('Al empezar una tarea, o un trabajo con texto, eliges el modo. Manual se para con la spec y el plan escritos y te pregunta antes de construir; Automático sigue sin parar, pero te pregunta antes de subir nada. En automático, la Spec y el Plan se ven en solo lectura.')) },
  { target: 'new-task', screen: 'tasks', title: t('Nueva tarea'), text: keys(t('Para algo que no está en Jira: escribe qué hay que hacer y elige repo, rama, modelo y modo. Libretto toma tu texto como petición y empieza por la spec. Con ⌘↩ la empiezas en el acto.')) },
  { target: 'mr', screen: 'mr', title: t('Tus MR'), text: keys(t('Tres listas de GitHub y GitLab: Mías, Me toca revisar y Sigo, con su CI, su tamaño, cuándo se movieron y si están en conflicto. Pulsa una y su página se abre junto a la bandeja: el código con cada hilo y cada borrador en su línea, la conversación y, a la derecha, la puntuación, «Contra su spec», los revisores y la CI. En las tuyas que la forja deja fusionar, «Fusionar» te pregunta antes de hacerlo.')) },
  { target: 'mr-tools', screen: 'mr', title: t('Puntuar y revisar'), text: keys(t('En la página de una MR, «Revisar ▾» ofrece Puntuar (dificultad y riesgo del 1 al 5, con Claude Sonnet), Comentar (borradores por lente en su línea, que publicas, descartas o mandas al agente) y A fondo (Libretto revisándola en tu repo). Puntuar y Comentar salen en Mías y en Me toca revisar, y en la bandeja cada una de esas filas trae también «Puntuar». Solo gastan cuota cuando los pulsas.')) },
  { target: 'avisos', screen: 'avisos', title: t('Avisos'), text: keys(t('Lo que ha cambiado en tus MR y en tus agentes: revisiones que te piden, comentarios nuevos, CI que falla, MRs nuevas en lo que sigues y agentes que te necesitan. Pulsa uno para ir a su MR o a su trabajo, y queda leído; «Marcar todo leído» los limpia de golpe. Arriba puedes filtrarlos por tipo.')) },
  { target: 'libretto', screen: 'libretto', title: t('Libretto'), text: keys(t('La cola de ideas de cada repo y lo que está en curso, leído de su carpeta .agents: no gasta cuota. Escribe una idea y «Encolar» la guarda y la commitea sola en la rama actual; «Empezar» abre su trabajo en la rama feat/ con Libretto ya en la spec. Elige el repo arriba y «Actualizar» vuelve a leerlo.')) },
  { target: 'qa', screen: 'qa', title: t('QA'), text: keys(t('Eliges un trabajo y ves cada criterio de su cambio con Pasa, Falla o Sin probar. «Probar en vivo» abre al lado un Claude que recorre la app y deja un informe y capturas; «Ver cómo» enseña sus pasos, «Probar este» repite un criterio y «Marcar como bug» lo lleva a Jira o al agente.')) },
  { target: 'doctor', screen: 'work', title: t('Herramientas que faltan'), text: keys(t('Si falta alguna herramienta que Atril necesita (git, tmux, claude o jira), arriba sale un aviso en rojo con cuántas son. Púlsalo: «Copiar» copia el comando de instalación e «Instalar» lo ejecuta en Terminal. Cuando vuelves a la ventana de Atril, lo comprueba otra vez y el aviso se va si ya está todo.')) },
  { target: 'palette', screen: 'work', title: t('Buscar con ⌘K'), text: keys(t('⌘K abre un buscador para todo Atril: pantallas, acciones, trabajos, MR y tareas. Escribe unas letras, muévete con ↑ y ↓ y pulsa Enter para ir; Esc lo cierra.')) },
  { target: 'usage', screen: 'work', title: t('Tu cuota de Claude'), text: keys(t('Abajo ves cuánto llevas gastado de Claude en las últimas 5 horas y en 7 días, y cuándo se reinicia la semana. Las barras cambian de color al pasar del 80 %, así sabes si te da para otro agente.')) },
  { target: 'session', screen: 'work', title: t('Tu sesión'), text: keys(t('Arriba a la derecha está la cuenta de Jira con la que entras, o «Sin conectar». Púlsalo para ir a Ajustes y conectar, reemplazar o borrar tu token.')) },
  { target: 'connections', screen: 'settings', title: t('Conexiones'), text: keys(t('Aquí conectas Jira, GitHub y GitLab con un token, y Atril lo comprueba al guardarlo. Se guardan cifrados en el Llavero de tu Mac, no se vuelven a mostrar y tus agentes nunca los reciben: solo puedes reemplazarlos o borrarlos. En Jira, además, eliges el tablero que ordena tus Tareas.')) },
  { target: 'repos', screen: 'settings', title: t('Repos'), text: keys(t('Añade la carpeta de un repo git, o crea uno nuevo en GitHub o GitLab y, si quieres, Atril lo clona y lo añade. Atril decide si cada trabajo va en su propio worktree o en tu copia: si hay archivos sin versionar, como un .env, o las dependencias pesan mucho, usa tu copia. Con el selector de cada repo lo fuerzas.')) },
  { target: 'appearance', screen: 'settings', title: t('Apariencia'), text: keys(t('Elige la paleta, Original o Grafito, y el tema: Claro, Oscuro o Automático, que sigue a tu Mac. Para volver a ver este tutorial, ve a Ayuda → Tutorial o búscalo con ⌘K.')) }
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
        className={`tip${!step ? ' welcome' : box ? '' : ' centred'}`}
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
              {t('Tus tareas de Jira, tus agentes de Claude y el flujo de Libretto, en una sola ventana. Te enseño cada pieza en tres minutos.')}
            </p>
            <div className="nav">
              <button type="button" className="btn" onClick={onClose}>
                {t('Saltar')}
              </button>
              <span className="sp" />
              <button type="button" className="btn p" data-primary onClick={() => setI(0)}>
                {t('Enséñamelo · 3 min')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
