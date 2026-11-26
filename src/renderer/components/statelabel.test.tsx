// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StateLabel } from './StateLabel'

afterEach(cleanup)

describe('StateLabel', () => {
  it('a done agent reads terminado', () => {
    const { container } = render(createElement(StateLabel, { state: 'done' }))
    expect(container.textContent?.trim()).toBe('terminado')
    expect(container.querySelector('.state.done svg')).toBeTruthy()
    // Its own icon, not one of the other states'.
    const icon = (state: 'done' | 'working' | 'needs-you' | 'paused' | 'stopped'): string => {
      const r = render(createElement(StateLabel, { state }))
      const html = r.container.querySelector('svg')?.innerHTML ?? ''
      r.unmount()
      return html
    }
    const done = icon('done')
    for (const other of ['working', 'needs-you', 'paused', 'stopped'] as const) expect(icon(other)).not.toBe(done)
  })
})
