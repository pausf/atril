import { describe, expect, it } from 'vitest'
import { showsNotification } from './focus'

describe('focus mode', () => {
  it('focus swaps the notification for the pill only in front', () => {
    // Focus on and Atril in front: the window's pill speaks, macOS stays quiet.
    expect(showsNotification(true, true)).toBe(false)
    // Atril behind: the notification comes as always (W15), focus or not.
    expect(showsNotification(true, false)).toBe(true)
    expect(showsNotification(false, false)).toBe(true)
    expect(showsNotification(false, true)).toBe(true)
  })
})
