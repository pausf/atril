import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { diffLines } from './DiffText'

const text = (diff: string): string =>
  renderToStaticMarkup(createElement(Fragment, null, ...diffLines(diff))).replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<')

describe('box diff text', () => {
  it('a box diff starts at its first hunk', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      'similarity index 90%',
      'rename from src/old.ts',
      'rename to src/a.ts',
      'index 20b6a78..e96aa5a 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,3 +1,3 @@',
      ' keep',
      '--- a removed line that looks like a header',
      '+++ an added line that looks like a header',
      '@@ -9 +9 @@',
      '-old',
      '+new',
      ''
    ].join('\n')
    expect(text(diff)).toBe(['@@ -1,3 +1,3 @@', ' keep', '--- a removed line that looks like a header', '+++ an added line that looks like a header', '@@ -9 +9 @@', '-old', '+new', ''].join('\n'))
    expect(text('diff --git a/n b/n\nnew file mode 100644\nindex 0000000..1\n--- /dev/null\n+++ b/n\n@@ -0,0 +1 @@\n+x\n')).toBe('@@ -0,0 +1 @@\n+x\n')
  })
})
