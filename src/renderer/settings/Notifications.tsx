import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { NotifyPatch, NotifyPermission, NotifyRoute, NotifySettings, NotifyType, Weekday } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useFolded, useT } from '../ui'
import { example, typeGroups, type TypeGroup, type TypeRow } from './notifyTypes'

// The sketch's 16px icons; static strings, never input.
const IC: Record<string, string> = {
  ask: '<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/><path d="M6.6 5.6a1.4 1.4 0 1 1 1.9 1.3c-.4.2-.5.4-.5.8M8 8.9v.1"/>',
  done: '<circle cx="8" cy="8" r="5.5"/><path d="M5.6 8.1l1.7 1.7 3.1-3.4"/>',
  stopped: '<rect x="3" y="3" width="10" height="10" rx="2"/><path d="M6.5 6.5v3M9.5 6.5v3"/>',
  idle: '<circle cx="8" cy="8.5" r="5"/><path d="M8 6v2.7l1.8 1.1M6.5 2h3"/>',
  radar: '<circle cx="6" cy="8" r="3.6"/><circle cx="10" cy="8" r="3.6"/>',
  qa: '<rect x="2.5" y="3" width="11" height="8.5" rx="1.5"/><path d="M7 5.6v3.4l2.8-1.7zM5.5 13.5h5"/>',
  review: '<path d="M1.8 8s2.3-4.2 6.2-4.2S14.2 8 14.2 8s-2.3 4.2-6.2 4.2S1.8 8 1.8 8z"/><circle cx="8" cy="8" r="1.8"/>',
  comment: '<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/><path d="M5.5 6.3h5M5.5 8.2h3"/>',
  ci: '<circle cx="8" cy="8" r="5.5"/><path d="M6.2 6.2l3.6 3.6M9.8 6.2l-3.6 3.6"/>',
  cipass: '<circle cx="8" cy="8" r="5.5"/><path d="M5.6 8.1l1.7 1.7 3.1-3.4"/>',
  merged: '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="8" r="1.5"/><path d="M4.5 5v6M4.5 5c0 3 3 3 5.5 3"/>',
  following: '<path d="M8 2.5l1.7 3.4 3.8.5-2.8 2.6.7 3.7L8 10.9l-3.4 1.8.7-3.7-2.8-2.6 3.8-.5z"/>',
  opened: '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><path d="M4.5 5v6M11.5 6v6M9 8.5h5"/>',
  quota: '<path d="M2.8 11.5a5.5 5.5 0 1 1 10.4 0"/><path d="M8 9.5l2.6-3"/>',
  agents: '<rect x="2" y="3" width="12" height="10" rx="2"/><path d="M4.8 6.4l1.9 1.6-1.9 1.6M8.3 10h3"/>',
  mr: '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="12.5" r="1.5"/><path d="M4.5 5v6M11.5 11V6.5c0-1.1-.9-2-2-2H7.5M9 3l-1.5 1.5L9 6"/>',
  account: '<circle cx="8" cy="6" r="2.6"/><path d="M3 13.3c.8-2.3 2.7-3.4 5-3.4s4.2 1.1 5 3.4"/>',
  mac: '<rect x="2" y="3" width="12" height="10" rx="2"/><rect x="7.5" y="4.5" width="5" height="2.4" rx=".8" fill="currentColor" stroke="none"/>',
  list: '<path d="M5.5 4.5h8M5.5 8h8M5.5 11.5h8"/><path d="M2.5 4.5h.1M2.5 8h.1M2.5 11.5h.1"/>',
  mute: '<path d="M4.2 11.5V7.2a3.8 3.8 0 0 1 6.3-2.9M11.8 7v4.5h1.5M2.8 11.5h4M6.7 13.4a1.5 1.5 0 0 0 2.6 0M2.5 2.5l11 11"/>',
  moon: '<path d="M12.5 9.7A5 5 0 0 1 6.3 3.5a5 5 0 1 0 6.2 6.2z"/>'
}
export function NtIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden dangerouslySetInnerHTML={{ __html: IC[name] ?? '' }} />
  )
}

/** Atril's icon, drawn with the theme's tokens. */
export function AppMark({ className }: { className?: string }) {
  return (
    <svg className={`app-mark${className ? ` ${className}` : ''}`} viewBox="0 0 128 128" aria-hidden>
      <rect width="128" height="128" rx="29" />
      <path d="M34 34h60" strokeWidth="10" />
      <path d="M64 34L40 104M64 34l24 70M50 78h28" strokeWidth="9" />
    </svg>
  )
}

/** Fills a placeholder with MARK; splice puts a node (bold, a stepper…) there, whatever the language's word order. */
export const MARK = '\u0001'
export function splice(text: string, ...nodes: ReactNode[]): ReactNode {
  const parts = text.split(MARK)
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {nodes[i]}
        </Fragment>
      ))}
    </>
  )
}

const ROUTES: ReadonlyArray<NotifyRoute> = ['mac', 'list', 'mute']

export function mergePatch(s: NotifySettings, p: NotifyPatch): NotifySettings {
  return { ...s, ...p, types: { ...s.types, ...p.types }, quiet: { ...s.quiet, ...p.quiet } }
}

export interface NotifyState {
  s: NotifySettings
  save: (patch: NotifyPatch) => void
  cur: NotifyType
  setCur: (k: NotifyType) => void
}

/** Each change saves at once; only the answer to the latest request replaces what is shown. */
export interface SaveFailure {
  patch: NotifyPatch
  detail: string
}

export function useNotifySettings(): { s: NotifySettings | null; save: (patch: NotifyPatch) => void; failed: SaveFailure | null } {
  const [s, setS] = useState<NotifySettings | null>(null)
  const [failed, setFailed] = useState<SaveFailure | null>(null)
  const seq = useRef(0)
  useEffect(() => {
    let live = true
    void window.atril.notify.get().then((r) => live && setS(r), () => undefined)
    return () => {
      live = false
    }
  }, [])
  const save = (patch: NotifyPatch): void => {
    const n = ++seq.current
    setS((v) => v && mergePatch(v, patch))
    setFailed(null)
    void window.atril.notify.set(patch).then(
      (r) => {
        if ('error' in r) setFailed({ patch, detail: r.detail || r.error })
        else if (n === seq.current) setS(r)
      },
      (err: unknown) => setFailed({ patch, detail: String(err) })
    )
  }
  return { s, save, failed }
}

function Seg({ row, value, onPick }: { row: TypeRow; value: NotifyRoute; onPick: (v: NotifyRoute) => void }) {
  const t = useT()
  const label: Record<NotifyRoute, string> = { mac: t('Mac'), list: t('Solo Avisos'), mute: t('Nada') }
  // S38: ← → move and select, and stay in the group (no global shortcut hears them).
  const onKey = (e: KeyboardEvent<HTMLSpanElement>): void => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    e.stopPropagation()
    const i = (ROUTES.indexOf(value) + (e.key === 'ArrowRight' ? 1 : ROUTES.length - 1)) % ROUTES.length
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')[i]?.focus()
    onPick(ROUTES[i]!)
  }
  return (
    <span className="nt-seg" role="radiogroup" aria-label={row.label} onKeyDown={onKey}>
      {ROUTES.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} tabIndex={value === v ? 0 : -1} onClick={() => onPick(v)}>
          <NtIcon name={v} />
          <span>{label[v]}</span>
        </button>
      ))}
    </span>
  )
}

function Row({ row, st }: { row: TypeRow; st: NotifyState }) {
  const t = useT()
  const v = st.s.types[row.k]
  const m = st.s.idleMinutes
  const title =
    row.k === 'idle'
      ? splice(
          t('Lleva {m} min esperándote', { m: MARK }),
          <span className="nt-step" role="group" aria-label={t('Minutos esperándote')}>
            <button type="button" aria-label={t('Cinco minutos menos')} disabled={m <= 5} onClick={() => st.save({ idleMinutes: Math.max(5, m - 5) })}>
              −
            </button>
            <output aria-live="polite">{m}</output>
            <button type="button" aria-label={t('Cinco minutos más')} disabled={m >= 120} onClick={() => st.save({ idleMinutes: Math.min(120, m + 5) })}>
              +
            </button>
          </span>
        )
      : row.label
  return (
    <div className={`nt-row${v === 'mute' ? ' off' : ''}${st.cur === row.k ? ' on' : ''}`} onMouseEnter={() => st.setCur(row.k)} onFocus={() => st.setCur(row.k)}>
      <span className="ic">
        <NtIcon name={row.k} />
      </span>
      <span className="tx">
        <span className="l">
          <b>{title}</b>
          {row.fresh && <span className="nt-new">{t('nuevo')}</span>}
        </span>
        <span className="ex" title={row.ex}>
          {row.ex}
        </span>
      </span>
      <Seg row={row} value={v} onPick={(r) => st.save({ types: { [row.k]: r } })} />
    </div>
  )
}

function Group({ g, st }: { g: TypeGroup; st: NotifyState }) {
  const t = useT()
  const [folded, toggle] = useFolded(`ntf-${g.id}`, false)
  const n = g.rows.length
  const mac = g.rows.filter((r) => st.s.types[r.k] === 'mac').length
  const list = g.rows.filter((r) => st.s.types[r.k] === 'list').length
  const sum = [n === 1 ? t('1 tipo · {mac} al Mac', { mac }) : t('{n} tipos · {mac} al Mac', { n, mac }), ...(list ? [t('{list} solo en Avisos', { list })] : [])].join(' · ')
  const all = (v: NotifyRoute): void => st.save({ types: Object.fromEntries(g.rows.map((r) => [r.k, v])) })
  return (
    <section className="nt-g" aria-labelledby={`nt-g-${g.id}`}>
      <div className="nt-gh">
        <button type="button" className="nt-gt" aria-expanded={!folded} onClick={toggle}>
          <i className="chev" />
          <span className="gi">
            <NtIcon name={g.id} />
          </span>
          <b id={`nt-g-${g.id}`}>{g.name}</b>
          <span className="sum">{sum}</span>
        </button>
        <span className="nt-all" role="group" aria-label={t('Todo {group}', { group: g.name })}>
          <button type="button" onClick={() => all('mac')}>
            {t('Todo al Mac')}
          </button>
          <button type="button" onClick={() => all('list')}>
            {t('Todo a Avisos')}
          </button>
          <button type="button" onClick={() => all('mute')}>
            {t('Silenciar')}
          </button>
        </span>
      </div>
      {!folded && (
        <div className="nt-gb">
          {g.rows.map((r) => (
            <Row key={r.k} row={r} st={st} />
          ))}
        </div>
      )}
    </section>
  )
}

function Preview({ st, label, shot }: { st: NotifyState; label: string; shot: number }) {
  const t = useT()
  const v = st.s.types[st.cur]
  const ex = example(t, st.cur, st.s.idleMinutes)
  const b = <b>{label}</b>
  return (
    <div className="nt-prev" role="region" aria-labelledby="nt-prev-h">
      <p className="lb" id="nt-prev-h">
        {t('Así te llega')}
      </p>
      <div key={shot} className={`nt-ban${shot > 0 ? ' slide' : ''}${v === 'mac' ? '' : ' dim'}`}>
        <AppMark className="ap" />
        <div className="tx">
          <div className="hd">
            <b>Atril</b>
            <span>{t('ahora')}</span>
          </div>
          <b className="t">{ex.title}</b>
          <span className="b">{ex.body}</span>
        </div>
        {ex.actions.length > 0 && (
          <div className="ac">
            {ex.actions.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        )}
      </div>
      <p className="nt-cap">
        {v === 'mac'
          ? splice(t('Así te sale en el Mac: {label}', { label: MARK }), b)
          : v === 'list'
            ? splice(t('{label}: solo en Avisos, sin globo ni sonido', { label: MARK }), b)
            : splice(t('{label}: silenciado, no te avisa', { label: MARK }), b)}
      </p>
    </div>
  )
}

const DAYS: ReadonlyArray<Weekday> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return <button type="button" className="nt-sw" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} />
}

const hours = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) + (m ?? 0) / 60
}

/** S43: the quiet span over 24 h, wrapping past midnight. */
function QuietBar({ from, to }: { from: string; to: string }) {
  const t = useT()
  const f = hours(from)
  const e = hours(to)
  const spans = f === e ? [] : f < e ? [[f, e]] : [[f, 24], [0, e]]
  return (
    <span className="nt-tl" role="img" aria-label={t('Silencio de {from} a {to}', { from, to })}>
      {spans.map(([a, b]) => (
        <i key={a} style={{ left: `${(a! / 24) * 100}%`, width: `${((b! - a!) / 24) * 100}%` }} />
      ))}
      <span className="tk" aria-hidden>
        {[0, 6, 12, 18, 24].map((x) => (
          <em key={x} style={{ left: `${(x / 24) * 100}%` }}>
            {x}
          </em>
        ))}
      </span>
    </span>
  )
}

/** S43, S44: when the Mac may interrupt, and a real test notice. */
function When({ st, onTest, said }: { st: NotifyState; onTest: () => void; said: string | null }) {
  const t = useT()
  const q = st.s.quiet
  const off = q.on ? {} : { tabIndex: -1 }
  const letter: Record<Weekday, [string, string]> = {
    mon: [t('L'), t('lunes')],
    tue: [t('M'), t('martes')],
    wed: [t('X'), t('miércoles')],
    thu: [t('J'), t('jueves')],
    fri: [t('V'), t('viernes')],
    sat: [t('S'), t('sábado')],
    sun: [t('D'), t('domingo')]
  }
  const toggleDay = (d: Weekday): void => st.save({ quiet: { days: DAYS.filter((x) => (x === d ? !q.days.includes(d) : q.days.includes(x))) } })
  return (
    <section className="scard nt-card" aria-labelledby="when-h">
      <h3 id="when-h">{t('Cuándo')}</h3>
      <p className="hint2">{t('Cuándo te interrumpe el Mac. Avisos lo guarda todo, siempre.')}</p>
      <div className="nt-w">
        <span className="ic">
          <NtIcon name="moon" />
        </span>
        <span className="tx">
          <b>{t('Respetar el modo foco')}</b>
          <span className="ex">{t('Con el modo foco y Atril delante, el Mac se calla: te avisa la píldora de arriba.')}</span>
        </span>
        <Switch on={st.s.focus} label={t('Respetar el modo foco')} onToggle={() => st.save({ focus: !st.s.focus })} />
      </div>
      <div className="nt-w">
        <span className="ic">
          <NtIcon name="list" />
        </span>
        <span className="tx">
          <b>{t('Agrupar')}</b>
          <span className="ex">{t('Un solo aviso del Mac por cada 2 min.')}</span>
          <span className={`nt-stack${st.s.group ? '' : ' off'}`} aria-hidden>
            <span className="three">
              <i>{t('{work} te pregunta', { work: 'WEB-3535' })}</i>
              <i>{t('{work} te pregunta', { work: 'SHOP-2630' })}</i>
              <i>{t('{work} se ha parado', { work: 'OPS-4131' })}</i>
            </span>
            <span className="arr">→</span>
            <span className="one">
              <AppMark />
              <span>
                <b>{t('{n} agentes te necesitan', { n: 3 })}</b>
                <span>{t('{list} y {last}', { list: 'WEB-3535, SHOP-2630', last: 'OPS-4131' })}</span>
              </span>
            </span>
          </span>
        </span>
        <Switch on={st.s.group} label={t('Agrupar')} onToggle={() => st.save({ group: !st.s.group })} />
      </div>
      <div className="nt-w">
        <span className="ic">
          <NtIcon name="mute" />
        </span>
        <span className="tx">
          <b>{t('Horas de silencio')}</b>
          <span className="ex">{t('Nada suena; todo queda en Avisos para cuando vuelvas.')}</span>
          <span className="nt-quiet" aria-disabled={q.on ? undefined : true}>
            <span className="rg">
              {splice(
                t('de {from} a {to}', { from: MARK, to: MARK }),
                <input type="time" value={q.from} aria-label={t('Desde')} {...off} onChange={(e) => e.target.value && st.save({ quiet: { from: e.target.value } })} />,
                <input type="time" value={q.to} aria-label={t('Hasta')} {...off} onChange={(e) => e.target.value && st.save({ quiet: { to: e.target.value } })} />
              )}
            </span>
            <QuietBar from={q.from} to={q.to} />
            <span className="nt-days" role="group" aria-label={t('Todo el día')}>
              <span aria-hidden>{t('Todo el día:')}</span>
              {DAYS.map((d) => (
                <button key={d} type="button" aria-pressed={q.days.includes(d)} aria-label={letter[d][1]} {...off} onClick={() => toggleDay(d)}>
                  {letter[d][0]}
                </button>
              ))}
            </span>
          </span>
        </span>
        <Switch on={q.on} label={t('Horas de silencio')} onToggle={() => st.save({ quiet: { on: !q.on } })} />
      </div>
      <div className="nt-test">
        <button type="button" className="btn" onClick={onTest}>
          {t('Probar un aviso')}
        </button>
        <span className="lockn" role="status">
          {said}
        </span>
      </div>
    </section>
  )
}

/** S37–S46: Ajustes → Notificaciones, and «Cuándo» beside it. */
export function Notifications() {
  const t = useT()
  const { s, save, failed } = useNotifySettings()
  const [cur, setCur] = useState<NotifyType>('ask')
  const [perm, setPerm] = useState<NotifyPermission>('unknown')
  const [said, setSaid] = useState<string | null>(null)
  const [shot, setShot] = useState(0)
  const check = (): void => void window.atril.notify.permission().then(setPerm, () => setPerm('unknown'))
  useEffect(check, [])
  if (!s) return null
  const st: NotifyState = { s, save, cur, setCur }
  const groups = typeGroups(t, s.idleMinutes)
  const label = groups.flatMap((g) => g.rows).find((r) => r.k === cur)!.label
  const test = (): void => {
    setShot((n) => n + 1)
    void window.atril.notify.test(cur).then(
      (r) => {
        if (r === 'blocked') setPerm('blocked')
        setSaid(r === 'blocked' ? t('macOS no lo dejará salir: arréglalo arriba.') : t('Enviado: mira la esquina de tu pantalla.'))
      },
      () => setSaid(t('macOS no lo dejará salir: arréglalo arriba.'))
    )
  }
  return (
    <>
      <section className="scard nt-card" aria-labelledby="ntf-h">
        {perm === 'blocked' && (
          <Problem
            what={t('macOS no deja a Atril mostrar avisos.')}
            cant={t('Todo sigue llegando a Avisos, pero el Mac no te interrumpe aunque elijas «Mac».')}
            fix={t('Abrir Ajustes del Sistema')}
            onFix={() => void window.atril.notify.openSystem()}
            alt={t('Volver a comprobar')}
            onAlt={check}
            detail=""
          />
        )}
        {failed && (
          <Problem
            what={t('No he podido guardar tus avisos: el cambio se perderá al cerrar Atril.')}
            fix={t('Volver a intentar')}
            onFix={() => save(failed.patch)}
            detail={failed.detail}
          />
        )}
        <div className="nt-hd">
          <div className="nt-intro">
            <h3 id="ntf-h">{t('Notificaciones')}</h3>
            <p className="hint2">{t('Todo llega a Avisos. Aquí eliges qué más te interrumpe con un aviso del Mac.')}</p>
          </div>
          <Preview st={st} label={label} shot={shot} />
        </div>
        {groups.map((g) => (
          <Group key={g.id} g={g} st={st} />
        ))}
      </section>
      <When st={st} onTest={test} said={said} />
    </>
  )
}
