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
    if (s === 401) return { error: t('{service} ha rechazado tu token.', { service }), detail, fix: 'settings' }
    if (s === 403) return { error: t('{service} no te deja ver esto con ese token.', { service }), detail, fix: 'settings' }
    if (s === 404) return { error: t('{service} no encuentra esa dirección.', { service }), detail, fix: 'settings' }
    if (s === 429) return { error: t('{service} pide esperar: demasiadas consultas.', { service }), detail, fix: 'retry' }
    if (s >= 500 && s <= 599) return { error: t('{service} está fallando ahora mismo.', { service }), detail, fix: 'retry' }
    return { error: t('{service} ha contestado algo que no esperaba.', { service }), detail, fix: 'retry' }
  }
  const detail = networkCode(f.error)
  if (detail === 'ENOTFOUND' || detail === 'EAI_AGAIN') return { error: t('No encuentro {service}.', { service }), detail, fix: 'settings' }
  if (CERT.test(detail)) return { error: t('El certificado de {service} no es válido.', { service }), detail, fix: 'settings' }
  if (detail === 'TimeoutError' || /TIMEOUT|TIMEDOUT/.test(detail)) return { error: t('{service} no ha respondido a tiempo.', { service }), detail, fix: 'retry' }
  if (detail === 'SyntaxError') return { error: t('{service} ha contestado algo que no entiendo.', { service }), detail, fix: 'retry' }
  return { error: t('No llego a {service}: ¿hay conexión?', { service }), detail, fix: 'retry' }
}
