import type { NotifyType } from '../../preload/api'
import type { T } from '../ui'

export interface TypeRow {
  k: NotifyType
  label: string
  ex: string
  fresh?: true
}
export interface TypeGroup {
  id: 'agents' | 'mr' | 'account'
  name: string
  rows: TypeRow[]
}

/** S37: the sketch's three groups (bocetos/fase1-nucleo.html «Notificaciones»), in its order. */
export function typeGroups(t: T, m: number): TypeGroup[] {
  return [
    {
      id: 'agents',
      name: t('Tus agentes'),
      rows: [
        { k: 'ask', label: t('Te pregunta algo'), ex: t('WEB-3535 · Te pregunta: ¿Uso la tabla del BOE o la de la API?') },
        { k: 'done', label: t('Ha terminado su turno'), ex: t('SHOP-2630 · Claude dice: Plan listo, 9 tareas.') },
        { k: 'stopped', label: t('Se ha parado'), ex: t('OPS-4131 · Su terminal se ha cerrado. Reabrir ›'), fresh: true },
        { k: 'idle', label: t('Lleva {m} min esperándote', { m }), ex: t('WEB-3535 te espera desde hace {m} min. Solo un recordatorio por pregunta.', { m }), fresh: true },
        { k: 'radar', label: t('Choca con otro trabajo'), ex: t('{a} y {b} tocan {file}', RADAR), fresh: true },
        { k: 'qa', label: t('QA terminada'), ex: t('WEB-3535 · 5 pasan, 1 falla. Ver informe ›'), fresh: true }
      ]
    },
    {
      id: 'mr',
      name: t('Tus MR'),
      rows: [
        { k: 'review', label: t('Te piden revisión'), ex: t('Filtros persistentes en el listado del vendedor') },
        { k: 'comment', label: t('Comentario nuevo'), ex: t('Festivos por provincia en la fecha prometida') },
        { k: 'ci', label: t('La CI falla en tu MR'), ex: t('Festivos por provincia · 2 trabajos fallan. Arreglar con Claude ›') },
        { k: 'cipass', label: t('La CI vuelve a pasar'), ex: t('Festivos por provincia · todo en verde'), fresh: true },
        { k: 'merged', label: t('Fusionada o cerrada'), ex: t('Migrar el cron de stock a colas · fusionada. Cerrar su trabajo ›') },
        { k: 'following', label: t('MR nueva en lo que sigues'), ex: t('Quitar el flag antiguo del carrusel') },
        { k: 'opened', label: t('Has abierto una MR'), ex: t('Índices para el listado de ofertas') }
      ]
    },
    { id: 'account', name: t('Tu cuenta'), rows: [{ k: 'quota', label: t('Cuota de Claude al 80 %'), ex: t('5 h al {pct} % · se reinicia a las {time}', QUOTA), fresh: true }] }
  ]
}

const RADAR = { a: 'WEB-3535', b: 'PF-4870', file: 'src/Delivery/PromiseDate.php' }
const QUOTA = { pct: 82, time: '14:00' }

export interface Example {
  title: string
  body: string
  /** Only the buttons the real Mac notification carries (W177, W186–W188); the reply field reads «Responder». */
  actions: string[]
}

/** S42: how each type reaches the Mac, as the sketch's `t`/`b`. */
export function example(t: T, k: NotifyType, m: number): Example {
  const reply = [t('Responder')]
  switch (k) {
    case 'ask':
      return { title: t('{work} te pregunta', { work: 'WEB-3535' }), body: t('¿Uso la tabla del BOE o la de la API?'), actions: reply }
    case 'done':
      return { title: t('{work} ha terminado su turno', { work: 'SHOP-2630' }), body: t('Claude dice: {detail}', { detail: t('Plan listo, 9 tareas.') }), actions: reply }
    case 'stopped':
      return { title: t('{work} se ha parado', { work: 'OPS-4131' }), body: t('Su terminal se ha cerrado.'), actions: [t('Reabrir')] }
    case 'idle':
      return { title: t('{work} te espera', { work: 'WEB-3535' }), body: t('Desde hace {m} min. Solo te lo recuerdo una vez.', { m }), actions: reply }
    case 'radar':
      return { title: t('Dos trabajos tocan lo mismo'), body: t('{a} y {b} tocan {file}', RADAR), actions: [] }
    case 'qa':
      return { title: t('QA terminada en {work}', { work: 'WEB-3535' }), body: `${t('{p} pasan', { p: 5 })}, ${t('1 falla')}.`, actions: [] }
    case 'review':
      return { title: t('Te piden revisión'), body: t('Filtros persistentes en el listado del vendedor'), actions: [] }
    case 'comment':
      return { title: t('Comentario nuevo en tu MR'), body: t('Festivos por provincia en la fecha prometida'), actions: [] }
    case 'ci':
      return { title: t('La CI falla en tu MR'), body: t('Festivos por provincia · 2 trabajos fallan'), actions: [t('Arreglar con Claude')] }
    case 'cipass':
      return { title: t('La CI vuelve a pasar'), body: t('Festivos por provincia · todo en verde'), actions: [] }
    case 'merged':
      return { title: t('MR fusionada'), body: t('Migrar el cron de stock a colas'), actions: [t('Cerrar su trabajo')] }
    case 'following':
      return { title: t('MR nueva en lo que sigues'), body: t('Quitar el flag antiguo del carrusel'), actions: [] }
    case 'opened':
      return { title: t('Has abierto una MR'), body: t('Índices para el listado de ofertas'), actions: [] }
    case 'quota':
      return { title: t('Cuota de Claude al 80 %'), body: t('5 h al {pct} % · se reinicia a las {time}', QUOTA), actions: [] }
  }
}
