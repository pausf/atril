// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '../mockApi'
import { CrashBoundary } from './Boundary'
import { installWindowCrash } from './window'

afterEach(cleanup)

function Broken(): never {
  throw new Error('render broke')
}

describe('window crashes', () => {
  it("the window reports its errors and the boundary offers a reload", async () => {
    mockApi()
    const send = vi.fn()
    const off = installWindowCrash(window, send)
    const err = new Error('listener broke')
    window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }))
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new TypeError('promise broke') }))
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'plain' }))
    expect(send.mock.calls.map((c) => c[0])).toEqual([
      { message: 'listener broke', stack: err.stack },
      { message: 'Script error.', stack: '' },
      { message: 'promise broke', stack: expect.stringContaining('promise broke') },
      { message: 'plain', stack: '' }
    ])
    off()
    window.dispatchEvent(new ErrorEvent('error', { message: 'after' }))
    expect(send).toHaveBeenCalledTimes(4)

    // The boundary sends what it catches through preload and offers a reload.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reload = vi.fn()
    render(
      <CrashBoundary onReload={reload}>
        <Broken />
      </CrashBoundary>
    )
    quiet.mockRestore()
    expect(screen.getByText('Algo ha fallado en esta pantalla.')).toBeTruthy()
    expect(window.atril.crash.report).toHaveBeenCalledWith({ message: 'render broke', stack: expect.stringContaining('render broke') })
    await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
