// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RadarHit } from '../preload/api'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const row = (branch: string): HTMLElement => screen.getByText(branch).closest('.ws-item') as HTMLElement
const line = (branch: string): HTMLElement | null => row(branch).querySelector('.ws-radar')

describe('the collision radar', () => {
  it('a colliding row says with whom and where', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const radar: Record<string, RadarHit[]> = {}
    const api = mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2'), workspace('aaaaaaa3', 'PF-3')], radar })
    render(createElement(App))
    await screen.findByText('PF-3')
    await waitFor(() => expect(api.radarApi.get).toHaveBeenCalledTimes(1))
    expect(line('PF-1')).toBeNull()

    // The window asks again every 10 s.
    radar['aaaaaaa1'] = [
      { id: 'aaaaaaa2', branch: 'PF-2', files: ['src/cart.ts', 'src/pay.ts'] },
      { id: 'aaaaaaa3', branch: 'PF-3', files: ['src/cart.ts'] }
    ]
    radar['aaaaaaa2'] = [{ id: 'aaaaaaa1', branch: 'PF-1', files: ['src/cart.ts', 'src/pay.ts'] }]
    radar['aaaaaaa3'] = [{ id: 'aaaaaaa1', branch: 'PF-1', files: ['src/cart.ts'] }]
    act(() => vi.advanceTimersByTime(10_000))
    await waitFor(() => expect(line('PF-1')).not.toBeNull())
    expect(api.radarApi.get).toHaveBeenCalledTimes(2)

    const one = line('PF-1')!
    expect(one.textContent).toBe('Choca con PF-2 en src/cart.ts y 2 más')
    expect(one.title).toBe('PF-2: src/cart.ts\nPF-2: src/pay.ts\nPF-3: src/cart.ts')
    // Under the repo line, inside the row.
    const meta = row('PF-1').querySelector('.ws-meta')!
    expect(meta.parentElement).toBe(one.parentElement)
    expect(meta.compareDocumentPosition(one) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(line('PF-2')!.textContent).toBe('Choca con PF-1 en src/cart.ts y 1 más')
    expect(line('PF-3')!.textContent).toBe('Choca con PF-1 en src/cart.ts')
    expect(line('PF-3')!.title).toBe('PF-1: src/cart.ts')
  })

  it('a merged work reads Merged with no agent card', async () => {
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} })
    const wait = { kind: 'permission' as const, questions: [], next: 0, permission: { tool: 'Bash', summary: 'ls' }, idle: false }
    mockApi({
      workspaces: [{ ...workspace('aaaaaaa1', 'PF-1'), merged: true }, workspace('aaaaaaa2', 'PF-2')],
      states: { aaaaaaa1: 'needs-you', aaaaaaa2: 'needs-you' },
      waits: { aaaaaaa1: wait, aaaaaaa2: wait }
    })
    render(createElement(App))
    // The unmerged one shows its card: the merged one must not, though its agent waits the same way.
    await waitFor(() => expect(row('PF-2').querySelector('.ask')).not.toBeNull())
    expect(row('PF-1').querySelector('.ask')).toBeNull()
    expect(row('PF-1').querySelector('.state')?.textContent?.trim()).toBe('Fusionada')
    expect(row('PF-1').textContent).not.toContain('te necesita')
    expect(row('PF-1').querySelector('.ws-remove')?.textContent).toBe('Quitar')
  })

  it('a row with shared criterion ids says which and with whom', async () => {
    mockApi({
      workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2'), workspace('aaaaaaa3', 'PF-3')],
      radar: {
        aaaaaaa1: [
          { id: 'aaaaaaa2', branch: 'PF-2', files: [], ids: ['W217', 'W218', 'W219'] },
          { id: 'aaaaaaa3', branch: 'PF-3', files: ['src/cart.ts'], ids: ['W217'] }
        ],
        aaaaaaa2: [{ id: 'aaaaaaa1', branch: 'PF-1', files: [], ids: ['W217'] }],
        aaaaaaa3: [{ id: 'aaaaaaa1', branch: 'PF-1', files: ['src/cart.ts'], ids: [] }]
      }
    })
    render(createElement(App))
    await screen.findByText('PF-3')
    const ids = (branch: string): HTMLElement | null => row(branch).querySelector('.ws-radar.ids')
    await waitFor(() => expect(ids('PF-1')).not.toBeNull())
    expect(ids('PF-1')!.textContent).toBe('Mismos ids de criterio que PF-2: W217 y 2 más')
    expect(ids('PF-1')!.title).toBe('PF-2: W217\nPF-2: W218\nPF-2: W219\nPF-3: W217')
    // The file line comes from the first hit with files, above the ids line.
    const files = row('PF-1').querySelector('.ws-radar:not(.ids)')!
    expect(files.textContent).toBe('Choca con PF-3 en src/cart.ts')
    expect(files.compareDocumentPosition(ids('PF-1')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ids('PF-2')!.textContent).toBe('Mismos ids de criterio que PF-1: W217')
    expect(row('PF-2').querySelector('.ws-radar:not(.ids)')).toBeNull()
    expect(ids('PF-3')).toBeNull()
  })

  it('a row without collisions shows nothing new', async () => {
    mockApi({ workspaces: [workspace('aaaaaaa1', 'PF-1'), workspace('aaaaaaa2', 'PF-2')], radar: { aaaaaaa1: [], aaaaaaa2: [] } })
    render(createElement(App))
    await screen.findByText('PF-2')
    await new Promise((r) => setTimeout(r, 50))
    expect(line('PF-1')).toBeNull()
    expect(line('PF-2')).toBeNull()
    expect(row('PF-1').textContent).not.toContain('Choca')
  })
})
