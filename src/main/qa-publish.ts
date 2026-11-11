import type { MrLists, MrReply, QaMr, QaPublishResult, QaReport } from '../preload/api'
import { remoteNaming } from './forge/openmr'
import { t } from './lang'
import { qaReport } from './qa-report'
import { readRepos } from './repos'
import type { Runner } from './run'
import { readRecords } from './workspaces'

type T = (es: string, vars?: Record<string, string | number>) => string

const FRESH_MS = 60_000
const PLATFORM = { chrome: 'Chrome', safari: 'Safari', android: 'Android', ios: 'iOS' } as const

/** W170: the comment, in the language `t` speaks; blank lines keep a quote from swallowing the next line. */
export function qaSummary(report: QaReport, t: T): string {
  const x = report.target
  const target = x ? (x.dir ? `${PLATFORM[x.platform]} · ${x.dir}` : PLATFORM[x.platform]) : null
  const lines = [target ? t('Pruebas en vivo con Atril · {target}', { target }) : t('Pruebas en vivo con Atril')]
  for (const c of report.criteria) {
    const e = report.entries.find((x) => x.id === c.id)
    const status = e?.status ?? 'untested'
    const word = status === 'pass' ? t('Pasa') : status === 'fail' ? t('Falla') : t('Sin probar')
    const why = status === 'fail' ? (e!.note || e!.steps.at(-1)?.text || '').replace(/\s+/g, ' ').trim() : ''
    lines.push(`${word} · ${c.text}${why ? `\n> ${why}` : ''}`)
  }
  lines.push(t('Las capturas están en Atril.'))
  return lines.join('\n\n')
}

interface Deps {
  run: Runner
  /** main's latest MR listing and when it was made; null before the first. */
  last: () => { at: number; lists: MrLists } | null
  /** Lists again the way `atril:mr:list` does, which replaces `last`. */
  list: () => Promise<MrLists>
  /** One general comment on a listed MR (threads' own session: the token stays there). */
  post: (url: string, body: string) => Promise<MrReply>
  now?: () => number
}

/** W170, W174: the QA result of a work, posted on its own MR when the person presses. */
export function createQaPublish({ run, last, list, post, now = Date.now }: Deps) {
  async function mrFor(id: string): Promise<QaMr> {
    const ws = (await readRecords()).find((r) => r.id === id && r.mode !== 'review')
    if (!ws) return null
    const repo = (await readRepos()).find((r) => r.id === ws.repoId)
    if (!repo) return null
    const kept = last()
    const lists = kept && now() - kept.at < FRESH_MS ? kept.lists : await list()
    const candidates = lists.mine.filter((m) => m.branch === ws.branch).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    for (const m of candidates) if (await remoteNaming(run, repo.path, m.project, new URL(m.url).hostname)) return { url: m.url }
    return null
  }

  return {
    mrFor,
    async publish(id: string): Promise<QaPublishResult> {
      const mr = await mrFor(id)
      const report = mr && (await qaReport(id, run))
      if (!mr || !report) return { error: t('Abre la MR para poder publicar aquí la QA.') }
      const r = await post(mr.url, qaSummary(report, t))
      return 'error' in r ? r : { url: mr.url }
    }
  }
}
