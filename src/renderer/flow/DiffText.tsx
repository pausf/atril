import type { ReactNode } from 'react'

function diffLine(l: string, i: number): ReactNode {
  const cls = /^(diff --git|index |new file|deleted file|--- |\+\+\+ )/.test(l)
    ? 'dmeta'
    : l.startsWith('@@')
      ? 'dhunk'
      : l.startsWith('+')
        ? 'dadd'
        : l.startsWith('-')
          ? 'ddel'
          : undefined
  return (
    <span key={i}>
      {cls ? <span className={cls}>{l}</span> : l}
      {'\n'}
    </span>
  )
}

const HEADER = /^(diff --git|index |new file mode|deleted file mode|similarity |rename (from|to) |--- |\+\+\+ )/

/** A unified diff as text: lines are React text nodes, never markup. F45: git's header is left out (the file is named above);
 * only before the first hunk, since `--- x` after it is a removed line. */
export function diffLines(diff: string): ReactNode[] {
  const lines = diff.replace(/\n$/, '').split('\n')
  const first = lines.findIndex((l) => l.startsWith('@@'))
  const body = first === -1 ? lines.filter((l) => !HEADER.test(l)) : lines.slice(first)
  return body.map(diffLine)
}
