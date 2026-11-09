type T = (es: string, vars?: Record<string, string | number>) => string

/**
 * S27: the hook (resources/summarise.mjs) writes its lines in Spanish. This turns Atril's own
 * prefix into the current language and keeps the rest — paths, commands, Claude's words — as
 * `{detail}`. A line with no known prefix comes back untouched. One literal t() per prefix (S16).
 */
export function localiseActivity(text: string, t: T): string {
  if (text === 'Claude te necesita') return t('Claude te necesita')
  if (text === 'Claude ha terminado') return t('Claude ha terminado')
  const failed = /^✗ ([\s\S]*) falló$/.exec(text) // i18n-ignore: matches the hook's Spanish, never shown
  if (failed) return t('✗ {detail} falló', { detail: failed[1]! })
  const after = (prefix: string): string | null => (text.startsWith(prefix) ? text.slice(prefix.length) : null)
  let d: string | null
  if ((d = after('Lanzando un subagente: ')) !== null) return t('Lanzando un subagente: {detail}', { detail: d })
  if ((d = after('Le has escrito: ')) !== null) return t('Le has escrito: {detail}', { detail: d })
  if ((d = after('Te pregunta: ')) !== null) return t('Te pregunta: {detail}', { detail: d })
  if ((d = after('Claude dice: ')) !== null) return t('Claude dice: {detail}', { detail: d })
  if ((d = after('Escribiendo ')) !== null) return t('Escribiendo {detail}', { detail: d })
  if ((d = after('Ejecutando ')) !== null) return t('Ejecutando {detail}', { detail: d })
  if ((d = after('Editando ')) !== null) return t('Editando {detail}', { detail: d })
  if ((d = after('Leyendo ')) !== null) return t('Leyendo {detail}', { detail: d })
  if ((d = after('Buscando ')) !== null) return t('Buscando {detail}', { detail: d })
  return text
}
