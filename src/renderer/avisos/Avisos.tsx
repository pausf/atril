import { useCallback, useEffect, useState } from 'react'
import type { Aviso, AvisoKind } from '../../preload/api'
import { localiseActivity } from '../../preload/activity-i18n'
import { ago } from '../flow/ActivityFeed'
import { useT, type T } from '../ui'

/** V14: the filter's order; only the kinds stored show. */
const KINDS: readonly AvisoKind[] = ['ask', 'done', 'stopped', 'idle', 'radar', 'qa', 'agent', 'review', 'comment', 'ci', 'cipass', 'following', 'opened', 'merged', 'closed', 'gone', 'quota']

export interface AvisosState {
  items: Aviso[]
  unread: number
  markRead: (ids: string[] | 'all') => void
}

const AGENT: ReadonlySet<AvisoKind> = new Set(['ask', 'done', 'idle', 'agent'])
/** V20: a workspace's unread agent notices count once; every other unread notice counts itself. */
export function badgeCount(items: Aviso[]): number {
  const unread = items.filter((n) => !n.read)
  const waiting = new Set(unread.filter((n) => AGENT.has(n.kind) && n.workspaceId).map((n) => n.workspaceId))
  return waiting.size + unread.filter((n) => !(AGENT.has(n.kind) && n.workspaceId)).length
}

// One reader for the whole app: the rail counter and the screen share it.
export function useAvisos(): AvisosState {
  const [items, setItems] = useState<Aviso[]>([])
  useEffect(() => {
    let live = true
    void window.atril.avisos.list().then((l) => live && setItems(l), () => undefined)
    const off = window.atril.avisos.onChange(setItems)
    return () => {
      live = false
      off()
    }
  }, [])
  const markRead = useCallback((ids: string[] | 'all') => {
    void window.atril.avisos.markRead(ids).then(setItems, () => undefined)
  }, [])
  return { items, unread: badgeCount(items), markRead }
}

/** V6: where a notice leads; `forge` opens the MR in the browser, `close` the work's close confirmation (V15). */
export type AvisoTarget = { kind: 'mr'; url: string } | { kind: 'forge'; url: string } | { kind: 'workspace'; id: string } | { kind: 'qa'; id: string } | { kind: 'close'; id: string }

export function avisoTarget(n: Aviso): AvisoTarget | null {
  if (n.kind === 'quota') return null
  if (n.kind === 'merged' || n.kind === 'closed' || n.kind === 'gone') return n.url ? { kind: 'forge', url: n.url } : null
  if (n.url) return { kind: 'mr', url: n.url }
  if (!n.workspaceId) return null
  return n.kind === 'qa' ? { kind: 'qa', id: n.workspaceId } : { kind: 'workspace', id: n.workspaceId }
}

/** V14: a work's notice reads as a sentence about it; an MR's shows its title. */
function line(t: T, n: Aviso): string {
  const work = n.title
  switch (n.kind) {
    case 'agent':
      return t('{branch} te necesita', { branch: work })
    case 'ask':
      return t('{work} te pregunta', { work })
    case 'done':
      return t('{work} ha terminado su turno', { work })
    case 'stopped':
      return t('{work} se ha parado', { work })
    case 'idle':
      return t('{work} te espera', { work })
    case 'radar':
      return t('{work} choca con otro trabajo', { work })
    case 'qa':
      return t('QA terminada en {work}', { work })
    case 'quota':
      return t('Cuota de Claude al 80 %')
    default:
      return n.title
  }
}

/** `open` answers with what to say when the notice's MR or workspace is gone, else null. */
export function Avisos({ avisos, open }: { avisos: AvisosState; open: (to: AvisoTarget) => string | null }) {
  const t = useT()
  const [filter, setFilter] = useState<AvisoKind | null>(null)
  const [said, setSaid] = useState<string | null>(null)
  const [closable, setClosable] = useState<Record<string, string>>({})
  const label: Record<AvisoKind, string> = {
    review: t('Te piden revisión'),
    comment: t('Comentario nuevo'),
    ci: t('La CI falla'),
    following: t('MR nueva en lo que sigues'),
    opened: t('Has abierto una MR'),
    gone: t('Ya no está abierta'),
    agent: t('Agente'),
    cipass: t('La CI vuelve a pasar'),
    merged: t('MR fusionada'),
    closed: t('MR cerrada'),
    ask: t('Te pregunta algo'),
    done: t('Ha terminado su turno'),
    stopped: t('Se ha parado'),
    idle: t('Te espera'),
    radar: t('Choca con otro trabajo'),
    qa: t('QA terminada'),
    quota: t('Cuota de Claude')
  }
  // V15: main says which merged or closed MR still has a work open on its branch.
  const ends = avisos.items
    .filter((n) => n.kind === 'merged' || n.kind === 'closed')
    .map((n) => n.id)
    .join(' ')
  useEffect(() => {
    let live = true
    const ids = ends ? ends.split(' ') : []
    void Promise.all(ids.map((id) => window.atril.avisos.closable(id).then((ws) => [id, ws] as const, () => [id, null] as const))).then(
      (pairs) => live && setClosable(Object.fromEntries(pairs.filter((p): p is readonly [string, string] => p[1] !== null)))
    )
    return () => {
      live = false
    }
  }, [ends])
  const kinds = KINDS.filter((k) => avisos.items.some((n) => n.kind === k))
  const shown = [...avisos.items].sort((a, b) => b.at - a.at).filter((n) => !filter || n.kind === filter)
  const pick = (n: Aviso): void => {
    if (!n.read) avisos.markRead([n.id])
    const to = avisoTarget(n)
    setSaid(to && open(to))
  }
  return (
    <section className="tasks-screen avisos" data-tour="avisos">
      <h1>
        {t('Avisos')}
        <button className="refresh" onClick={() => avisos.markRead('all')} disabled={avisos.unread === 0}>
          {t('Marcar todo leído')}
        </button>
      </h1>
      <p className="lead">{t('Lo que ha cambiado en tus MR y en tus agentes desde la última vez.')}</p>
      <div className="seg avisos-filter" role="group" aria-label={t('Filtrar por tipo')}>
        <button type="button" aria-pressed={filter === null} onClick={() => setFilter(null)}>
          {t('Todos')}
        </button>
        {kinds.map((k) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label[k]}
          </button>
        ))}
      </div>
      {said && (
        <p className="notice" role="status">
          {said}
        </p>
      )}
      {shown.length === 0 && <div className="empty">{t('Ningún aviso.')}</div>}
      <ul className="avisos-list" aria-label={t('Avisos')}>
        {shown.map((n) => {
          const detail = (n.kind === 'ask' || n.kind === 'done') && n.detail ? localiseActivity(n.detail, t) : null
          const ws = closable[n.id]
          return (
            <li key={n.id}>
              <button className={`mr-row aviso${n.read ? '' : ' unread'}`} onClick={() => pick(n)}>
                <span className={`tag k-${n.kind}`}>{label[n.kind]}</span>
                <span className="s" title={n.title}>
                  {line(t, n)}
                  {detail && <span className="detail">{detail}</span>}
                </span>
                <span className="age">{ago(t, n.at / 1000, Date.now())}</span>
              </button>
              {ws && (
                <button type="button" className="btn aviso-close" onClick={() => setSaid(open({ kind: 'close', id: ws }))}>
                  {t('Cerrar su trabajo')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
