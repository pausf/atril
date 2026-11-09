import type { ReactNode } from 'react'

export type Part = 'spec' | 'plan' | 'checklist'

const inline = (t: string, key: string): ReactNode[] =>
  t.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((piece, i) =>
    piece.startsWith('**') && piece.endsWith('**') && piece.length > 4 ? (
      <span key={`${key}-${i}`} className="b">
        {piece}
      </span>
    ) : piece.startsWith('`') && piece.endsWith('`') && piece.length > 2 ? (
      <span key={`${key}-${i}`} className="ic">
        {piece}
      </span>
    ) : (
      piece
    )
  )

function line(l: string, key: string): ReactNode {
  let m = /^(#{1,6})\s/.exec(l)
  if (m) return <span className={`h${Math.min(m[1]!.length, 3)}`}>{l}</span>
  m = /^(\s*[-*]\s+)\[( |x|X)\](.*)$/.exec(l)
  if (m)
    return (
      <>
        <span className="li">{m[1]}</span>
        <span className={m[2] === ' ' ? 'bo' : 'bx'}>[{m[2]}]</span>
        {inline(m[3]!, key)}
      </>
    )
  m = /^(\s*(?:[-*]|\d+\.)\s+)(.*)$/.exec(l)
  if (m)
    return (
      <>
        <span className="li">{m[1]}</span>
        {inline(m[2]!, key)}
      </>
    )
  if (/^\s*Proof:/.test(l)) return <span className="pf">{l}</span>
  return inline(l, key)
}

/** F17: colouring for the editor overlay; every piece is a React text node, never markup. */
export function highlight(text: string): ReactNode[] {
  let fence = false
  return text.split('\n').map((l, i) => {
    const key = String(i)
    let body: ReactNode
    if (/^```/.test(l)) {
      fence = !fence
      body = <span className="cd">{l}</span>
    } else body = fence ? <span className="cd">{l}</span> : line(l, key)
    return (
      <span key={key}>
        {body}
        {'\n'}
      </span>
    )
  })
}

/** Level-2/3 headings outside code fences, with their character offset. */
export function headings(text: string): { level: number; title: string; offset: number }[] {
  const out: { level: number; title: string; offset: number }[] = []
  let fence = false
  let offset = 0
  for (const l of text.split('\n')) {
    if (/^```/.test(l)) fence = !fence
    else if (!fence) {
      const m = /^(##|###)\s+(\S.*)$/.exec(l)
      if (m) out.push({ level: m[1]!.length, title: m[2]!.trim(), offset })
    }
    offset += l.length + 1
  }
  return out
}

/** F13: where the cursor lands — Spec at the first section, Plan at Approach, Checklist at Checklist. */
export function partOffset(text: string, part: Part): number {
  const h = headings(text).filter((x) => x.level === 2)
  const found = part === 'spec' ? h[0] : h.find((x) => (part === 'plan' ? /^Approach\b/ : /^Checklist\b/).test(x.title))
  return found?.offset ?? 0
}
