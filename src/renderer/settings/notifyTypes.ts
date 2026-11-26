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
      name: t('Your agents'),
      rows: [
        { k: 'ask', label: t('Asks you something'), ex: t('WEB-3535 · Asks you: Should I use the BOE table or the API one?') },
        { k: 'done', label: t('Finished its turn'), ex: t('SHOP-2630 · Claude says: Plan ready, 9 tasks.') },
        { k: 'stopped', label: t('Has stopped'), ex: t('OPS-4131 · Its terminal closed. Reopen ›'), fresh: true },
        { k: 'idle', label: t('Waiting for you for {m} min', { m }), ex: t('WEB-3535 has been waiting for you for {m} min. One reminder per question.', { m }), fresh: true },
        { k: 'radar', label: t('Clashes with another work'), ex: t('{a} and {b} touch {file}', RADAR), fresh: true },
        { k: 'qa', label: t('QA finished'), ex: t('WEB-3535 · 5 pass, 1 fails. See report ›'), fresh: true }
      ]
    },
    {
      id: 'mr',
      name: t('Your MRs'),
      rows: [
        { k: 'review', label: t('Review requested'), ex: t('Persistent filters in the seller list') },
        { k: 'comment', label: t('New comment'), ex: t('Regional holidays in the promised date') },
        { k: 'ci', label: t('CI fails on your MR'), ex: t('Regional holidays · 2 jobs fail. Fix with Claude ›') },
        { k: 'cipass', label: t('CI passes again'), ex: t('Regional holidays · all green'), fresh: true },
        { k: 'merged', label: t('Merged or closed'), ex: t('Move the stock cron to queues · merged. Close its work ›') },
        { k: 'following', label: t('New MR in what you follow'), ex: t('Remove the old carousel flag') },
        { k: 'opened', label: t('You opened an MR'), ex: t('Indexes for the offers list') }
      ]
    },
    { id: 'account', name: t('Your account'), rows: [{ k: 'quota', label: t('Claude quota at 80 %'), ex: t('5 h at {pct} % · resets at {time}', QUOTA), fresh: true }] }
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
  const reply = [t('Reply')]
  switch (k) {
    case 'ask':
      return { title: t('{work} asks you', { work: 'WEB-3535' }), body: t("Do I use the BOE table or the API's?"), actions: reply }
    case 'done':
      return { title: t('{work} finished its turn', { work: 'SHOP-2630' }), body: t('Claude says: {detail}', { detail: t('Plan ready, 9 tasks.') }), actions: reply }
    case 'stopped':
      return { title: t('{work} has stopped', { work: 'OPS-4131' }), body: t('Its terminal has closed.'), actions: [t('Reopen@@again')] }
    case 'idle':
      return { title: t('{work} is waiting for you', { work: 'WEB-3535' }), body: t('For {m} min. I only remind you once.', { m }), actions: reply }
    case 'radar':
      return { title: t('Two works touch the same file'), body: t('{a} and {b} touch {file}', RADAR), actions: [] }
    case 'qa':
      return { title: t('QA finished in {work}', { work: 'WEB-3535' }), body: `${t('{p} pass', { p: 5 })}, ${t('1 fails')}.`, actions: [] }
    case 'review':
      return { title: t('Review requested'), body: t('Persistent filters in the seller list'), actions: [] }
    case 'comment':
      return { title: t('New comment on your MR'), body: t('Regional holidays in the promised date'), actions: [] }
    case 'ci':
      return { title: t('CI fails on your MR'), body: t('Regional holidays · 2 jobs fail'), actions: [t('Fix with Claude')] }
    case 'cipass':
      return { title: t('CI passes again'), body: t('Regional holidays · all green'), actions: [] }
    case 'merged':
      return { title: t('MR merged'), body: t('Move the stock cron to queues'), actions: [t('Close its work')] }
    case 'following':
      return { title: t('New MR in what you follow'), body: t('Remove the old carousel flag'), actions: [] }
    case 'opened':
      return { title: t('You opened an MR'), body: t('Indexes for the offers list'), actions: [] }
    case 'quota':
      return { title: t('Claude quota at 80 %'), body: t('5 h at {pct} % · resets at {time}', QUOTA), actions: [] }
  }
}
