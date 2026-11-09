import { EN } from './i18n-en'

export type Lang = 'es' | 'en'
export type LangChoice = Lang | 'system'
export const LANG_CHOICES: readonly LangChoice[] = ['system', 'es', 'en']

/** Sistema follows the Mac's first preferred language: Spanish only when it starts with `es`. */
export const resolveLang = (choice: LangChoice | undefined, systemLocale: string | undefined): Lang =>
  choice === 'es' || choice === 'en' ? choice : (systemLocale ?? '').toLowerCase().startsWith('es') ? 'es' : 'en'

/**
 * The Spanish text is the key: with no English entry it shows as written, never empty.
 * `{name}` is replaced from vars; `{detail}` carries foreign text (git, Jira) and is never translated.
 */
export function translate(lang: Lang, es: string, vars: Record<string, string | number> = {}): string {
  const text = lang === 'en' ? (EN[es] ?? es) : es
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
