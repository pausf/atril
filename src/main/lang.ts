import { translate, type Lang } from '../preload/i18n'

let current: Lang = 'es'

/** The language main speaks in; set at startup and whenever the person changes it (W48). */
export const setLang = (lang: Lang): void => {
  current = lang
}
export const getLang = (): Lang => current
export const t = (es: string, vars?: Record<string, string | number>): string => translate(current, es, vars)
