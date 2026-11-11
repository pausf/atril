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

/** A unified diff as text: lines are React text nodes, never markup. */
export const diffLines = (diff: string): ReactNode[] => diff.replace(/\n$/, '').split('\n').map(diffLine)
