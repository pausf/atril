import type { NetFix } from '../preload/api'
import { networkCode } from './credentials/forge'
import { t } from './lang'

export interface NetProblem {
  error: string
  detail: string
  fix: NetFix
}

const CERT = /^(CERT_|ERR_TLS_|SELF_SIGNED|UNABLE_TO_|DEPTH_ZERO)/

/** W150: one sentence per HTTP status or network cause of Jira, GitHub or GitLab; the code only in `detail`. */
export function netProblem(service: string, f: { status: number } | { error: unknown }): NetProblem {
  if ('status' in f) {
    const s = f.status
    const detail = `HTTP ${s}`
    if (s === 401) return { error: t('{service} rejected your token.', { service }), detail, fix: 'settings' }
    if (s === 403) return { error: t("{service} won't let you see this with that token.", { service }), detail, fix: 'settings' }
    if (s === 404) return { error: t("{service} can't find that address.", { service }), detail, fix: 'settings' }
    if (s === 429) return { error: t('{service} asks you to wait: too many requests.', { service }), detail, fix: 'retry' }
    if (s >= 500 && s <= 599) return { error: t('{service} is failing right now.', { service }), detail, fix: 'retry' }
    return { error: t("{service} answered something I didn't expect.", { service }), detail, fix: 'retry' }
  }
  const detail = networkCode(f.error)
  if (detail === 'ENOTFOUND' || detail === 'EAI_AGAIN') return { error: t("I can't find {service}.", { service }), detail, fix: 'settings' }
  if (CERT.test(detail)) return { error: t("{service}'s certificate isn't valid.", { service }), detail, fix: 'settings' }
  if (detail === 'TimeoutError' || /TIMEOUT|TIMEDOUT/.test(detail)) return { error: t("{service} didn't answer in time.", { service }), detail, fix: 'retry' }
  if (detail === 'SyntaxError') return { error: t("{service} answered something I don't understand.", { service }), detail, fix: 'retry' }
  return { error: t("I can't reach {service}: are you online?", { service }), detail, fix: 'retry' }
}
