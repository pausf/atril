import type { Effort, Model } from '../../preload/api'
import type { T } from '../ui'

export interface Suggestion {
  model: Model
  effort: Effort
  why: string
}

// W138: a word's start, case-insensitive; a hint, not a classifier («fixture» counts as a fix).
const FIX = /(?<!\p{L})(arregl|fallo|error|bug|fix|typo|corrige|errata)/iu
const BIG = /(?<!\p{L})(refactor|migra|arquitectura|reescrib|rediseñ)/iu // i18n-ignore: a pattern, not a text

/** Fixed rules over the task's text and its Jira type; never calls Claude. */
export function suggest(t: T, text: string, issueType?: string): Suggestion | null {
  if (issueType?.toLowerCase() === 'bug' || FIX.test(text))
    return { model: 'sonnet', effort: 'medium', why: t('Un arreglo acotado: Sonnet lo hace bien a mitad de precio que Opus.') }
  if (BIG.test(text)) return { model: 'opus', effort: 'high', why: t('Un cambio grande: mejor Opus con más esfuerzo.') }
  return null
}
