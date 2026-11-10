import { describe, expect, it } from 'vitest'
import { createNotifyGate, showsNotification } from './focus'

describe('focus mode', () => {
  it('focus swaps the notification for the pill only in front', () => {
    // Focus on and Atril in front: the window's pill speaks, macOS stays quiet.
    expect(showsNotification(true, true)).toBe(false)
    // Atril behind: the notification comes as always (W15), focus or not.
    expect(showsNotification(true, false)).toBe(true)
    expect(showsNotification(false, false)).toBe(true)
    expect(showsNotification(false, true)).toBe(true)

    // Wired as main does: the window's real focus is read at the moment of the entry.
    let focusOn = true
    let front = true
    const shown: string[] = []
    const gate = createNotifyGate(() => focusOn, () => front)
    gate(() => shown.push('quiet'))
    // A quieted entry is dropped: leaving focus or the window later does not replay it.
    focusOn = false
    front = false
    expect(shown).toEqual([])
    gate(() => shown.push('behind'))
    focusOn = true
    gate(() => shown.push('focus behind'))
    expect(shown).toEqual(['behind', 'focus behind'])
  })
})
