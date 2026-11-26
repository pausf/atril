import { ES } from './i18n-es'

export type Lang = 'es' | 'en'
export type LangChoice = Lang | 'system'
export const LANG_CHOICES: readonly LangChoice[] = ['system', 'es', 'en']

/** Sistema follows the Mac's first preferred language: Spanish only when it starts with `es`. */
export const resolveLang = (choice: LangChoice | undefined, systemLocale: string | undefined): Lang =>
  choice === 'es' || choice === 'en' ? choice : (systemLocale ?? '').toLowerCase().startsWith('es') ? 'es' : 'en'

/**
 * The English text is the key: with no Spanish entry it shows as written, never empty.
 * `{name}` is replaced from vars; `{detail}` carries foreign text (git, Jira) and is never translated.
 */
// ponytail: `@@word` tells apart two Spanish texts that share one English text (Back / Atrás); plain keys would merge them.
const CONTEXT = /@@\w+$/

export function translate(lang: Lang, text: string, vars: Record<string, string | number> = {}): string {
  const shown = (lang === 'es' ? ES[text] : undefined) ?? text.replace(CONTEXT, '')
  return shown.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
