import { describe, expect, it } from 'vitest'

describe('focus mode', () => {
  it('focus quiets every type only in front', async () => {
    const { readNotifySettings, route } = await import('./avisos')
    const base = await readNotifySettings()
    const at = { now: new Date(2026, 10, 11, 12).getTime() }
    for (const type of ['ask', 'stopped', 'ci'] as const)
      for (const setting of [true, false])
        for (const focusOn of [true, false])
          for (const windowFocused of [true, false]) {
            const quieted = setting && focusOn && windowFocused
            expect(route(type, { ...base, focus: setting }, { ...at, focusOn, windowFocused }), `${type} ${setting} ${focusOn} ${windowFocused}`).toBe(quieted ? 'list' : 'mac')
          }
  })
})
