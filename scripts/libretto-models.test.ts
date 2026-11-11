import { describe, expect, it } from 'vitest'
import { pinModels } from './libretto-models.mjs'

const agent = (extra = ''): string => `---\nname: x\ndescription: reads things\ntools: Read, Grep\n${extra}---\n\nBody with model: words in it.\n`

describe('libretto models', () => {
  it('reviewers get sonnet unless libretto chose', () => {
    for (const name of ['converge-reader', 'review-lens-reliability', 'review-lens-security', 'spec-reviewer', 'work-reviewer']) {
      expect(pinModels(agent(), name)).toBe(agent('model: sonnet\n'))
    }
    // Libretto's own choice wins.
    expect(pinModels(agent('model: haiku\n'), 'work-reviewer')).toBe(agent('model: haiku\n'))
  })

  it('other agents and a second run change nothing', () => {
    expect(pinModels(agent(), 'spec-writer')).toBe(agent())
    expect(pinModels(agent(), 'review-lens-design')).toBe(agent())
    const bare = 'No frontmatter here.\nmodel: nope\n'
    expect(pinModels(bare, 'work-reviewer')).toBe(bare)
    const once = pinModels(agent(), 'spec-reviewer')
    expect(pinModels(once, 'spec-reviewer')).toBe(once)
  })
})
