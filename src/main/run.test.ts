import { describe, expect, it } from 'vitest'
import { run } from './run'

describe('runner', () => {
  it('input reaches stdin and a timeout kills', async () => {
    // `cat` only exits once stdin is closed: a hang here means the input was never closed.
    const echoed = await run('cat', [], { input: 'diff --git a/x b/x\n+ñ\n', timeoutMs: 5_000 })
    expect(echoed).toEqual({ code: 0, stdout: 'diff --git a/x b/x\n+ñ\n', stderr: '' })

    // Callers that pass neither keep the old behaviour.
    expect((await run('sh', ['-c', 'echo ok'])).stdout).toBe('ok\n')

    const started = Date.now()
    const slept = await run('sleep', ['30'], { timeoutMs: 200 })
    expect(slept.code).toBe(124)
    expect(Date.now() - started).toBeLessThan(5_000)
  })
})
