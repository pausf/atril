// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QaShot } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const shot = (name: string, at: number): QaShot => ({ name, at, src: `data:image/png;base64,${btoa(name)}` })

beforeEach(() => {
  mockSystemTheme(false)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('qa section', () => {
  it('the qa section shows the button and the screenshots', async () => {
    const api = mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false), workspace('aaaaaaa2', 'PF-2', false)],
      flow: { stage: 'construir', change: 'add-x', others: [] },
      qa: { aaaaaaa1: { kind: 'web', live: false, shots: [shot('b.png', 2), shot('a.png', 1)] }, aaaaaaa2: null }
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(createElement(App))

    // Unclassified: no section at all.
    await user.click(await screen.findByRole('button', { name: /^PF-2/ }))
    await waitFor(() => expect(api.qaApi.status).toHaveBeenCalledWith('aaaaaaa2'))
    expect(screen.queryByRole('region', { name: /^QA/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Probar en vivo' })).toBeNull()

    // Classified: «Probar en vivo» and the screenshots, newest first, as the data URLs main sent.
    await user.click(screen.getByRole('button', { name: /^PF-1/ }))
    const section = await screen.findByRole('region', { name: /^QA/ })
    const go = await within(section).findByRole('button', { name: 'Probar en vivo' })
    const imgs = (): HTMLImageElement[] => within(section).queryAllByRole('img') as HTMLImageElement[]
    expect(imgs().map((i) => i.alt)).toEqual(['b.png', 'a.png'])
    expect(imgs()[0]!.src).toBe(shot('b.png', 2).src)

    // The press launches, and the button turns into «Detener QA» while the pane lives.
    await user.click(go)
    expect(api.qaApi.launch).toHaveBeenCalledWith('aaaaaaa1')
    const stop = await within(section).findByRole('button', { name: 'Detener QA' })

    // Asked again every 3 s while the section shows: a new screenshot arrives on top.
    api.setQa('aaaaaaa1', { kind: 'web', live: true, shots: [shot('c.png', 3), shot('b.png', 2), shot('a.png', 1)] })
    const before = vi.mocked(api.qaApi.status).mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(vi.mocked(api.qaApi.status).mock.calls.length).toBeGreaterThan(before)
    await waitFor(() => expect(imgs().map((i) => i.alt)).toEqual(['c.png', 'b.png', 'a.png']))

    // A screenshot opens large on press.
    await user.click(within(section).getByRole('button', { name: /c\.png/ }))
    const big = await screen.findByRole('dialog', { name: /c\.png/ })
    expect((within(big).getByRole('img') as HTMLImageElement).src).toBe(shot('c.png', 3).src)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // «Detener QA» stops it and «Probar en vivo» comes back.
    await user.click(stop)
    expect(api.qaApi.stop).toHaveBeenCalledWith('aaaaaaa1')
    await within(section).findByRole('button', { name: 'Probar en vivo' })

    // A refused launch says why (main names the missing tools).
    cleanup()
    mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1', false)],
      qa: { aaaaaaa1: { kind: 'android', live: false, shots: [] } },
      qaLaunch: { error: 'Para probar en vivo falta: adb, emulator' }
    })
    render(createElement(App))
    await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
    await user.click(await screen.findByRole('button', { name: 'Probar en vivo' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/adb, emulator/)
  })
})
