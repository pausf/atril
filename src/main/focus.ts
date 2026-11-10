/** W78: with focus on and Atril in front, the window's pill speaks instead of macOS; behind, W15 as always. */
export const showsNotification = (focusOn: boolean, windowFocused: boolean): boolean => !(focusOn && windowFocused)
