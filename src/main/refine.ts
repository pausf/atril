import type { RefineResult } from '../preload/api'
import { getLang, t } from './lang'
import type { Runner } from './run'

const MAX_TEXT = 2000
const MAX_QUESTION = 200
const MAX_QUESTIONS = 5
const CLAUDE_MS = 60_000

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: { questions: { type: 'array', minItems: 1, maxItems: MAX_QUESTIONS, items: { type: 'string' } } }
}

const instruction = (lang: string): string =>
  [
    'Your stdin is a request someone wrote for a coding agent that will turn it into a spec.',
    'Ask the 3 to 5 short questions whose answers would most change that spec: what done looks like, what is out, where it lives, edge cases.',
    'Do not ask what the request already says. One question per item, no numbering.',
    `Write the questions in ${lang === 'en' ? 'English' : 'Spanish'}.`
  ].join(' ')

/** W208: trimmed, one line, no empties or repeats, each cut, at most five. */
function clean(raw: unknown[]): string[] {
  const out: string[] = []
  for (const q of raw) {
    if (typeof q !== 'string') continue
    const line = q.replace(/\s*[\r\n]+\s*/g, ' ').trim().slice(0, MAX_QUESTION)
    if (line && !out.includes(line)) out.push(line)
  }
  return out.slice(0, MAX_QUESTIONS)
}

/** W208–W209: Haiku's questions about a request, on demand, one ask at a time and outside the scores queue. */
export function createRefiner({ run }: { run: Runner }) {
  let busy = false
  const fail = (error: string, detail: string): RefineResult => ({ error, detail, fix: 'retry' })

  async function work(text: string): Promise<RefineResult> {
    const args = ['-p', '--model', 'haiku', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--json-schema', JSON.stringify(SCHEMA), instruction(getLang())]
    const r = await run('claude', args, { input: text, timeoutMs: CLAUDE_MS, secret: true })
    // W209: a fixed sentence and a code, never Claude's own output.
    if (r.code === 124) return fail(t('Claude no ha contestado a tiempo.'), 'timeout')
    if (r.code === 127) return fail(t('No encuentro Claude Code en este Mac.'), 'claude')
    if (r.code !== 0) return fail(t('Claude ha fallado.'), `exit ${r.code}`)
    const none = t('Claude no ha devuelto preguntas.')
    let answer: { is_error?: unknown; structured_output?: { questions?: unknown } }
    try {
      answer = JSON.parse(r.stdout)
    } catch {
      return fail(none, 'json')
    }
    if (!answer || typeof answer !== 'object') return fail(none, 'json')
    if (answer.is_error === true) return fail(none, 'is_error')
    const raw = answer.structured_output?.questions
    if (!Array.isArray(raw)) return fail(none, 'schema')
    const questions = clean(raw)
    return questions.length ? { questions } : fail(none, 'empty')
  }

  return {
    async ask(text: unknown): Promise<RefineResult> {
      const trimmed = typeof text === 'string' ? text.trim() : ''
      if (!trimmed || trimmed.length > MAX_TEXT || trimmed.includes('\0')) return fail(t('No hay petición que afinar.'), 'argument')
      if (busy) return fail(t('Ya está preguntando.'), 'busy')
      busy = true
      try {
        return await work(trimmed)
      } catch {
        return fail(t('Claude ha fallado.'), 'error')
      } finally {
        busy = false
      }
    }
  }
}
