/** W78: with focus on and Atril in front, the window's pill speaks instead of macOS; behind, W15 as always. */
export const showsNotification = (focusOn: boolean, windowFocused: boolean): boolean => !(focusOn && windowFocused)

/** W78 as main wires it: asked once per needs-you entry; a quieted entry is dropped, never replayed. */
export const createNotifyGate =
  (focusOn: () => boolean, inFront: () => boolean) =>
  (show: () => void): void => {
    if (showsNotification(focusOn(), inFront())) show()
  }
