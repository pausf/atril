/** W164: runs `fn` `wait` ms after the last call of a burst, and at least every `maxWait` ms while calls keep coming. */
export function burst(fn: () => void, wait = 200, maxWait = 1000): { (): void; cancel(): void } {
  let timer: NodeJS.Timeout | undefined
  let first: number | undefined
  const fire = (): void => {
    timer = undefined
    first = undefined
    fn()
  }
  const poke = (): void => {
    const now = Date.now()
    first ??= now
    clearTimeout(timer)
    timer = setTimeout(fire, Math.max(0, Math.min(wait, first + maxWait - now)))
  }
  poke.cancel = (): void => {
    clearTimeout(timer)
    timer = undefined
    first = undefined
  }
  return poke
}
