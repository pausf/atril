export type Value = string | boolean | string[]
export type Parsed = { fields: Record<string, Value>; body: string } | { broken: true }

const BOOL: Record<string, boolean> = { true: true, yes: true, on: true, '1': true, false: false, no: false, off: false, '0': false }
export const asBool = (v: Value | undefined): boolean | undefined => (typeof v === 'string' ? BOOL[v.toLowerCase()] : typeof v === 'boolean' ? v : undefined)

export const unquote = (v: string): string => {
  const t = v.trim()
  return t.length >= 2 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t
}

/**
 * ponytail: not YAML. Top-level `key: value`, quoted strings, `- x` lists, and `>`/`|` blocks.
 * Indented lines under any other key (`metadata:` maps) are skipped. Swap for a YAML library the day
 * a field we show needs nesting.
 */
export function parseFrontmatter(text: string): Parsed {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return { fields: {}, body: text }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (end < 0) return { broken: true }
  const fields: Record<string, Value> = {}
  let key: string | null = null
  let block: 'folded' | 'literal' | 'list' | null = null
  const children: string[] = []
  const close = (): void => {
    if (key && block === 'list') fields[key] = children.map((c) => unquote(c.replace(/^-\s*/, '')))
    else if (key && block === 'folded') fields[key] = children.join(' ')
    else if (key && block === 'literal') fields[key] = children.join('\n')
    children.length = 0
    block = null
  }
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (/^\s/.test(line) || (block === 'list' && line.startsWith('-'))) {
      if (!key || !block) return { broken: true }
      children.push(line.trim())
      continue
    }
    close()
    const m = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line)
    if (!m) return { broken: true }
    key = m[1]!
    const rest = (m[2] ?? '').trim()
    if (rest === '>' || rest === '>-') block = 'folded'
    else if (rest === '|' || rest === '|-') block = 'literal'
    else if (rest === '') block = 'list'
    else fields[key] = unquote(rest)
  }
  close()
  return { fields, body: lines.slice(end + 1).join('\n') }
}
