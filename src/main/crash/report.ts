import { createHash } from 'node:crypto'

export type CrashWhere = 'main' | 'ventana' | 'proceso'
export interface RawCrash {
  where: CrashWhere
  message: string
  stack?: string
  at: number
}
export interface Versions {
  atril: string
  electron: string
  macos: string
}
export interface Report {
  /** The title line without `# `. */
  title: string
  markdown: string
  signature: string
}

const MAX = 4000
/** The report is public, so it is written in English. */
const WHERE: Record<CrashWhere, string> = { main: 'main', ventana: 'window', proceso: 'process' }
// A path runs across spaces until a quote, `)`, `,`, a `:<digits>` line suffix or the end of the line.
const PATH_CH = String.raw`(?:[^'"(),\n:]|:(?!\d))*`
const KEEP = /app\.asar\/|out\/(?:main|preload|renderer)\//
const CODE_EXT = /\.(?:[cm]?js|tsx?|jsx|json|node|html|css|md|map)$/

/** The app's own files keep the part from `app.asar/` or `out/<part>/` on: that is what points at the bug. */
const path = (p: string): string => {
  const m = KEEP.exec(p)
  return m ? `<path>/${p.slice(m.index)}` : '<path>'
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type Rule = [RegExp, string | ((m: string) => string)]

// Order matters: tokens before addresses (a token may ride in a URL), addresses before paths.
// Every `+` run that a later part must follow starts only at a run boundary (lookbehind), so each rule stays linear.
const RULES: Rule[] = [
  [/gh[pousr]_[A-Za-z0-9]+|github_pat_\w+|glpat-[\w-]+|xox[a-z]-[\w-]+|sk-ant-[\w-]+|AKIA[0-9A-Z]{12,}/g, '<token>'],
  [/(?<![\w-])eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<token>'],
  [/\bAuthorization:[ \t]*\S+[ \t]+[^\s'"]+/gi, '<token>'],
  [/\b(?:Bearer|Basic)\s+[^\s'"]+/g, '<token>'],
  [/(?:token|password|passwd|secret|api_key|apikey)=[^\s&'"]+/gi, '<token>'],
  // Long base64 or hex runs; a digit inside keeps long identifiers out.
  [/[A-Za-z0-9+=_-]{32,}/g, (m) => (/\d/.test(m) ? '<token>' : m)],
  [/(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b(?!:)/g, '<email>'],
  [/(?<![\w+.-])[a-z][a-z0-9+.-]*:\/\/[^\s'"`)\]]+/g, (m) => (m.startsWith('file:') && KEEP.test(m) ? path(m) : '<url>')],
  [/\bgit@[\w.-]+:[^\s'"`)]*/g, '<url>'],
  [/(?<![\w.-])(?:github|gitlab)\.com\/[^\s'"`)\]]*/g, '<url>'],
  // IPv6 needs `::` or most of its groups, so times and line:column stay.
  [/(?<![\w:.])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![\w:.])/g, (m) => (m.includes('::') || m.split(':').length >= 6 ? '<url>' : m)],
  [/(?<![\w.])\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?(?![\w.])/g, '<url>'],
  [/(?<![\w/.@-])(?:localhost|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+):\d{1,5}(?![\d:])/g, (m) => (CODE_EXT.test(m.slice(0, m.lastIndexOf(':'))) ? m : '<url>')],
  // A bare host has two or more dots and ends in letters; versions, code files and stack frame names (`at a.b.c`) stay.
  [/(?<![\w/.@-])(?<!\bat (?:async |new )?)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+){2,}(?![\w-])/g, (m) => (/\.[A-Za-z]{2,}$/.test(m) && !CODE_EXT.test(m) ? '<url>' : m)],
  [new RegExp(String.raw`(?:(?<![\w.~])\/(?:Users|home|private|var|tmp|Volumes|etc|opt|usr\/local)\/|\b[A-Za-z]:[\\/]|(?<![\w/])~\/)${PATH_CH}`, 'g'), path],
  [/(?<![\w/.<>~:@-])(?:\.{1,2}\/[\w.-]+(?:\/[\w.-]+)+|[\w.-]+(?:\/[\w.-]+){2,})/g, path],
  [/\b[A-Z][A-Z0-9]+-\d+\b/g, '<key>']
]
const QUOTED = /"[^"\n]*"|'[^'\n]*'|«[^»\n]*»/g // i18n-ignore

/** R1: best effort, never complete; the consent dialog says so. */
export function scrub(text: string, home: string): string {
  let out = home.length > 1 ? text.replace(new RegExp(escape(home) + PATH_CH, 'g'), path) : text
  for (const [re, to] of RULES) out = out.replace(re, to as (m: string) => string)
  return out.replace(QUOTED, '<text>')
}

const fenced = (text: string): string => {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((r) => r.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}\n${text}\n${fence}`
}

/** R2: digits in the message do not split a failure; the version does. */
export function signature(version: string, message: string, stack: string): string {
  const firstAt = stack.split('\n').map((l) => l.trim()).find((l) => l.startsWith('at')) ?? ''
  return createHash('sha256').update(`${version}\n${message.replace(/\d+/g, 'N')}\n${firstAt}`).digest('hex').slice(0, 12)
}

export function buildReport(raw: RawCrash, ctx: { home: string; versions: Versions }): Report {
  // Cut first: scrubbing never sees more than 4 000 characters.
  const message = scrub(raw.message.slice(0, MAX), ctx.home)
  const stack = scrub((raw.stack ?? '').slice(0, MAX), ctx.home)
  const title = `Crash: ${(message.split('\n')[0] ?? '').replace(/[@`<>[\]]/g, '').slice(0, 72)}`
  const v = ctx.versions
  const markdown = [
    `# ${title}`,
    '',
    `- Where: ${WHERE[raw.where]}`,
    `- Atril: ${v.atril}`,
    `- Electron: ${v.electron}`,
    `- macOS: ${v.macos}`,
    `- Time: ${new Date(raw.at).toISOString()}`,
    '',
    '## Message',
    '',
    fenced(message),
    '',
    '## Stack',
    '',
    fenced(stack),
    ''
  ].join('\n')
  return { title, markdown, signature: signature(v.atril, message, stack) }
}
