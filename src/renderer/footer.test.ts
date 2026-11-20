// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UsageResult } from '../preload/api'
import { Footer } from './components/Footer'
import { mockApi } from './mockApi'

function mount(first: UsageResult) {
  const usage = { get: vi.fn().mockResolvedValue(first), onChange: vi.fn(() => () => undefined), fix: vi.fn().mockResolvedValue({ ok: true }) }
  mockApi({}, undefined, { usage })
  render(createElement(Footer))
  return usage
}

afterEach(cleanup)

describe('footer', () => {
  it('usage error shows its fix and folds the detail', async () => {
    const user = userEvent.setup()
    const usage = mount({ error: 'Claude no me deja leer tu cuota ahora: demasiadas consultas.', detail: 'HTTP 429', fix: 'retry' })

    const again = await screen.findByRole('button', { name: 'Volver a comprobar' })
    const foot = document.querySelector('footer')!
    expect(foot.textContent).toContain('demasiadas consultas')
    const folded = foot.querySelector('details')!
    expect(folded.open).toBe(false)
    expect(folded.querySelector('summary')!.textContent).toBe('Ver detalle')
    expect(folded.querySelector('code')!.textContent).toBe('HTTP 429')
    // The status code lives only inside the folded detail.
    expect(foot.textContent!.replace(folded.textContent!, '')).not.toMatch(/429/)

    await user.click(again)
    expect(usage.get).toHaveBeenCalledTimes(2)
    expect(usage.fix).not.toHaveBeenCalled()

    cleanup()
    const login = mount({ error: 'Claude Code no tiene la sesión abierta en este Mac.', detail: 'llavero: código 44', fix: 'claude' })
    await user.click(await screen.findByRole('button', { name: 'Abrir Claude Code' }))
    expect(login.fix).toHaveBeenCalledTimes(1)

    // Terminal could not open: its reason replaces the sentence.
    login.fix.mockResolvedValue({ error: 'osascript no tiene permiso' })
    await user.click(screen.getByRole('button', { name: 'Abrir Claude Code' }))
    expect(await screen.findByText(/osascript no tiene permiso/)).toBeTruthy()
  })
})
