type T = (text: string, vars?: Record<string, string | number>) => string

/**
 * S27: the hook (resources/summarise.mjs) writes its lines in Spanish. This turns Atril's own
 * prefix into the current language and keeps the rest — paths, commands, Claude's words — as
 * `{detail}`. A line with no known prefix comes back untouched. One literal t() per prefix (S16).
 */
export function localiseActivity(text: string, t: T): string {
  if (text === 'Claude te necesita') return t('Claude needs you')
  if (text === 'Claude ha terminado') return t('Claude has finished')
  if (text === 'Esperando a un subagente') return t('Waiting for a subagent')
  // W203: lines written before the hook told Claude Code's English messages in Atril's words.
  const tool = /^Te pregunta: Claude needs your permission to use (.+)$/.exec(text) // i18n-ignore: matches Claude Code's English, never shown
  if (tool) return t('Asks you: may it use {detail}?', { detail: tool[1]! })
  if (text.startsWith('Te pregunta: Claude needs your permission')) return t('Asks you: may it go on?')
  if (text.startsWith('Te pregunta: Claude is waiting for your input')) return t('Claude needs you')
  const failed = /^✗ ([\s\S]*) falló$/.exec(text) // i18n-ignore: matches the hook's Spanish, never shown
  if (failed) return t('✗ {detail} failed', { detail: failed[1]! })
  const after = (prefix: string): string | null => (text.startsWith(prefix) ? text.slice(prefix.length) : null)
  let d: string | null
  if ((d = after('Lanzando un subagente: ')) !== null) return t('Launching a subagent: {detail}', { detail: d })
  if ((d = after('Le has escrito: ')) !== null) return t('You wrote: {detail}', { detail: d })
  if ((d = after('Te pregunta: ')) !== null) return t('Asks you: {detail}', { detail: d })
  if ((d = after('Decidió: ')) !== null) return t('Decided: {detail}', { detail: d }) // i18n-ignore: matches main's line, shown through t()
  if ((d = after('Claude dice: ')) !== null) return t('Claude says: {detail}', { detail: d })
  if ((d = after('Escribiendo ')) !== null) return t('Writing {detail}', { detail: d })
  if ((d = after('Ejecutando ')) !== null) return t('Running {detail}', { detail: d })
  if ((d = after('Editando ')) !== null) return t('Editing {detail}', { detail: d })
  if ((d = after('Leyendo ')) !== null) return t('Reading {detail}', { detail: d })
  if ((d = after('Buscando ')) !== null) return t('Searching {detail}', { detail: d })
  return text
}
