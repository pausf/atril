// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Workspace } from './Workspace'
import { mockApi, workspace } from '../mockApi'

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    open(): void {}
    loadAddon(): void {}
    write(): void {}
    dispose(): void {}
  }
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit(): void {} } }))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

afterEach(cleanup)

describe('Workspace header', () => {
  it('a work says which ignored files it carried and which failed', async () => {
    mockApi()
    const ws = {
      ...workspace('c1', 'feat/carry', false),
      carried: {
        copied: ['.env', 'web/config.local'],
        failed: [
          { file: 'a.local', why: 'missing' as const },
          { file: 'b', why: 'not-a-file' as const },
          { file: 'c', why: 'outside' as const },
          { file: 'd', why: 'exists' as const },
          { file: 'e', why: 'not-ignored' as const },
          { file: 'f', why: 'failed' as const }
        ]
      }
    }
    const { container, rerender } = render(createElement(Workspace, { ws, flow: null }))
    expect(await screen.findByText('Copiados: .env, web/config.local')).toBeTruthy()
    expect(
      screen.getByText(
        'No copiados: a.local (no encontrado), b (no es un archivo normal), c (fuera del repo), d (ya estaba), e (git no lo ignora), f (no se ha podido copiar)'
      )
    ).toBeTruthy()

    // Only failures: no «Copiados» line. Only copies: no «No copiados» line.
    rerender(createElement(Workspace, { ws: { ...ws, carried: { copied: [], failed: [{ file: '.env', why: 'missing' as const }] } }, flow: null }))
    expect(screen.queryByText(/^Copiados:/)).toBeNull()
    expect(screen.getByText('No copiados: .env (no encontrado)')).toBeTruthy()
    rerender(createElement(Workspace, { ws: { ...ws, carried: { copied: ['.env'], failed: [] } }, flow: null }))
    expect(screen.getByText('Copiados: .env')).toBeTruthy()
    expect(screen.queryByText(/^No copiados:/)).toBeNull()

    // A work without `carried` shows neither line.
    rerender(createElement(Workspace, { ws: workspace('c2', 'feat/plain', false), flow: null }))
    expect(container.querySelector('.carried')).toBeNull()
    expect(screen.queryByText(/Copiados:/)).toBeNull()
  })
})
