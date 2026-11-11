import { describe, expect, it } from 'vitest'
import { netProblem } from './net-problem'

const thrown = (code: string): Error => Object.assign(new TypeError('fetch failed https://git.example.com?private_token=SECRET'), { cause: { code } })
const named = (name: string): Error => Object.assign(new Error('Unexpected token < in JSON at https://x?token=SECRET'), { name })

describe('net-problem', () => {
  it('each status and network cause has its sentence and fix (one case per row)', () => {
    const rows: Array<[Parameters<typeof netProblem>[1], string, string, 'settings' | 'retry']> = [
      [{ status: 401 }, 'GitLab ha rechazado tu token.', 'HTTP 401', 'settings'],
      [{ status: 403 }, 'GitLab no te deja ver esto con ese token.', 'HTTP 403', 'settings'],
      [{ status: 404 }, 'GitLab no encuentra esa dirección.', 'HTTP 404', 'settings'],
      [{ status: 429 }, 'GitLab pide esperar: demasiadas consultas.', 'HTTP 429', 'retry'],
      [{ status: 500 }, 'GitLab está fallando ahora mismo.', 'HTTP 500', 'retry'],
      [{ status: 503 }, 'GitLab está fallando ahora mismo.', 'HTTP 503', 'retry'],
      [{ status: 599 }, 'GitLab está fallando ahora mismo.', 'HTTP 599', 'retry'],
      [{ status: 418 }, 'GitLab ha contestado algo que no esperaba.', 'HTTP 418', 'retry'],
      [{ error: thrown('ENOTFOUND') }, 'No encuentro GitLab.', 'ENOTFOUND', 'settings'],
      [{ error: thrown('EAI_AGAIN') }, 'No encuentro GitLab.', 'EAI_AGAIN', 'settings'],
      [{ error: thrown('CERT_HAS_EXPIRED') }, 'El certificado de GitLab no es válido.', 'CERT_HAS_EXPIRED', 'settings'],
      [{ error: thrown('SELF_SIGNED_CERT_IN_CHAIN') }, 'El certificado de GitLab no es válido.', 'SELF_SIGNED_CERT_IN_CHAIN', 'settings'],
      [{ error: thrown('UNABLE_TO_VERIFY_LEAF_SIGNATURE') }, 'El certificado de GitLab no es válido.', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'settings'],
      [{ error: thrown('ERR_TLS_CERT_ALTNAME_INVALID') }, 'El certificado de GitLab no es válido.', 'ERR_TLS_CERT_ALTNAME_INVALID', 'settings'],
      [{ error: thrown('DEPTH_ZERO_SELF_SIGNED_CERT') }, 'El certificado de GitLab no es válido.', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'settings'],
      [{ error: named('TimeoutError') }, 'GitLab no ha respondido a tiempo.', 'TimeoutError', 'retry'],
      [{ error: thrown('UND_ERR_CONNECT_TIMEOUT') }, 'GitLab no ha respondido a tiempo.', 'UND_ERR_CONNECT_TIMEOUT', 'retry'],
      [{ error: new SyntaxError('Unexpected token < in JSON at https://x?token=SECRET') }, 'GitLab ha contestado algo que no entiendo.', 'SyntaxError', 'retry'],
      [{ error: thrown('UND_ERR_SOCKET') }, 'No llego a GitLab: ¿hay conexión?', 'UND_ERR_SOCKET', 'retry'],
      [{ error: thrown('ECONNREFUSED') }, 'No llego a GitLab: ¿hay conexión?', 'ECONNREFUSED', 'retry'],
      [{ error: new TypeError('fetch failed SECRET') }, 'No llego a GitLab: ¿hay conexión?', 'TypeError', 'retry'],
      // A cause code that is not a plain enumeration falls back to the exception's name.
      [{ error: thrown('bad code with SECRET') }, 'No llego a GitLab: ¿hay conexión?', 'TypeError', 'retry'],
      [{ error: 'not an error' }, 'No llego a GitLab: ¿hay conexión?', 'Error', 'retry']
    ]
    for (const [failure, error, detail, fix] of rows) {
      const p = netProblem('GitLab', failure)
      expect(p, JSON.stringify(failure)).toEqual({ error, detail, fix })
      // No status number, no exception name and nothing from the message in the sentence.
      expect(p.error).not.toMatch(/\d{3}|Error|SECRET|ENOTFOUND|EAI_AGAIN|CERT|UND_ERR/)
      expect(p.detail).not.toContain('SECRET')
    }
    expect(netProblem('Jira', { status: 401 }).error).toBe('Jira ha rechazado tu token.')
    expect(netProblem('GitHub', { error: thrown('ENOTFOUND') }).error).toBe('No encuentro GitHub.')
  })
})
