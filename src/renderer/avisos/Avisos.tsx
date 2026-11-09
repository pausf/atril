import { useCallback, useEffect, useState } from 'react'
import type { Aviso, AvisoKind } from '../../preload/api'
import { ago } from '../flow/ActivityFeed'
import { useT } from '../ui'

const KINDS: readonly AvisoKind[] = ['review', 'comment', 'ci', 'following', 'opened', 'gone', 'agent']

export interface AvisosState {
  items: Aviso[]
  unread: number
  markRead: (ids: string[] | 'all') => void
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
  return { items, unread: items.filter((n) => !n.read).length, markRead }
}

export type AvisoTarget = { kind: 'mr'; url: string } | { kind: 'workspace'; id: string }

/** `open` answers with what to say when the notice's MR or workspace is gone, else null. */
export function Avisos({ avisos, open }: { avisos: AvisosState; open: (to: AvisoTarget) => string | null }) {
  const t = useT()
  const [filter, setFilter] = useState<AvisoKind | null>(null)
  const [said, setSaid] = useState<string | null>(null)
  const label: Record<AvisoKind, string> = {
    review: t('Te piden revisión'),
    comment: t('Comentario nuevo'),
    ci: t('La CI falla'),
    following: t('MR nueva en lo que sigues'),
    opened: t('Has abierto una MR'),
    gone: t('Ya no está abierta'),
    agent: t('Agente')
  }
  const shown = [...avisos.items].sort((a, b) => b.at - a.at).filter((n) => !filter || n.kind === filter)
  const pick = (n: Aviso): void => {
    if (!n.read) avisos.markRead([n.id])
    const to: AvisoTarget | null = n.url ? { kind: 'mr', url: n.url } : n.workspaceId ? { kind: 'workspace', id: n.workspaceId } : null
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
        {KINDS.map((k) => (
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
        {shown.map((n) => (
          <li key={n.id}>
            <button className={`mr-row aviso${n.read ? '' : ' unread'}`} onClick={() => pick(n)}>
              <span className={`tag k-${n.kind}`}>{label[n.kind]}</span>
              <span className="s" title={n.title}>
                {n.kind === 'agent' ? t('{branch} te necesita', { branch: n.title }) : n.title}
              </span>
              <span className="age">{ago(t, n.at / 1000, Date.now())}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
