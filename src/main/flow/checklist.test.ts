import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanTmp, tmp } from '../test-helpers'
import { readChecklist } from './checklist'

afterEach(cleanTmp)

describe('readChecklist', () => {
  it('fenced and out of section boxes do not count', async () => {
    const dir = tmp()
    writeFileSync(
      join(dir, 'proposal.md'),
      [
        '# P',
        '- [ ] stray before the section',
        '## Checklist',
        '- [x] one',
        '```',
        '- [ ] inside a fence',
        '```',
        '* [ ] two',
        '### Sub heading still counts? no: ## only closes',
        '## Notes',
        '- [ ] after the section'
      ].join('\n')
    )
    expect(await readChecklist(dir)).toEqual({ file: 'proposal.md', total: 2, closed: 1, firstOpen: 'two' })
  })

  it('falls back to tasks.md then plan.md', async () => {
    const dir = tmp()
    writeFileSync(join(dir, 'proposal.md'), '## Checklist\nnothing\n')
    writeFileSync(join(dir, 'plan.md'), '- [ ] old\n')
    expect(await readChecklist(dir)).toMatchObject({ file: 'plan.md', total: 1 })
    writeFileSync(join(dir, 'tasks.md'), '- [X] a\n- [ ] b\n')
    expect(await readChecklist(dir)).toEqual({ file: 'tasks.md', total: 2, closed: 1, firstOpen: 'b' })
    mkdirSync(join(dir, 'x'))
    expect(await readChecklist(join(dir, 'x'))).toBeNull()
  })
})
